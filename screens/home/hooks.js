import {useMachine} from '@xstate/react'
import dayjs from 'dayjs'
import React, {useEffect, useReducer, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useMutation, useQuery} from 'react-query'
import {assign, createMachine} from 'xstate'
import {
  activateKey,
  getAvailableProviders,
  getRawTx,
  sendRawTx,
} from '../../shared/api'
import useApikeyPurchasing from '../../shared/hooks/use-apikey-purchasing'
import {usePersistence} from '../../shared/hooks/use-persistent-state'
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
import {toPercent, validateInvitationCode} from '../../shared/utils/utils'
import {apiUrl} from '../oracles/utils'

const idenaBotMachine = createMachine({
  context: {
    connected: undefined,
  },
  initial: 'loading',
  states: {
    loading: {
      invoke: {
        src: 'loadConnectionStatus',
      },
      on: {
        CONNECTED: 'connected',
        DISCONNECTED: 'disconnected',
      },
    },
    connected: {
      entry: [assign({connected: true}), 'persist'],
    },
    disconnected: {
      on: {CONNECT: 'connected'},
    },
  },
})

export function useIdenaBot() {
  const [current, send] = useMachine(idenaBotMachine, {
    services: {
      loadConnectionStatus: () => cb => {
        try {
          cb(
            JSON.parse(localStorage.getItem('connectIdenaBot'))
              ? 'CONNECTED'
              : 'DISCONNECTED'
          )
        } catch (e) {
          console.error(e)
          cb('DISCONNECTED')
        }
      },
    },
    actions: {
      persist: ({connected}) => {
        localStorage.setItem('connectIdenaBot', connected)
      },
    },
  })

  return [current.context.connected, () => send('CONNECT')]
}

export function useInviteActivation() {
  const failToast = useFailToast()

  const [{state}, {waitStateUpdate}] = useIdentity()
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

        // need to wait identity state update manually, because nothing changes in memory
        waitStateUpdate()
      }
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

  const waiting = submitting || isPurchasing || mining

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
    submit: mutation.mutate,
  }
}

export function useStakingAlert() {
  const {t} = useTranslation()

  const [{state, age}] = useIdentity()

  const lossRatio = React.useMemo(() => (age === 4 ? 1 : (10 - age) / 100), [
    age,
  ])

  const messages = React.useMemo(
    () => ({
      [IdentityStatus.Newbie]: t(
        'You will lose 100% of the stake if you fail or miss the upcoming validation'
      ),
      [IdentityStatus.Candidate]: t(
        'You will lose 100% of the stake if you fail or miss the upcoming validation'
      ),
      [IdentityStatus.Verified]: t(
        'You will lose 100% of the stake if you fail the upcoming validation'
      ),
      [IdentityStatus.Zombie]: [
        t(
          `You will lose {{ratio}} of the stake if you fail the upcoming validation.`,
          {
            ratio: toPercent(lossRatio),
          }
        ),
        t(
          'You will lose 100% of the stake if you miss the upcoming validation'
        ),
      ],
      [IdentityStatus.Suspended]: t(
        'You will lose {{ratio}} of the stake if you fail the upcoming validation.',
        {
          ratio: toPercent(lossRatio),
        }
      ),
    }),
    [lossRatio, t]
  )

  return React.useMemo(
    () =>
      [
        IdentityStatus.Candidate,
        IdentityStatus.Newbie,
        IdentityStatus.Verified,
        IdentityStatus.Zombie,
      ].includes(state) ||
      (state === IdentityStatus.Suspended && age > 0)
        ? messages[state]
        : null,
    [age, state, messages]
  )
}

export function useStakingApy() {
  const [{stake}] = useIdentity()

  const epoch = useEpoch()

  const fetcher = React.useCallback(async ({queryKey}) => {
    const {result, error} = await (
      await fetch(apiUrl(queryKey.join('/').toLowerCase()))
    ).json()

    if (error) throw new Error(error.message)

    return result
  }, [])

  const {data: stakingData} = useQuery({
    queryKey: ['staking', stake],
    queryFn: fetcher,
    notifyOnChangeProps: 'tracked',
  })

  const {data: validationRewardsSummaryData} = useQuery({
    queryKey: ['epoch', epoch?.epoch - 1, 'rewardsSummary'],
    queryFn: fetcher,
    enabled: Boolean(epoch),
    staleTime: Infinity,
    notifyOnChangeProps: 'tracked',
  })

  const {data: prevEpochData} = useQuery({
    queryKey: ['epoch', epoch?.epoch - 1],
    queryFn: fetcher,
    staleTime: Infinity,
    notifyOnChangeProps: 'tracked',
  })

  return React.useMemo(() => {
    if (stakingData && validationRewardsSummaryData && epoch && prevEpochData) {
      const {weight} = stakingData
      const {validation, staking} = validationRewardsSummaryData

      const epochStakingRewardFund = Number(staking) || 0.9 * Number(validation)

      const epochReward = (stake ** 0.9 / weight) * epochStakingRewardFund

      const epy = epochReward / stake

      const epochDays = dayjs(epoch?.nextValidation).diff(
        prevEpochData?.validationTime,
        'day'
      )

      return (epy / epochDays) * 366
    }
  }, [epoch, prevEpochData, stake, stakingData, validationRewardsSummaryData])
}
