/* eslint-disable no-continue */

import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {useQuery, useQueryClient} from 'react-query'
import useSyncing from '../../shared/hooks/use-syncing'
import {useFailToast} from '../../shared/hooks/use-toast'
import {useAuthState} from '../../shared/providers/auth-context'
import {isVercelProduction} from '../../shared/utils/utils'
import {DeferredVoteType} from './types'
import {
  addDeferredVote,
  callContract,
  createContractDataReader,
  deleteDeferredVote,
  estimateCallContract,
  estimateTerminateContract,
  getDeferredVotes,
  updateDeferredVote,
} from './utils'

const REFETCH_INTERVAL = isVercelProduction ? 5 * 60 * 1000 : 30 * 1000

export function useDeferredVotes() {
  const queryClient = useQueryClient()
  const {coinbase, privateKey} = useAuthState()
  const failToast = useFailToast()
  const {t} = useTranslation()
  const router = useRouter()

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

  const deleteVote = async id => {
    await deleteDeferredVote(id)
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

  const estimateProlong = async contractHash => {
    try {
      await estimateCallContract(privateKey, {
        method: 'prolongVoting',
        contractHash,
      })
      return true
    } catch (e) {
      return false
    }
  }

  const sendVote = async (vote, skipToast) => {
    function showError(message) {
      failToast(
        `${t('Can not send scheduled transaction:', {
          nsSeparator: '|',
        })} ${message}`
      )
    }

    try {
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
    } catch (e) {
      switch (e.message) {
        case 'too early to accept open vote': {
          try {
            const readContractData = createContractDataReader(vote.contractHash)

            const startBlock = await readContractData('startBlock', 'uint64')
            const votingDuration = await readContractData(
              'votingDuration',
              'uint64'
            )

            const nextVoteBlock = startBlock + votingDuration

            if (nextVoteBlock > vote.block) {
              await updateDeferredVote(vote.id, {
                block: nextVoteBlock,
              })
              queryClient.invalidateQueries('useDeferredVotes')
            }
          } catch (err) {
            console.error(err)
          } finally {
            if (!skipToast) showError(e.message)
          }
          break
        }
        case 'too late to accept open vote':
        case 'quorum is not reachable': {
          if (await estimateProlong(vote.contractHash)) {
            if (!skipToast)
              failToast({
                title: t('Can not cast public vote. Please, prolong voting'),
                onAction: () => {
                  router.push(`/oracles/view?id=${vote.contractHash}`)
                },
                actionContent: t('Open voting'),
              })

            const readContractData = createContractDataReader(vote.contractHash)

            const votingDuration = await readContractData(
              'votingDuration',
              'uint64'
            )

            await updateDeferredVote(vote.id, {
              block: vote.block + votingDuration,
            })
            queryClient.invalidateQueries('useDeferredVotes')
          } else {
            if (!skipToast) showError(e.message)
            deleteVote(vote.id)
          }
          break
        }
        case 'insufficient funds': {
          showError(e.message)
          break
        }
        case "tx can't be accepted due to validation ceremony": {
          await updateDeferredVote(vote.id, {
            block: vote.block + isVercelProduction ? 10 * 3 : 2 * 3,
          })
          queryClient.invalidateQueries('useDeferredVotes')
          if (!skipToast) showError(e.message)
          break
        }
        case 'contract is not in running state':
        case 'destination is not a contract': {
          if (!skipToast) showError(e.message)
          await deleteDeferredVote(vote.id)
          queryClient.invalidateQueries('useDeferredVotes')
          break
        }
        default: {
          await updateDeferredVote(vote.id, {
            block: vote.block + isVercelProduction ? 10 * 3 : 2 * 3,
          })
          queryClient.invalidateQueries('useDeferredVotes')
          showError(e.message)
        }
      }
    }
  }

  const available = deferredVotes.filter(x => x.block < currentBlock)

  return [
    {
      votes: available,
      all: deferredVotes,
      isReady: isFetched && isBlockFetched,
    },
    {addVote, sendVote, estimateSendVote, estimateProlong, deleteVote},
  ]
}

async function loadActions(id, privateKey) {
  async function checkAction(fn) {
    try {
      const result = await fn
      return !!result?.receipt?.success
    } catch (e) {
      return false
    }
  }

  const canFinish = await checkAction(
    estimateCallContract(privateKey, {
      method: 'finishVoting',
      contractHash: id,
    })
  )

  const canProlong = await checkAction(
    estimateCallContract(privateKey, {
      method: 'prolongVoting',
      contractHash: id,
    })
  )

  const canTerminate = await checkAction(
    estimateTerminateContract(privateKey, {
      contractHash: id,
    })
  )

  return {
    canFinish,
    canProlong: canFinish ? false : canProlong,
    canTerminate,
  }
}

export function useOracleActions(id) {
  const {privateKey} = useAuthState()

  const {data, refetch, isFetching} = useQuery(
    ['oracle-actions', id],
    () => loadActions(id, privateKey),
    {
      retry: false,
      enabled: !!id && !!privateKey,
    }
  )

  return [
    {
      ...data,
      isFetching,
    },
    refetch,
  ]
}
