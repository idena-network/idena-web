/* eslint-disable react/prop-types */
import {useMachine} from '@xstate/react'
import {useEffect, useMemo} from 'react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {useDisclosure} from '@chakra-ui/react'
import {createValidationMachine} from '../../screens/validation/machine'
import {ValidationScreen} from '../../screens/validation/components'
import {useAuthState} from '../../shared/providers/auth-context'
import {LayoutContainer} from '../../screens/app/components'
import Auth from '../../shared/components/auth'
import {decodedWithoutKeywords} from '../../screens/validation/utils'
import {
  TEST_LONG_SESSION_INTERVAL_SEC,
  TEST_SHORT_SESSION_INTERVAL_SEC,
  useTestValidationDispatch,
  useTestValidationState,
} from '../../shared/providers/test-validation-context'
import {getHashes, submitAnswers} from '../../shared/api/self'
import {RelevanceType, SessionType} from '../../shared/types'
import {signMessage} from '../../shared/utils/crypto'
import {toHexString} from '../../shared/utils/buffers'
import {useAutoCloseTestValidationToast} from '../../screens/try/hooks/use-test-validation-toast'
import {fetchFlips, loadWords} from '../../screens/try/utils'

export default function TrainingPage() {
  const {auth, privateKey, coinbase} = useAuthState()
  const {current, timestamp, last} = useTestValidationState()
  const router = useRouter()

  // hack to redirect only when new page /try/validation is opened
  // and do not redirect right after validation ends.
  useEffect(() => {
    if (timestamp && !current) {
      if (Math.abs(timestamp - new Date().getTime()) > 3 * 1000) {
        return router.push('/try')
      }
    }
  }, [current, router, timestamp])

  useAutoCloseTestValidationToast()

  if (!auth) {
    return (
      <LayoutContainer>
        <Auth />
      </LayoutContainer>
    )
  }

  if (privateKey && coinbase)
    return (
      <ValidationSession
        id={current?.id || last?.id}
        coinbase={coinbase}
        privateKey={privateKey}
        validationStart={current?.startTime || last?.startTime}
        shortSessionDuration={TEST_SHORT_SESSION_INTERVAL_SEC}
        longSessionDuration={TEST_LONG_SESSION_INTERVAL_SEC}
      />
    )

  return null
}

function ValidationSession({
  id,
  privateKey,
  coinbase,
  validationStart,
  shortSessionDuration,
  longSessionDuration,
}) {
  const {checkValidation, cancelCurrentValidation} = useTestValidationDispatch()

  const {i18n} = useTranslation()

  const router = useRouter()

  const {
    isOpen: isExceededTooltipOpen,
    onOpen: onOpenExceededTooltip,
    onClose: onCloseExceededTooltip,
  } = useDisclosure()

  const validationMachine = useMemo(
    () =>
      createValidationMachine({
        privateKey,
        coinbase,
        epoch: 0,
        validationStart,
        shortSessionDuration,
        longSessionDuration,
        locale: i18n.language || 'en',
        isTraining: true,
      }),
    [
      coinbase,
      i18n.language,
      longSessionDuration,
      privateKey,
      shortSessionDuration,
      validationStart,
    ]
  )
  const [state, send] = useMachine(validationMachine, {
    actions: {
      onExceededReports: () => {
        onOpenExceededTooltip()
        setTimeout(onCloseExceededTooltip, 3000)
      },
      onValidationSucceeded: async () => {
        try {
          await checkValidation(id)
        } finally {
          router.push(`/try/details/${id}`)
        }
      },
    },
    services: {
      fetchIdentity: () => Promise.resolve({}),
      fetchShortHashes: () =>
        id
          ? getHashes(id, SessionType.Short).then(data =>
              data.map(x => ({hash: x}))
            )
          : new Promise((_, reject) => setTimeout(reject, 0)),
      fetchShortFlips: ({shortFlips}) => cb =>
        fetchFlips(
          shortFlips
            .filter(({missing, fetched}) => !fetched && !missing)
            .map(({hash}) => hash),
          cb
        ),
      fetchLongHashes: () =>
        id
          ? getHashes(id, SessionType.Long).then(data =>
              data.map(x => ({hash: x}))
            )
          : new Promise((_, reject) => setTimeout(reject, 0)),
      fetchLongFlips: ({longFlips}) => cb =>
        fetchFlips(
          longFlips
            .filter(({missing, fetched}) => !fetched && !missing)
            .map(({hash}) => hash),
          cb
        ),
      sendPublicFlipKey: () => Promise.resolve({}),
      submitHash: () => Promise.resolve({}),
      fetchWords: ({longFlips}) =>
        loadWords(longFlips.filter(decodedWithoutKeywords)),
      fetchWordsSeed: () => Promise.resolve('0x'),
      submitShortAnswers: ({shortFlips}) => {
        const answers = shortFlips.map(({option: answer = 0, hash}) => ({
          answer,
          hash,
        }))

        const signature = signMessage(id, privateKey)

        return submitAnswers(
          toHexString(signature),
          id,
          SessionType.Short,
          answers
        )
      },
      submitLongAnswers: ({longFlips}) => {
        const answers = longFlips.map(
          ({option: answer = 0, hash, relevance}) => ({
            answer,
            hash,
            wrongWords: relevance === RelevanceType.Irrelevant,
          })
        )

        const signature = signMessage(id, privateKey)

        return submitAnswers(
          toHexString(signature),
          id,
          SessionType.Long,
          answers
        )
      },
    },
  })

  return (
    <ValidationScreen
      state={state}
      send={send}
      validationStart={validationStart}
      shortSessionDuration={shortSessionDuration}
      longSessionDuration={longSessionDuration}
      isExceededTooltipOpen={isExceededTooltipOpen}
      onValidationFailed={async () => {
        try {
          await checkValidation(id)
        } finally {
          router.push(`/try/details/${id}`)
        }
      }}
      onClose={async () => {
        await cancelCurrentValidation()
        router.push('/try')
      }}
    />
  )
}
