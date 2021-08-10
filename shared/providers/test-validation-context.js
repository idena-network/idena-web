import dayjs from 'dayjs'
import {useContext, createContext, useState, useEffect} from 'react'
import {getResult, requestTestValidation} from '../api/self'
import {useInterval} from '../hooks/use-interval'

import {usePersistence} from '../hooks/use-persistent-state'
import {CertificateActionType, CertificateType, EpochPeriod} from '../types'
import {loadPersistentState} from '../utils/persist'

const TestValidationStateContext = createContext()
const TestVlidationDispatchContext = createContext()

export const TEST_FLIP_LOTTERY_INTERVAL_SEC = 60
export const TEST_SHORT_SESSION_INTERVAL_SEC = 60
export const TEST_LONG_SESSION_INTERVAL_SEC = 60

const initValue = {actionType: CertificateActionType.None}

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

// eslint-disable-next-line react/prop-types
function TestValidationProvider({children}) {
  const [state, setState] = usePersistence(
    useState(
      () =>
        loadPersistentState('test-validation') || {
          validations: {
            [CertificateType.Beginner]: initValue,
            [CertificateType.Master]: initValue,
            [CertificateType.Expert]: initValue,
          },
        }
    ),
    'test-validation'
  )

  const checkValidation = async id => {
    const result = await getResult(id)

    setState(prevState => ({
      ...prevState,
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

  const scheduleValidation = async (type, coinbase) => {
    const {id, startTime} = await requestTestValidation(type, coinbase)
    setState(prevState => ({
      ...prevState,
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

  useInterval(
    () => {
      if (!state.current) return
      const newPeriod = getEpochPeriod(state.current.startTime)
      if (newPeriod !== state.current.period) {
        setState({
          ...state,
          current: {
            ...state.current,
            period: newPeriod,
          },
        })
      }
    },
    state.current &&
      state.current.startTime - TEST_FLIP_LOTTERY_INTERVAL_SEC * 1000 <
        new Date().getTime()
      ? 1000
      : null,
    false
  )

  useEffect(() => {
    async function check(id) {
      const result = await getResult(id)

      setState(prevState => ({
        ...prevState,
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
        check(state.current.id)
      }
    }
  }, [setState, state])

  const epoch = {
    epoch: 1,
    nextValidation: state.current?.startTime,
    currentPeriod: getEpochPeriod(state.current?.startTime),
  }

  return (
    <TestValidationStateContext.Provider value={{...state, epoch}}>
      <TestVlidationDispatchContext.Provider
        value={{scheduleValidation, checkValidation}}
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
