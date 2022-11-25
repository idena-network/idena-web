import {query as q} from 'faunadb'
import Twitter from 'twitter'
import {
  getEpoch,
  getIdentity,
  getLastEpoch,
  getTxs,
  searchInvite,
} from '../../shared/api/indexer'
import {faunaSiteClient} from '../../shared/utils/faunadb'

async function hasPreviousInvites(name) {
  try {
    const {data} = await faunaSiteClient.query(
      q.Let(
        {
          prev: q.Match(q.Index('invites_by_name_sort_by_epoch_desc'), name),
        },
        q.If(
          q.IsEmpty(q.Var('prev')),
          {data: []},
          q.Map(
            q.Paginate(q.Var('prev'), {size: 1}),
            q.Lambda(
              ['epoch', 'ref'],
              q.Select(['data', 'invite'], q.Get(q.Var('ref')))
            )
          )
        )
      )
    )

    // we have previous invites, check the last one
    if (data.length) {
      try {
        const prevInvite = data[0]

        const searchResult = await searchInvite(prevInvite)
        const address = searchResult[0].value

        const txs = await getTxs(address)

        const activationTx = txs.filter(x => x.type === 'ActivationTx')

        if (!activationTx.length) return

        const toAddr = activationTx[0].to

        const identity = await getIdentity(toAddr)

        if (identity.state !== 'Undefined') {
          return true
        }
      } catch {
        return false
      }
    }
  } catch (e) {
    throw new Error('Something went wrong')
  }
  return false
}

async function getInvitationCode(name, screenName, epoch, refId) {
  if (await hasPreviousInvites(name)) {
    throw new Error('You can not get multiple invitation codes')
  }

  try {
    const {
      data: {invite},
    } = await faunaSiteClient.query(
      q.If(
        q.Exists(q.Match(q.Index('search_by_name_epoch'), name, epoch)),
        q.Abort('Invitation code was already given to the twitter account'),
        q.Let(
          {
            freeInvite: q.Match(q.Index('search_free_invite'), epoch, true),
          },
          q.If(
            q.IsEmpty(q.Var('freeInvite')),
            q.Abort(
              'There are no invitation codes available, please try again later'
            ),
            q.Update(q.Select('ref', q.Get(q.Var('freeInvite'))), {
              data: {name, screenName, refId},
            })
          )
        )
      )
    )
    return invite
  } catch (e) {
    const errors = e.errors()
    if (errors.length) {
      throw new Error(errors[0].description)
    }
    throw new Error('Something went wrong')
  }
}

export default async (req, res) => {
  try {
    const {name, refId} = req.query

    if (!name) throw new Error('Twitter nickname is empty')

    const client = new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    })

    const minTwitterSubs =
      process.env.NEXT_PUBLIC_TWITTER_MINIMUM_SUBS_COUNT || 100
    const minTwitterAge = process.env.TWITTER_AGE_MILLIS || 5184000000

    const currentEpoch = await getLastEpoch()
    const prevEpoch = await getEpoch(currentEpoch.epoch - 1)

    let userResponse
    let followResponse
    let tweetResponse
    let codeResponse

    try {
      userResponse = await client.get('users/lookup', {
        screen_name: name,
      })
    } catch (e) {
      throw new Error()
    }

    if (userResponse?.errors?.[0]?.code === 17) {
      throw new Error('Can not find the Twitter account')
    }
    if (!userResponse.length) {
      throw new Error()
    }

    const user = userResponse[0]

    try {
      followResponse = await client.get('friendships/show', {
        source_screen_name: name,
        target_screen_name: 'IdenaNetwork',
      })
    } catch (e) {
      throw new Error()
    }

    if (!followResponse.relationship.source.following) {
      throw new Error('Please follow @IdenaNetwork on twitter')
    }

    if (
      user.followers_count < minTwitterSubs ||
      Date.now() - Date.parse(user.created_at) < minTwitterAge
    ) {
      throw new Error(
        'Your twitter account is too new or has too few subscribers'
      )
    }

    if (user.status?.text) {
      const {text} = user.status
      if (
        text.includes('@IdenaNetwork') &&
        text.includes('#IdenaInvite') &&
        Date.parse(prevEpoch.validationTime) <
          Date.parse(user.status.created_at)
      ) {
        codeResponse = await getInvitationCode(
          user.id_str,
          user.screen_name,
          currentEpoch.epoch,
          refId || null
        )
        return res.status(200).json({invitation: codeResponse})
      }
    }

    try {
      tweetResponse = await client.get('search/tweets', {
        q: `from:${name} @IdenaNetwork #IdenaInvite -is:retweet`,
      })
    } catch (e) {
      throw new Error('Can not verify your tweet')
    }

    if (
      !tweetResponse?.statuses?.length ||
      Date.parse(prevEpoch.validationTime) >
        Date.parse(tweetResponse?.statuses[0]?.created_at)
    ) {
      throw new Error('Can not verify your tweet')
    }

    codeResponse = await getInvitationCode(
      user.id_str,
      user.screen_name,
      currentEpoch.epoch,
      refId || null
    )
    return res.status(200).json({invitation: codeResponse})
  } catch (e) {
    return res.status(400).send(e.message || 'Something went wrong')
  }
}
