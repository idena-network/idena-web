/* eslint-disable react/prop-types */
import {useMachine} from '@xstate/react'
import {useMemo, useEffect} from 'react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {useDisclosure} from '@chakra-ui/react'
import {createValidationMachine} from '../../screens/validation/machine'
import {
  persistValidationState,
  loadValidationState,
} from '../../screens/validation/utils'
import {ValidationScreen} from '../../screens/validation/components'
import {useAuthState} from '../../shared/providers/auth-context'
import {LayoutContainer} from '../../screens/app/components'
import Auth from '../../shared/components/auth'
import useNodeTiming from '../../shared/hooks/use-node-timing'
import {useEpoch} from '../../shared/providers/epoch-context'
import {writeValidationLog} from '../../shared/utils/logs'

export default function ValidationPage() {
  const epoch = useEpoch()
  const timing = useNodeTiming()
  const {auth, privateKey, coinbase} = useAuthState()

  if (!auth) {
    return (
      <LayoutContainer>
        <Auth />
      </LayoutContainer>
    )
  }

  if (epoch && privateKey && coinbase && timing && timing.shortSession)
    return (
      <ValidationSession
        coinbase={coinbase}
        privateKey={privateKey}
        epoch={epoch.epoch}
        validationStart={new Date(epoch.nextValidation).getTime()}
        shortSessionDuration={timing.shortSession}
        longSessionDuration={timing.longSession}
      />
    )

  return null
}
function ValidationSession({
  privateKey,
  coinbase,
  epoch,
  validationStart,
  shortSessionDuration,
  longSessionDuration,
}) {
  const router = useRouter()

  const {i18n} = useTranslation()

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
        epoch,
        validationStart,
        shortSessionDuration,
        longSessionDuration,
        locale: i18n.language || 'en',
      }),
    [
      coinbase,
      epoch,
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
      onValidationSucceeded: () => {
        router.push('/home')
      },
    },
    state: loadValidationState(),
    logger: async data => writeValidationLog(epoch, data),
  })

  useEffect(() => {
    persistValidationState(state)
  }, [state])

  return (
    <ValidationScreen
      state={state}
      send={send}
      validationStart={validationStart}
      shortSessionDuration={shortSessionDuration}
      longSessionDuration={longSessionDuration}
      isExceededTooltipOpen={isExceededTooltipOpen}
    />
  )
}
