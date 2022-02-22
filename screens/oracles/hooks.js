/* eslint-disable no-continue */

import {useQuery} from 'react-query'
import {useAuthState} from '../../shared/providers/auth-context'
import {wait} from '../../shared/utils/fn'
import {callRpc, isVercelProduction} from '../../shared/utils/utils'
import {DeferredVoteType} from './types'
import {
  addDeferredVote,
  callContract,
  estimateCallContract,
  updateDeferredVote,
} from './utils'

const REFETCH_INTERVAL = isVercelProduction ? 5 * 60 * 1000 : 30 * 1000

export function useDeferredVotes() {
  const {privateKey} = useAuthState()

  const {data: pendingVotes, refetch, isFetched} = useQuery(
    'useDeferredVotes',
    () =>
      wait(5000).then(() => [
        {contractHash: '0x1', block: 0, amount: 10},
        {contractHash: '0x99', block: 5, amount: 999},
      ]),
    {
      initialData: [],
    }
  )

  const {
    data: {currentBlock},
  } = useQuery('bcn_syncing', () => callRpc('bcn_syncing'), {
    initialData: {currentBlock: 0},
    refetchIntervalInBackground: true,
    refetchInterval: REFETCH_INTERVAL,
    enabled: pendingVotes.length > 0,
  })

  const addVote = async vote => {
    await addDeferredVote(vote)
    refetch()
  }

  const estimateSendVote = async vote => {
    const voteData = {
      method: 'sendVote',
      contractHash: vote.contractHash,
      amount: vote.amount,
      args: vote.args,
    }

    return estimateCallContract(privateKey, voteData)
  }

  const sendVote = async vote => {
    const voteData = {
      method: 'sendVote',
      contractHash: vote.contractHash,
      amount: vote.amount,
      args: vote.args,
    }

    console.log(`sending deferred vote, contract: ${vote.contractHash}`)

    const {
      receipt: {gasCost, txFee},
    } = await estimateCallContract(privateKey, voteData)

    const voteResponse = await callContract(privateKey, {
      ...voteData,
      gasCost: Number(gasCost),
      txFee: Number(txFee),
    })

    await updateDeferredVote(vote.id, {
      type: DeferredVoteType.Success,
      txHash: voteResponse,
    })
  }

  return [
    {
      votes: [
        {contractHash: '0x1', block: 0, amount: 10},
        {contractHash: '0x99', block: 5, amount: 999},
      ],
      isReady: isFetched,
    },
    {addVote, sendVote, estimateSendVote},
  ]
}
