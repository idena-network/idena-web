import React, {useEffect} from 'react'
import {
  Box,
  Heading,
  PopoverTrigger,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useQuery, useQueryClient} from 'react-query'
import {useRouter} from 'next/router'
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
  KillForm,
} from '../screens/profile/components'
import Layout from '../shared/components/layout'
import {IdentityStatus, OnboardingStep} from '../shared/types'
import {
  toPercent,
  toLocaleDna,
  eitherState,
  openExternalUrl,
} from '../shared/utils/utils'
import {hasPersistedValidationResults} from '../screens/validation/utils'
import {useIdentity} from '../shared/providers/identity-context'
import {useEpoch} from '../shared/providers/epoch-context'
import {fetchBalance} from '../shared/api/wallet'
import {useAuthState} from '../shared/providers/auth-context'
import {IconButton, PrimaryButton} from '../shared/components/button'
import {validDnaUrl} from '../shared/utils/dna-link'
import {DnaSignInDialog} from '../screens/dna/containers'
import {ExternalLink, TextLink, Toast} from '../shared/components/components'
import {useOnboarding} from '../shared/providers/onboarding-context'
import {
  OnboardingPopover,
  OnboardingPopoverContent,
  OnboardingPopoverContentIconRow,
} from '../shared/components/onboarding'
import {onboardingShowingStep} from '../shared/utils/onboarding'
import {useScroll} from '../shared/hooks/use-scroll'
import {
  AddUserIcon,
  ChevronDownIcon,
  DeleteIcon,
  PhotoIcon,
} from '../shared/components/icons'

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
      canInvite,
      canTerminate,
      canActivateInvite,
    },
  ] = useIdentity()

  const router = useRouter()

  const epoch = useEpoch()
  const {coinbase, privateKey} = useAuthState()

  const [showValidationResults, setShowValidationResults] = React.useState()

  const {
    isOpen: isOpenKillForm,
    onOpen: onOpenKillForm,
    onClose: onCloseKillForm,
  } = useDisclosure()

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

  const {
    isOpen: isOpenDnaSignInDialog,
    onOpen: onOpenDnaSignInDialog,
    onClose: onCloseDnaSignInDialog,
  } = useDisclosure()

  const [dnaUrl, setDnaUrl] = React.useState(() =>
    typeof window !== 'undefined'
      ? JSON.parse(sessionStorage.getItem('dnaUrl'))
      : null
  )

  React.useEffect(() => {
    if (dnaUrl && validDnaUrl(dnaUrl.route)) {
      onOpenDnaSignInDialog()
    } else {
      sessionStorage.removeItem('dnaUrl')
      onCloseDnaSignInDialog()
    }
  }, [dnaUrl, onCloseDnaSignInDialog, onOpenDnaSignInDialog])

  const toast = useToast()

  const toDna = toLocaleDna(language)

  const [
    currentOnboarding,
    {dismissCurrentTask, next: nextOnboardingTask},
  ] = useOnboarding()

  const eitherOnboardingState = (...states) =>
    eitherState(currentOnboarding, ...states)

  const {
    isOpen: isOpenActivateInvitePopover,
    onOpen: onOpenActivateInvitePopover,
    onClose: onCloseActivateInvitePopover,
  } = useDisclosure()

  const activateInviteRef = React.useRef()

  const {scrollTo: scrollToActivateInvite} = useScroll(activateInviteRef)

  React.useEffect(() => {
    if (
      eitherState(
        currentOnboarding,
        onboardingShowingStep(OnboardingStep.ActivateInvite)
      )
    ) {
      scrollToActivateInvite()
      onOpenActivateInvitePopover()
    } else onCloseActivateInvitePopover()
  }, [
    currentOnboarding,
    onCloseActivateInvitePopover,
    onOpenActivateInvitePopover,
    scrollToActivateInvite,
  ])

  return (
    <Layout canRedirect={!dnaUrl}>
      <Page>
        <PageTitle mb={8}>{t('Profile')}</PageTitle>
        <Stack isInline spacing={10}>
          <Stack spacing={8} w="md" ref={activateInviteRef}>
            <UserInlineCard address={coinbase} state={state} h={24} />
            {canActivateInvite && (
              <Box>
                <OnboardingPopover
                  isOpen={isOpenActivateInvitePopover}
                  placement="top-start"
                >
                  <PopoverTrigger>
                    <Stack
                      spacing={6}
                      bg="white"
                      borderRadius="lg"
                      boxShadow="0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)"
                      px={10}
                      py={8}
                      pos="relative"
                      zIndex="docked"
                    >
                      <Stack>
                        <Heading as="h3" fontWeight={500} fontSize="lg">
                          {t('Join the upcoming validation')}
                        </Heading>
                        <Text color="muted">
                          {state === IdentityStatus.Invite
                            ? t(
                                'You have been invited to join the upcoming validation ceremony. Click the button below to accept the invitation.'
                              )
                            : t(
                                'To quickly get an invite code, we recommend that you get a certificate of trust by passing a test validation'
                              )}
                        </Text>
                      </Stack>
                      <Box>
                        <ActivateInviteForm />
                      </Box>
                    </Stack>
                  </PopoverTrigger>
                  <OnboardingPopoverContent
                    gutter={10}
                    title={t('Enter invitation code')}
                    zIndex={2}
                    onDismiss={() => {
                      dismissCurrentTask()
                      onCloseActivateInvitePopover()
                    }}
                  >
                    <Stack spacing={5}>
                      <Stack>
                        <Text>
                          {t(
                            `An invitation can be provided by validated participants.`
                          )}
                        </Text>
                        <Text>
                          {t(`Join the official Idena public Telegram group and follow instructions in the
                pinned message.`)}
                        </Text>
                        <OnboardingPopoverContentIconRow icon="telegram">
                          <Box>
                            <PrimaryButton
                              variant="unstyled"
                              p={0}
                              py={0}
                              h={18}
                              onClick={() => {
                                const win = openExternalUrl(
                                  'https://t.me/IdenaNetworkPublic'
                                )
                                win.focus()
                              }}
                            >
                              https://t.me/IdenaNetworkPublic
                            </PrimaryButton>
                            <Text
                              fontSize="sm"
                              color="rgba(255, 255, 255, 0.56)"
                            >
                              {t('Official group')}
                            </Text>
                          </Box>
                        </OnboardingPopoverContentIconRow>
                      </Stack>
                    </Stack>
                  </OnboardingPopoverContent>
                </OnboardingPopover>
              </Box>
            )}
            {state &&
              ![
                IdentityStatus.Undefined,
                IdentityStatus.Invite,
                IdentityStatus.Candidate,
              ].includes(state) && (
                <UserStatList title={t('Profile')}>
                  {age >= 0 && <SimpleUserStat label={t('Age')} value={age} />}

                  {penalty > 0 && (
                    <AnnotatedUserStat
                      annotation={t(
                        "Your node was offline more than 1 hour. The penalty will be charged automatically. Once it's fully paid you'll continue to mine coins."
                      )}
                      label={t('Mining penalty')}
                      value={toDna(penalty)}
                    />
                  )}

                  {totalQualifiedFlips > 0 && (
                    <AnnotatedUserStat
                      annotation={t('Total score for the last 10 validations')}
                      label={t('Total score')}
                    >
                      <UserStatValue>
                        {t(
                          '{{shortFlipPoints}} out of {{qualifiedFlips}} ({{score}})',
                          {
                            shortFlipPoints: Math.min(
                              totalShortFlipPoints,
                              totalQualifiedFlips
                            ),
                            qualifiedFlips: totalQualifiedFlips,
                            score: toPercent(
                              totalShortFlipPoints / totalQualifiedFlips
                            ),
                          }
                        )}
                      </UserStatValue>
                    </AnnotatedUserStat>
                  )}

                  {stake > 0 && (
                    <AnnotatedUserStat
                      annotation={t(
                        'You need to get Verified status to be able to terminate your identity and withdraw the stake'
                      )}
                      label={t('Stake')}
                      value={toDna(
                        stake * (state === IdentityStatus.Newbie ? 0.25 : 1)
                      )}
                    />
                  )}

                  {stake > 0 && state === IdentityStatus.Newbie && (
                    <AnnotatedUserStat
                      annotation={t(
                        'You need to get Verified status to get the locked funds into the normal wallet'
                      )}
                      label={t('Locked')}
                      value={toDna(stake * 0.75)}
                    />
                  )}
                </UserStatList>
              )}
            <UserStatList title={t('Wallets')}>
              <UserStat>
                <UserStatLabel>{t('Address')}</UserStatLabel>
                <UserStatValue>{address}</UserStatValue>
                <ExternalLink href={`https://scan.idena.io/address/${address}`}>
                  {t('Open in blockhain explorer')}
                </ExternalLink>
              </UserStat>

              <UserStat>
                <UserStatLabel>{t('Balance')}</UserStatLabel>
                <UserStatValue>{toDna(balance)}</UserStatValue>
                <TextLink href="/wallets">
                  <Stack isInline spacing={0} align="center" fontWeight={500}>
                    <Text as="span">{t('Send')}</Text>
                    <ChevronDownIcon boxSize={4} transform="rotate(-90deg)" />
                  </Stack>
                </TextLink>
              </UserStat>
            </UserStatList>
          </Stack>
          <Stack spacing={10} w={48}>
            <Box minH={62} mt={4}>
              <OnboardingPopover
                isOpen={eitherOnboardingState(
                  onboardingShowingStep(OnboardingStep.ActivateMining)
                )}
              >
                <PopoverTrigger>
                  <Box
                    bg="white"
                    position={
                      eitherOnboardingState(
                        onboardingShowingStep(OnboardingStep.ActivateMining)
                      )
                        ? 'relative'
                        : 'initial'
                    }
                    borderRadius="md"
                    p={2}
                    m={-2}
                    zIndex={2}
                  >
                    {address && privateKey && canMine && (
                      <ActivateMiningForm
                        privateKey={privateKey}
                        isOnline={online}
                        delegatee={delegatee}
                        delegationEpoch={delegationEpoch}
                        onShow={nextOnboardingTask}
                      />
                    )}
                  </Box>
                </PopoverTrigger>
                <OnboardingPopoverContent
                  title={t('Activate mining status')}
                  onDismiss={nextOnboardingTask}
                >
                  <Text>
                    {t(
                      `To become a validator of Idena blockchain you can activate your mining status. Keep your node online to mine iDNA coins.`
                    )}
                  </Text>
                </OnboardingPopoverContent>
              </OnboardingPopover>
            </Box>
            <Stack spacing={1} align="flex-start">
              <IconButton
                onClick={() => router.push('/flips/new')}
                icon={<PhotoIcon boxSize={5} />}
              >
                {t('New flip')}
              </IconButton>
              <IconButton
                onClick={() => router.push('/contacts?new')}
                isDisabled={!canInvite}
                icon={<AddUserIcon boxSize={5} />}
              >
                {t('Invite')}
              </IconButton>
              <IconButton
                isDisabled={!canTerminate}
                icon={<DeleteIcon boxSize={5} />}
                onClick={onOpenKillForm}
              >
                {t('Terminate')}
              </IconButton>
            </Stack>
          </Stack>
        </Stack>

        <KillForm isOpen={isOpenKillForm} onClose={onCloseKillForm}></KillForm>

        {showValidationResults && <ValidationResultToast epoch={epoch.epoch} />}

        {dnaUrl && (
          <DnaSignInDialog
            isOpen={isOpenDnaSignInDialog}
            query={dnaUrl?.query}
            onDone={() => setDnaUrl('')}
            onError={error =>
              toast({
                status: 'error',
                // eslint-disable-next-line react/display-name
                render: () => <Toast status="error" title={error} />,
              })
            }
            onClose={onCloseDnaSignInDialog}
          />
        )}
      </Page>
    </Layout>
  )
}
