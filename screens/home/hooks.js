import dayjs from 'dayjs'
import React, {useEffect, useReducer, useState} from 'react'
import {useMutation, useQuery} from 'react-query'
import {
  activateKey,
  fetchIdentity,
  getAvailableProviders,
  getRawTx,
  sendRawTx,
} from '../../shared/api'
import useApikeyPurchasing from '../../shared/hooks/use-apikey-purchasing'
import {useBalance} from '../../shared/hooks/use-balance'
import {usePersistence} from '../../shared/hooks/use-persistent-state'
import useSyncing from '../../shared/hooks/use-syncing'
import {useFailToast} from '../../shared/hooks/use-toast'
import useTx from '../../shared/hooks/use-tx'
import {Transaction} from '../../shared/models/transaction'
import {useAuthState} from '../../shared/providers/auth-context'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useIdentity} from '../../shared/providers/identity-context'
import {IdentityStatus, TxType} from '../../shared/types'
import {
  sendActivateInvitation,
  sendSuccessValidation,
} from '../../shared/utils/analytics'
import {
  privateKeyToAddress,
  privateKeyToPublicKey,
} from '../../shared/utils/crypto'
import {loadPersistentState} from '../../shared/utils/persist'
import {validateInvitationCode} from '../../shared/utils/utils'
import {apiUrl} from '../oracles/utils'
import {useRpcFetcher} from '../ads/hooks'

export function useInviteActivation() {
  const failToast = useFailToast()

  const [{state, isWaitingForUpdate}, {waitStateUpdate}] = useIdentity()
  const {coinbase, privateKey} = useAuthState()
  const [submitting, setSubmitting] = useState(false)

  const [{mining}, setHash] = useTx()

  const {isPurchasing, needToPurchase, savePurchase} = useApikeyPurchasing()

  const sendActivateInviteTx = async code => {
    setSubmitting(true)

    try {
      const trimmedCode = code?.trim()

      if (trimmedCode) {
        if (!validateInvitationCode(trimmedCode)) throw new Error()
      }

      const from = trimmedCode
        ? privateKeyToAddress(trimmedCode)
        : privateKeyToAddress(privateKey)

      const rawTx = await getRawTx(
        1,
        from,
        coinbase,
        0,
        0,
        privateKeyToPublicKey(privateKey)
      )

      const tx = new Transaction().fromHex(rawTx)
      tx.sign(trimmedCode || privateKey)

      const hex = tx.toHex()
      if (needToPurchase) {
        const providers = await getAvailableProviders()
        const result = await activateKey(coinbase, `0x${hex}`, providers)
        savePurchase(result.id, result.provider)
      } else {
        const result = await sendRawTx(`0x${hex}`)
        setHash(result)
      }

      // need to wait identity state update manually, because nothing changes in memory
      waitStateUpdate()

      sendActivateInvitation(coinbase)
    } catch (e) {
      failToast(
        `Failed to activate invite: ${
          e.response ? e.response.data : 'invitation is invalid'
        }`
      )
    } finally {
      setSubmitting(false)
    }
  }

  const waiting = submitting || isPurchasing || mining || isWaitingForUpdate

  return [
    {isSuccess: state === IdentityStatus.Candidate, isMining: waiting},
    {activateInvite: sendActivateInviteTx},
  ]
}

export function useValidationResults() {
  const epochData = useEpoch()

  const epoch = epochData?.epoch || 0

  const [state, dispatch] = usePersistence(
    useReducer((prevState, action) => {
      switch (action.type) {
        case 'seen':
          return {
            ...prevState,
            [epoch]: {
              ...prevState[epoch],
              seen: action.value,
            },
          }
        case 'analytics':
          return {
            ...prevState,
            [epoch]: {
              ...prevState[epoch],
              analyticsSent: action.value,
            },
          }
        default:
          return prevState
      }
    }, loadPersistentState('validationResults') || {}),
    'validationResults'
  )

  const [{address, state: identityStatus}] = useIdentity()

  const isValidationSucceeded = [
    IdentityStatus.Newbie,
    IdentityStatus.Verified,
    IdentityStatus.Human,
  ].includes(identityStatus)

  const seen = state[epoch] && state[epoch].seen

  const analyticsSent = state[epoch] && state[epoch].analyticsSent

  useEffect(() => {
    if (isValidationSucceeded && !analyticsSent) {
      sendSuccessValidation(address)
      dispatch({type: 'analytics', value: true})
    }
  }, [isValidationSucceeded, address, dispatch, analyticsSent])

  const setValidationResultSeen = () => {
    dispatch({type: 'seen', value: true})
  }

  return [seen, setValidationResultSeen]
}

export function useReplenishStake({onSuccess, onError}) {
  const {coinbase, privateKey} = useAuthState()

  const mutation = useMutation(
    async ({amount}) => {
      const rawTx = await getRawTx(
        TxType.ReplenishStakeTx,
        coinbase,
        coinbase,
        amount
      )

      return sendRawTx(
        `0x${new Transaction()
          .fromHex(rawTx)
          .sign(privateKey)
          .toHex()}`
      )
    },
    {
      onSuccess,
      onError,
    }
  )

  return {
    data: mutation.data,
    submit: mutation.mutate,
  }
}

export function useStakingApy() {
  const {
    data: {stake},
  } = useBalance()

  const epoch = useEpoch()
  const [{invites, invitees, state}] = useIdentity()

  const fetcher = React.useCallback(async ({queryKey}) => {
    const {result, error} = await (
      await fetch(apiUrl(queryKey.join('/').toLowerCase()))
    ).json()

    if (error) throw new Error(error.message)

    return result
  }, [])

  const rpcFetcher = useRpcFetcher()

  const {data: stakingData} = useQuery({
    queryKey: ['staking'],
    queryFn: fetcher,
    notifyOnChangeProps: 'tracked',
  })

  const {data: onlineMinersCount} = useQuery({
    queryKey: ['onlineminers', 'count'],
    queryFn: fetcher,
    notifyOnChangeProps: 'tracked',
  })

  const {data: prevEpochData} = useQuery({
    queryKey: ['epoch', epoch?.epoch - 1],
    queryFn: fetcher,
    enabled: Boolean(epoch),
    staleTime: Infinity,
    notifyOnChangeProps: 'tracked',
  })

  const {data: validationRewardsSummaryData} = useQuery({
    queryKey: ['epoch', epoch?.epoch - 1, 'rewardsSummary'],
    queryFn: fetcher,
    enabled: Boolean(epoch),
    staleTime: Infinity,
    notifyOnChangeProps: 'tracked',
  })

  const lastInvitee = invitees && invitees.reverse()[0].TxHash
  const secondToLastInvitee =
    invitees && invitees.length > 1 && invitees.reverse()[1].TxHash
  const maxInvitesCount =
    // eslint-disable-next-line no-nested-ternary
    state === IdentityStatus.Human
      ? 2
      : state === IdentityStatus.Verified
      ? 1
      : 0

  const {data: lastInviteTx} = useQuery({
    queryKey: ['bcn_transaction', [lastInvitee]],
    queryFn: rpcFetcher,
    enabled: maxInvitesCount - invites > 0 && Boolean(lastInvitee),
    staleTime: Infinity,
    notifyOnChangeProps: 'tracked',
  })

  const {data: secondToLastInviteTx} = useQuery({
    queryKey: ['bcn_transaction', [secondToLastInvitee]],
    queryFn: rpcFetcher,
    enabled: maxInvitesCount - invites > 1 && Boolean(secondToLastInvitee),
    staleTime: Infinity,
    notifyOnChangeProps: 'tracked',
  })

  return React.useMemo(() => {
    if (
      stakingData &&
      onlineMinersCount &&
      prevEpochData &&
      validationRewardsSummaryData
    ) {
      const {
        weight,
        averageMinerWeight,
        extraFlipsWeight,
        invitationsWeight,
      } = stakingData
      const {
        validation,
        staking,
        extraFlips,
        invitations,
      } = validationRewardsSummaryData

      // epoch staking
      const epochStakingRewardFund = Number(staking) || 0.9 * Number(validation)
      const epochReward = (stake ** 0.9 / weight) * epochStakingRewardFund

      const myStakeWeight = stake ** 0.9

      // available extra flips count
      const extraFlipsCount =
        // eslint-disable-next-line no-nested-ternary
        state === IdentityStatus.Human
          ? 2
          : state === IdentityStatus.Verified
          ? 1
          : 0
      const extraFlipsReward =
        extraFlipsCount * (myStakeWeight / extraFlipsWeight) * extraFlips

      // available invites count
      let invitesCount = invites
      const hasMoreInvites =
        (state === IdentityStatus.Human && invitesCount < 2) ||
        (state === IdentityStatus.Verified && invitesCount < 1)
      if (
        hasMoreInvites &&
        lastInviteTx &&
        lastInviteTx.epoch === epoch?.epoch
      ) {
        // eslint-disable-next-line no-plusplus
        invitesCount++
        if (
          hasMoreInvites &&
          secondToLastInviteTx &&
          secondToLastInviteTx.epoch === epoch?.epoch
        ) {
          // eslint-disable-next-line no-plusplus
          invitesCount++
        }
      }
      const invitationReward =
        invitesCount * ((myStakeWeight / invitationsWeight) * invitations)

      const proposerOnlyReward =
        (6 * myStakeWeight * 20) /
        (myStakeWeight * 20 + averageMinerWeight * 100)

      const committeeOnlyReward =
        (6 * myStakeWeight) / (myStakeWeight + averageMinerWeight * 119)

      const proposerAndCommitteeReward =
        (6 * myStakeWeight * 21) /
        (myStakeWeight * 21 + averageMinerWeight * 99)

      const proposerProbability = 1 / onlineMinersCount

      const committeeProbability =
        Math.min(100, onlineMinersCount) / onlineMinersCount

      const proposerOnlyProbability =
        proposerProbability * (1 - committeeProbability)

      const committeeOnlyProbability =
        committeeProbability * (1 - proposerProbability)

      const proposerAndCommitteeProbability =
        proposerOnlyProbability * committeeOnlyProbability

      const epochDays = dayjs(epoch?.nextValidation).diff(
        prevEpochData?.validationTime,
        'day'
      )

      const estimatedReward =
        ((85000 * epochDays) / 21.0) *
        (proposerOnlyProbability * proposerOnlyReward +
          committeeOnlyProbability * committeeOnlyReward +
          proposerAndCommitteeProbability * proposerAndCommitteeReward)

      const epy =
        (estimatedReward + epochReward + extraFlipsReward + invitationReward) /
        stake

      return (epy / Math.max(1, epochDays)) * 366
    }
  }, [
    epoch,
    invites,
    lastInviteTx,
    onlineMinersCount,
    prevEpochData,
    secondToLastInviteTx,
    stake,
    stakingData,
    state,
    validationRewardsSummaryData,
  ])
}

export function useInviteScore() {
  const {
    data: {highestBlock},
  } = useSyncing()

  const epoch = useEpoch()

  const [{canInvite, invitees}] = useIdentity()

  const inviteesAddresses = (invitees || []).map(x => x.Address)

  const {data: hasNotActivatedInvite} = useQuery({
    queryKey: ['invitesStatuses', ...inviteesAddresses],
    queryFn: () =>
      Promise.all(inviteesAddresses.map(addr => fetchIdentity(addr))),
    select: React.useCallback(
      data => data.some(x => x.state === IdentityStatus.Invite),
      []
    ),
  })

  return React.useMemo(() => {
    const hasPendingInvites = canInvite || hasNotActivatedInvite

    if (epoch && highestBlock && hasPendingInvites) {
      const endBlock =
        highestBlock + dayjs(epoch?.nextValidation).diff(dayjs(), 'minute') * 3

      const t =
        (highestBlock - epoch?.startBlock) / (endBlock - epoch?.startBlock)

      return Math.max(1 - t ** 4 * 0.5, 0)
    }
  }, [canInvite, epoch, hasNotActivatedInvite, highestBlock])
}
