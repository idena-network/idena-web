/* eslint-disable no-continue */
import dayjs from 'dayjs'
import {useQuery} from 'react-query'
import {useInterval} from '../../shared/hooks/use-interval'
import {useAuthState} from '../../shared/providers/auth-context'
import {callRpc, isVercelProduction} from '../../shared/utils/utils'
import {DeferredVoteType} from './types'
import {
  callContract,
  estimateCallContract,
  getDeferredVotes,
  updateDeferredVote,
} from './utils'

const REFETCH_INTERVAL = isVercelProduction ? 5 * 60 * 1000 : 30 * 1000

export function useDeferredVotes() {
  const {privateKey} = useAuthState()
  const {
    data: {currentBlock},
  } = useQuery('bcn_syncing', () => callRpc('bcn_syncing'), {
    initialData: {currentBlock: 0},
    refetchIntervalInBackground: true,
    refetchInterval: REFETCH_INTERVAL,
  })

  useInterval(
    async () => {
      try {
        if (!privateKey) return
        const txs = await getDeferredVotes()

        for (const tx of txs.filter(x => x.block < currentBlock)) {
          try {
            if (tx.retries > 10) {
              await updateDeferredVote(tx.id, {
                type: DeferredVoteType.Failed,
              })
              continue
            }
            if (tx.lastTry && dayjs().diff(dayjs(tx.lastTry), 'second') < 60)
              continue

            const voteData = {
              method: 'sendVote',
              contractHash: tx.contractHash,
              amount: tx.amount,
              args: tx.args,
            }

            console.log(`sending deferred vote, contract: ${tx.contractHash}`)

            const {
              receipt: {gasCost, txFee},
            } = await estimateCallContract(privateKey, voteData)

            const voteResponse = await callContract(privateKey, {
              ...voteData,
              gasCost: Number(gasCost),
              txFee: Number(txFee),
            })

            await updateDeferredVote(tx.id, {
              type: DeferredVoteType.Success,
              txHash: voteResponse,
            })
          } catch (e) {
            await updateDeferredVote(tx.id, {
              retries: (tx.retries || 0) + 1,
              lastTry: new Date().getTime(),
              error: e.message.toString(),
            })
          }
        }
      } catch (e) {
        console.error(e)
      }
    },
    20 * 1000,
    true
  )
}
