import dayjs from 'dayjs'
import {useContext, createContext, useState, useEffect} from 'react'
import {
  getResult,
  persistTestValidation,
  requestTestValidation,
  restoreTestValidation,
} from '../api/self'
import {useInterval} from '../hooks/use-interval'

import {usePersistence} from '../hooks/use-persistent-state'
import {CertificateActionType, CertificateType, EpochPeriod} from '../types'
import {sendSuccessTrainingValidation} from '../utils/analytics'
import {toHexString} from '../utils/buffers'
import {signMessage} from '../utils/crypto'
import {loadPersistentState} from '../utils/persist'
import {useAuthState} from './auth-context'

const TestValidationStateContext = createContext()
const TestVlidationDispatchContext = createContext()

export const TEST_FLIP_LOTTERY_INTERVAL_SEC = 300
export const TEST_SHORT_SESSION_INTERVAL_SEC = 120
export const TEST_LONG_SESSION_INTERVAL_SEC = 30 * 60

const initStateValue = {
  timestamp: 0,
  validations: {
    [CertificateType.Easy]: {actionType: CertificateActionType.None},
    [CertificateType.Medium]: {actionType: CertificateActionType.None},
    [CertificateType.Hard]: {actionType: CertificateActionType.None},
    [CertificateType.Sample]: {actionType: CertificateActionType.None},
  },
}

const getEpochPeriod = time => {
  if (!time) {
    return EpochPeriod.None
  }

  const currentTime = dayjs()
  const validationStartTime = dayjs(time)

  if (
    currentTime <
    validationStartTime.subtract(TEST_FLIP_LOTTERY_INTERVAL_SEC, 's')
  ) {
    return EpochPeriod.None
  }

  if (currentTime < validationStartTime) {
    return EpochPeriod.FlipLottery
  }

  if (
    currentTime < validationStartTime.add(TEST_SHORT_SESSION_INTERVAL_SEC, 's')
  ) {
    return EpochPeriod.ShortSession
  }

  if (
    currentTime <
    validationStartTime.add(
      TEST_SHORT_SESSION_INTERVAL_SEC + TEST_LONG_SESSION_INTERVAL_SEC,
      's'
    )
  ) {
    return EpochPeriod.LongSession
  }

  return EpochPeriod.None
}

const localStorageKey = coinbase => `test-validation-${coinbase}`

// eslint-disable-next-line react/prop-types
function TestValidationProvider({children}) {
  const {coinbase, privateKey} = useAuthState()

  const [state, setState] = usePersistence(
    useState(initStateValue),
    localStorageKey(coinbase)
  )

  const [initialized, setInitialized] = useState(false)

  // inital loading from localStorage
  useEffect(() => {
    if (coinbase) {
      try {
        const prevState = loadPersistentState(localStorageKey(coinbase))
        if (prevState) {
          setState({...prevState, shouldPersist: false})
        }
      } catch {
        setState(initStateValue)
      } finally {
        setInitialized(true)
      }
    }
  }, [coinbase, setState])

  // try to load from cloud storage
  useEffect(() => {
    async function load() {
      try {
        const signature = signMessage(coinbase, privateKey)
        const persistedState = await restoreTestValidation(
          toHexString(signature),
          coinbase
        )

        if (persistedState) {
          setState(prevState => {
            if (prevState.timestamp <= persistedState.timestamp)
              return {...persistedState, shouldPersist: false}
            return {...prevState, shouldPersist: true}
          })
        }
        // eslint-disable-next-line no-empty
      } catch {}
    }

    if (coinbase && initialized) {
      load()
    }
  }, [coinbase, initialized, privateKey, setState])

  useEffect(() => {
    async function persist() {
      try {
        const signature = signMessage(coinbase, privateKey)
        await persistTestValidation(toHexString(signature), coinbase, state)
      } catch (e) {
        console.error('cannot persist training validation', e)
      }
    }

    if (coinbase && state.timestamp && state.shouldPersist) {
      persist()
    }
  }, [coinbase, privateKey, state])

  const checkValidation = async id => {
    if (!state.current) return
    const result =
      state.current.type === CertificateType.Sample ? {} : await getResult(id)

    if (result.actionType === CertificateActionType.Passed) {
      sendSuccessTrainingValidation(coinbase)
    }

    setState(prevState => ({
      ...prevState,
      timestamp: new Date().getTime(),
      shouldPersist: true,
      last: {
        id,
        startTime: prevState.current.startTime,
      },
      current: null,
      validations: {
        ...prevState.validations,
        [prevState.current.type]: {
          id,
          ...result,
        },
      },
    }))
  }

  const scheduleValidation = async type => {
    const signature = signMessage(coinbase, privateKey)
    let id
    let startTime
    if (type === CertificateType.Sample) {
      id = 'sample-validation'
      const dt = new Date()
      startTime = dt.setSeconds(dt.getSeconds() + 30)
    } else {
      ;({id, startTime} = await requestTestValidation(
        toHexString(signature),
        coinbase,
        type
      ))
    }

    setState(prevState => ({
      ...prevState,
      timestamp: new Date().getTime(),
      shouldPersist: true,
      current: {
        period: EpochPeriod.None,
        type,
        startTime,
        id,
      },
      validations: {
        ...prevState.validations,
        [type]: {
          id,
          actionType: CertificateActionType.Requested,
        },
      },
    }))
  }

  const cancelValidation = async type => {
    setState(prevState => ({
      ...prevState,
      timestamp: new Date().getTime(),
      shouldPersist: true,
      current: null,
      validations: {
        ...prevState.validations,
        [type]: {
          actionType: CertificateActionType.None,
        },
      },
    }))
  }

  const cancelCurrentValidation = async () => {
    setState(prevState => {
      if (!prevState.current) {
        return prevState
      }
      return {
        ...prevState,
        timestamp: new Date().getTime(),
        shouldPersist: true,
        current: null,
        validations: {
          ...prevState.validations,
          [prevState.current.type]: {
            actionType: CertificateActionType.None,
          },
        },
      }
    })
  }

  useInterval(
    () => {
      if (
        !state.current ||
        state.current.startTime - TEST_FLIP_LOTTERY_INTERVAL_SEC * 1000 >
          new Date().getTime()
      )
        return

      const newPeriod = getEpochPeriod(state.current.startTime)
      if (newPeriod !== state.current.period) {
        setState({
          ...state,
          timestamp: new Date().getTime(),
          shouldPersist: true,
          current: {
            ...state.current,
            period: newPeriod,
          },
        })
      }
    },
    state.current ? 1000 : null,
    false
  )

  useEffect(() => {
    async function check(id, type) {
      const result = type === CertificateType.Sample ? {} : await getResult(id)

      setState(prevState => ({
        ...prevState,
        timestamp: new Date().getTime(),
        shouldPersist: true,
        last: {
          id,
          startTime: prevState.current.startTime,
        },
        current: null,
        validations: {
          ...prevState.validations,
          [prevState.current.type]: {
            id,
            ...result,
          },
        },
      }))
    }
    if (state.current?.period === EpochPeriod.None) {
      if (state.current.startTime < new Date().getTime()) {
        check(state.current.id, state.current.type)
      }
    }
  }, [setState, state])

  const epoch = {
    epoch: 1,
    nextValidation: state.current?.startTime,
    currentPeriod: getEpochPeriod(state.current?.startTime),
  }

  const isSuccess = type =>
    state.validations?.[type]?.actionType === CertificateActionType.Passed

  const hasSuccessTrainingValidation =
    isSuccess(CertificateType.Easy) ||
    isSuccess(CertificateType.Medium) ||
    isSuccess(CertificateType.Hard)

  return (
    <TestValidationStateContext.Provider
      value={{...state, epoch, hasSuccessTrainingValidation}}
    >
      <TestVlidationDispatchContext.Provider
        value={{
          scheduleValidation,
          checkValidation,
          cancelValidation,
          cancelCurrentValidation,
        }}
      >
        {children}
      </TestVlidationDispatchContext.Provider>
    </TestValidationStateContext.Provider>
  )
}

function useTestValidationState() {
  const context = useContext(TestValidationStateContext)
  if (context === undefined) {
    throw new Error(
      'useTestValidationState must be used within a TestValidationStateContext'
    )
  }
  return context
}

function useTestValidationDispatch() {
  const context = useContext(TestVlidationDispatchContext)
  if (context === undefined) {
    throw new Error(
      'useTestValidationDispatch must be used within a TestVlidationDispatchContext'
    )
  }
  return context
}

export {
  TestValidationProvider,
  useTestValidationState,
  useTestValidationDispatch,
}
