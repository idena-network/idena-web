/* eslint-disable no-continue */

import {useQuery, useQueryClient} from 'react-query'
import useSyncing from '../../shared/hooks/use-syncing'
import {useAuthState} from '../../shared/providers/auth-context'
import {isVercelProduction} from '../../shared/utils/utils'
import {DeferredVoteType} from './types'
import {
  addDeferredVote,
  callContract,
  deleteDeferredVote,
  estimateCallContract,
  getDeferredVotes,
  updateDeferredVote,
} from './utils'

const REFETCH_INTERVAL = isVercelProduction ? 5 * 60 * 1000 : 30 * 1000

export function useDeferredVotes() {
  const queryClient = useQueryClient()
  const {coinbase, privateKey} = useAuthState()

  const {data: deferredVotes, isFetched} = useQuery(
    'useDeferredVotes',
    () => getDeferredVotes(coinbase),
    {
      enabled: !!coinbase,
      initialData: [],
    }
  )

  const {
    data: {currentBlock},
    isFetched: isBlockFetched,
  } = useSyncing({
    refetchIntervalInBackground: true,
    refetchInterval: REFETCH_INTERVAL,
    enabled: deferredVotes.length > 0,
  })

  const addVote = async vote => {
    await addDeferredVote({coinbase, ...vote})
    queryClient.invalidateQueries('useDeferredVotes')
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
    queryClient.invalidateQueries('useDeferredVotes')
  }

  const deleteVote = async id => {
    await deleteDeferredVote(id)
    queryClient.invalidateQueries('useDeferredVotes')
  }

  const available = deferredVotes.filter(x => x.block < currentBlock)

  return [
    {
      votes: available,
      isReady: isFetched && isBlockFetched,
    },
    {addVote, sendVote, estimateSendVote, deleteVote},
  ]
}
