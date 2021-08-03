/* eslint-disable react/prop-types */
import {useMachine} from '@xstate/react'
import {useMemo} from 'react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {useDisclosure} from '@chakra-ui/core'
import dayjs from 'dayjs'
import {createValidationMachine} from '../../screens/validation/machine'
import {ValidationScreen} from '../../screens/validation/components'
import {useAuthState} from '../../shared/providers/auth-context'
import {useLocalStorageLogger} from '../../shared/utils/logs'
import {LayoutContainer} from '../../screens/app/components'
import Auth from '../../shared/components/auth'
import {
  getTestFlip,
  testLongHashes,
  testShortHashes,
} from '../../screens/validation/test-flips'
import {forEachAsync} from '../../shared/utils/fn'
import {decodedWithoutKeywords} from '../../screens/validation/utils'

export default function TrainingPage() {
  const {auth, privateKey, coinbase} = useAuthState()

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
        coinbase={coinbase}
        privateKey={privateKey}
        validationStart={new Date().getTime()}
        shortSessionDuration={30}
        longSessionDuration={30}
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
        router.push('/')
      },
    },
    services: {
      fetchIdentity: () => Promise.resolve({}),
      fetchShortHashes: () => Promise.resolve(testShortHashes),
      fetchShortFlips: ({shortFlips}) => cb =>
        fetchFlips(
          shortFlips
            .filter(({missing, fetched}) => !fetched && !missing)
            .map(({hash}) => hash),
          cb
        ),
      fetchLongHashes: () => Promise.resolve(testLongHashes),
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
      submitShortAnswers: () => {
        console.log('short answers submitted!')
        return Promise.resolve()
      },
      submitLongAnswers: () => {
        console.log('long answers submitted!')
        return Promise.resolve()
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
    />
  )
}

const toBlob = base64 => fetch(base64).then(res => res.blob())

async function loadWords(flips) {
  return Promise.resolve(flips.map(x => ({hash: x.hash, words: x.keywords})))
}

async function fetchFlips(hashes, cb) {
  return forEachAsync(hashes, async hash => {
    const flip = await (await fetch(`/api/validation/flip?hash=${hash}`)).json()
    // const flip = await getTestFlip(hash)
    if (flip) {
      const images = await Promise.all(flip.images.map(toBlob))

      console.log(images)

      return cb({
        type: 'FLIP',
        flip: {
          time: dayjs(),
          images: images.map(URL.createObjectURL),
          orders: flip.orders,
          keywords: flip.keywords,
          hash,
          fetched: true,
          decoded: true,
        },
      })
    }
    return Promise.resolve(
      cb({
        type: 'FLIP',
        flip: {
          hash,
          missing: true,
          failed: true,
        },
      })
    )
  })
}
