import {useToast} from '@chakra-ui/core'
import React, {useEffect} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from 'react-query'
import {fetchCeremonyIntervals} from '../api/dna'
import {Toast} from '../components/components'
import {useInterval} from '../hooks/use-interval'
import {ntp} from '../utils/utils'
import {useSettingsState} from './settings-context'

const TIME_DRIFT_THRESHOLD = 10 * 1000

const TimingStateContext = React.createContext()

export function TimingProvider(props) {
  const {t} = useTranslation()

  const toast = useToast()

  const {apiKey, url} = useSettingsState()

  const {data: timing} = useQuery(
    ['get-timing', apiKey, url],
    () =>
      fetchCeremonyIntervals().then(
        ({
          ValidationInterval,
          FlipLotteryDuration,
          ShortSessionDuration,
          LongSessionDuration,
        }) => ({
          validation: ValidationInterval,
          flipLottery: FlipLotteryDuration,
          shortSession: ShortSessionDuration,
          longSession: LongSessionDuration,
        })
      ),
    {
      refetchOnWindowFocus: false,
      initialData: {
        validation: null,
        flipLottery: null,
        shortSession: null,
        longSession: null,
        none: null,
      },
    }
  )

  const [wrongClientTime, setWrongClientTime] = React.useState()

  useInterval(
    async () => {
      try {
        const requestOriginTime = Date.now()

        const {result} = await (
          await fetch('https://api.idena.io/api/now')
        ).json()
        const serverTime = new Date(result)

        setWrongClientTime(
          ntp(requestOriginTime, serverTime, serverTime, Date.now()).offset >
            TIME_DRIFT_THRESHOLD
        )
      } catch (error) {
        console.error('An error occured while fetching time API')
      }
    },
    1000 * 60 * 5,
    true
  )

  React.useEffect(() => {
    if (wrongClientTime)
      toast({
        duration: null,
        // eslint-disable-next-line react/display-name
        render: toastProps => (
          <Toast
            status="error"
            title={t('Please check your local clock')}
            description={t('The time must be synchronized with internet time')}
            actionContent={t('Okay')}
            onAction={() => {
              toastProps.onClose()
              window.open('https://time.is/', '_blank')
            }}
          />
        ),
      })
  }, [t, toast, wrongClientTime])

  return <TimingStateContext.Provider value={timing} {...props} />
}

export function useTimingState() {
  const context = React.useContext(TimingStateContext)
  if (context === undefined) {
    throw new Error('useTimingState must be used within a TimingProvider')
  }
  return context
}
