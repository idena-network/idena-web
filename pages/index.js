import React, {useEffect} from 'react'
import {Box, Icon, Stack} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import {useQuery, useQueryClient} from 'react-query'
import {Page, PageTitle} from '../screens/app/components'
import {
  UserInlineCard,
  SimpleUserStat,
  UserStatList,
  UserStat,
  UserStatLabel,
  UserStatValue,
  AnnotatedUserStat,
  ActivateInviteForm,
  ValidationResultToast,
  ActivateMiningForm,
} from '../screens/profile/components'
import Layout from '../shared/components/layout'
import {IdentityStatus} from '../shared/types'
import {
  toPercent,
  toLocaleDna,
  mapIdentityToFriendlyStatus,
} from '../shared/utils/utils'
import {hasPersistedValidationResults} from '../screens/validation/utils'
import {IconLink} from '../shared/components/link'
import {useIdentity} from '../shared/providers/identity-context'
import {useEpoch} from '../shared/providers/epoch-context'
import {fetchBalance} from '../shared/api/wallet'
import {useAuthState} from '../shared/providers/auth-context'

export default function ProfilePage() {
  const queryClient = useQueryClient()

  const {
    t,
    i18n: {language},
  } = useTranslation()

  const [
    {
      address,
      state,
      penalty,
      age,
      totalShortFlipPoints,
      totalQualifiedFlips,
      online,
      delegatee,
      delegationEpoch,
      canMine,
    },
  ] = useIdentity()

  const epoch = useEpoch()
  const {privateKey} = useAuthState()

  const [showValidationResults, setShowValidationResults] = React.useState()

  const {
    data: {balance, stake},
  } = useQuery(['get-balance', address], () => fetchBalance(address), {
    initialData: {balance: 0, stake: 0},
    enabled: !!address,
    refetchInterval: 30 * 1000,
  })

  useEffect(() => {
    if (epoch) {
      const {epoch: epochNumber} = epoch
      if (epochNumber) {
        queryClient.invalidateQueries('get-balance')
        setShowValidationResults(hasPersistedValidationResults(epochNumber))
      }
    }
  }, [epoch, queryClient])

  const toDna = toLocaleDna(language)

  return (
    <Layout>
      <Page>
        <PageTitle mb={8}>{t('Profile')}</PageTitle>
        <Stack isInline spacing={10}>
          <Stack spacing={6}>
            <UserInlineCard address={address} state={state} />
            <UserStatList>
              <SimpleUserStat label={t('Address')} value={address} />
              {state === IdentityStatus.Newbie ? (
                <AnnotatedUserStat
                  annotation={t('Solve more than 12 flips to become Verified')}
                  label={t('Status')}
                  value={mapIdentityToFriendlyStatus(state)}
                />
              ) : (
                <SimpleUserStat
                  label={t('Status')}
                  value={mapIdentityToFriendlyStatus(state)}
                />
              )}
              <UserStat>
                <UserStatLabel>{t('Balance')}</UserStatLabel>
                <UserStatValue>{toDna(balance)}</UserStatValue>
              </UserStat>
              {stake > 0 && state === IdentityStatus.Newbie && (
                <Stack spacing={4}>
                  <AnnotatedUserStat
                    annotation={t(
                      'You need to get Verified status to be able to terminate your identity and withdraw the stake'
                    )}
                    label={t('Stake')}
                    value={toDna(stake * 0.25)}
                  />
                  <AnnotatedUserStat
                    annotation={t(
                      'You need to get Verified status to get the locked funds into the normal wallet'
                    )}
                    label={t('Locked')}
                    value={toDna(stake * 0.75)}
                  />
                </Stack>
              )}

              {stake > 0 && state !== IdentityStatus.Newbie && (
                <AnnotatedUserStat
                  annotation={t(
                    'In order to withdraw the stake you have to terminate your identity'
                  )}
                  label={t('Stake')}
                  value={toDna(stake)}
                />
              )}

              {penalty > 0 && (
                <AnnotatedUserStat
                  annotation={t(
                    "Your node was offline more than 1 hour. The penalty will be charged automaically. Once it's fully paid you'll continue to mine coins."
                  )}
                  label={t('Mining penalty')}
                  value={toDna(penalty)}
                />
              )}

              {age > 0 && <SimpleUserStat label="Age" value={age} />}

              {epoch && (
                <SimpleUserStat
                  label={t('Next validation')}
                  value={new Date(epoch.nextValidation).toLocaleString()}
                />
              )}

              {totalQualifiedFlips > 0 && (
                <AnnotatedUserStat
                  annotation={t('Total score for all validations')}
                  label={t('Total score')}
                >
                  <UserStatValue>
                    {totalShortFlipPoints} out of {totalQualifiedFlips} (
                    {toPercent(totalShortFlipPoints / totalQualifiedFlips)})
                  </UserStatValue>
                </AnnotatedUserStat>
              )}
            </UserStatList>
            <ActivateInviteForm />
          </Stack>
          <Stack spacing={10} w={48}>
            <Box mt={2} minH={62}>
              {address && privateKey && canMine && (
                <ActivateMiningForm
                  privateKey={privateKey}
                  isOnline={online}
                  delegatee={delegatee}
                  delegationEpoch={delegationEpoch}
                />
              )}
            </Box>
            <Stack spacing={1} align="flex-start">
              <IconLink href="/flips/new" icon={<Icon name="photo" size={5} />}>
                {t('New flip')}
              </IconLink>
            </Stack>
          </Stack>
        </Stack>

        {showValidationResults && <ValidationResultToast epoch={epoch.epoch} />}
      </Page>
    </Layout>
  )
}
