import React, {useEffect} from 'react'
import {
  Box,
  Heading,
  PopoverTrigger,
  Stack,
  Text,
  Button,
  useBreakpointValue,
  useClipboard,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useQuery, useQueryClient} from 'react-query'
import {useRouter} from 'next/router'
import {Page, PageTitle} from '../screens/app/components'
import {
  UserInlineCard,
  UserStatList,
  UserStatistics,
  ActivateInviteForm,
  ValidationResultToast,
  ActivateMiningForm,
  KillForm,
  AnnotatedUserStatistics,
  WideLink,
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
import {IconButton} from '../shared/components/button'
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
  CopyIcon,
  DeleteIcon,
  OpenExplorerIcon,
  PhotoIcon,
  TelegramIcon,
  TestValidationIcon,
} from '../shared/components/icons'
import {useSuccessToast} from '../shared/hooks/use-toast'
import Flex from '../shared/components/flex'

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
  const userStatAddress = useBreakpointValue([
    address ? `${address.substr(0, 3)}...${address.substr(-4, 4)}` : '',
    address,
  ])

  const [showValidationResults, setShowValidationResults] = React.useState()

  const {onCopy, hasCopied} = useClipboard(address)
  const successToast = useSuccessToast()

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
      isOpenActivateInvitePopover ||
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
    isOpenActivateInvitePopover,
    onCloseActivateInvitePopover,
    onOpenActivateInvitePopover,
    scrollToActivateInvite,
  ])

  return (
    <Layout canRedirect={!dnaUrl}>
      <Page>
        <PageTitle mb={8} display={['none', 'block']}>
          {t('Profile')}
        </PageTitle>
        <Stack direction={['column', 'row']} spacing={[0, 10]}>
          <Stack
            spacing={[1, 8]}
            w={['311px', '480px']}
            align={['center', 'initial']}
            ref={activateInviteRef}
          >
            <UserInlineCard address={coinbase} state={state} h={['auto', 24]} />
            {canActivateInvite && (
              <Box w={['100%', 'initial']} pb={[8, 0]}>
                <OnboardingPopover
                  isOpen={isOpenActivateInvitePopover}
                  placement="bottom"
                >
                  <PopoverTrigger>
                    <Stack
                      spacing={6}
                      bg="white"
                      borderRadius="lg"
                      boxShadow={[
                        'none',
                        '0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)',
                      ]}
                      px={[0, 10]}
                      py={[0, 8]}
                      pos="relative"
                      zIndex="docked"
                    >
                      <Stack display={['none', 'flex']}>
                        <Heading as="h3" fontWeight={500} fontSize="lg">
                          {state === IdentityStatus.Invite
                            ? t('Congratulations!')
                            : t('Join the upcoming validation')}
                        </Heading>
                        <Text color="muted">
                          {state === IdentityStatus.Invite
                            ? t(
                                'You have been invited to join the upcoming validation ceremony. Click the button below to accept the invitation.'
                              )
                            : t(
                                'To take part in the validation, you need an invitation code. Invitations can be provided by validated identities.'
                              )}
                        </Text>
                      </Stack>
                      <Box>
                        <ActivateInviteForm
                          onHowToGetInvitation={onOpenActivateInvitePopover}
                        />
                      </Box>
                    </Stack>
                  </PopoverTrigger>
                  <OnboardingPopoverContent
                    gutter={10}
                    title={t('How to get an invitation code')}
                    zIndex={2}
                    onDismiss={() => {
                      dismissCurrentTask()
                      onCloseActivateInvitePopover()
                    }}
                  >
                    <Stack spacing={5}>
                      <Stack>
                        <Text fontSize="sm">
                          {t(
                            '1. Join the official Idena public Telegram group and follow instructions in the pinned message.'
                          )}
                        </Text>
                        <OnboardingPopoverContentIconRow
                          icon={<TelegramIcon boxSize={5} />}
                          _hover={{
                            bg: '#689aff',
                          }}
                          px={4}
                          py={2}
                          cursor="pointer"
                          onClick={() => {
                            const win = openExternalUrl(
                              'https://t.me/IdenaNetworkPublic'
                            )
                            win.focus()
                          }}
                          borderRadius="lg"
                        >
                          <Box>
                            <Text p={0} py={0} h={18} fontSize="md">
                              https://t.me/IdenaNetworkPublic
                            </Text>
                            <Text
                              fontSize="sm"
                              color="rgba(255, 255, 255, 0.56)"
                            >
                              {t('Official group')}
                            </Text>
                          </Box>
                        </OnboardingPopoverContentIconRow>
                        <Text fontSize="sm">
                          {t(
                            '2. Pass the training validation and get a certificate which you can provide to a validated member to get an invitation code'
                          )}
                        </Text>
                        <OnboardingPopoverContentIconRow
                          icon={
                            <TestValidationIcon boxSize={5} color="white" />
                          }
                          _hover={{
                            bg: '#689aff',
                          }}
                          px={4}
                          py={2}
                          cursor="pointer"
                          onClick={() => router.push('/try')}
                          borderRadius="lg"
                        >
                          <Box>
                            <Text p={0} py={0} h={18} fontSize="md">
                              {t('Test yourself')}
                            </Text>
                            <Text
                              fontSize="sm"
                              color="rgba(255, 255, 255, 0.56)"
                            >
                              {t('Training validation')}
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
                <>
                  <WideLink
                    display={['initial', 'none']}
                    pt={5}
                    pb={3}
                    label="Open in blockchain explorer"
                    href={`https://scan.idena.io/address/${address}`}
                  >
                    <Box
                      boxSize={8}
                      backgroundColor="brandBlue.10"
                      borderRadius="10px"
                    >
                      <OpenExplorerIcon boxSize={5} mt="6px" ml="6px" />
                    </Box>
                  </WideLink>

                  <UserStatList title={t('Profile')}>
                    {age >= 0 && (
                      <UserStatistics label={t('Age')} value={age} />
                    )}

                    {penalty > 0 && (
                      <AnnotatedUserStatistics
                        annotation={t(
                          "Your node was offline more than 1 hour. The penalty will be charged automatically. Once it's fully paid you'll continue to mine coins."
                        )}
                        label={t('Mining penalty')}
                        value={toDna(penalty)}
                      />
                    )}

                    {totalQualifiedFlips > 0 && (
                      <AnnotatedUserStatistics
                        annotation={t(
                          'Total score for the last 10 validations'
                        )}
                        label={t('Total score')}
                      >
                        <Box fontWeight={['500', 'auto']}>
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
                        </Box>
                      </AnnotatedUserStatistics>
                    )}

                    {stake > 0 && (
                      <AnnotatedUserStatistics
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
                      <AnnotatedUserStatistics
                        annotation={t(
                          'You need to get Verified status to get the locked funds into the normal wallet'
                        )}
                        label={t('Locked')}
                        value={toDna(stake * 0.75)}
                      />
                    )}
                  </UserStatList>
                </>
              )}
            <UserStatList title={t('Wallets')}>
              <UserStatistics label={t('Address')} value={userStatAddress}>
                <ExternalLink
                  display={['none', 'initial']}
                  href={`https://scan.idena.io/address/${address}`}
                >
                  {t('Open in blockchain explorer')}
                </ExternalLink>
                <CopyIcon
                  display={['inline', 'none']}
                  mt="3px"
                  ml="-100px"
                  boxSize={4}
                  fill="#96999e"
                  onClick={() => {
                    onCopy()
                    successToast({
                      title: 'Address copied!',
                      duration: '5000',
                    })
                  }}
                />
              </UserStatistics>

              <UserStatistics label={t('Balance')} value={toDna(balance)}>
                <TextLink display={['none', 'initial']} href="/wallets">
                  <Stack isInline spacing={0} align="center" fontWeight={500}>
                    <Text as="span">{t('Send')}</Text>
                    <ChevronDownIcon boxSize={4} transform="rotate(-90deg)" />
                  </Stack>
                </TextLink>
              </UserStatistics>

              <Button
                display={['initial', 'none']}
                onClick={() => router.push('/wallets')}
                w="100%"
                h={10}
                fontSize="15px"
                variant="outline"
                color="blue.500"
                border="none"
                borderColor="transparent"
              >
                Send iDNA
              </Button>
            </UserStatList>
          </Stack>
          <Stack spacing={[0, 10]} w={['100%', 200]}>
            <Box minH={62} mt={[1, 6]}>
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
                    borderRadius={['mdx', 'md']}
                    p={[0, 2]}
                    m={[0, -2]}
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
            <Stack spacing={[0, 1]} align="flex-start">
              <WideLink
                mt={[0, '2px']}
                label={t('Training validation')}
                onClick={() => router.push('/try')}
              >
                <Box
                  boxSize={[8, 5]}
                  backgroundColor={['brandBlue.10', 'initial']}
                  borderRadius="10px"
                >
                  <TestValidationIcon
                    color="blue.500"
                    boxSize={5}
                    mt={['6px', 0]}
                    ml={['6px', 0]}
                  />
                </Box>
              </WideLink>
              <WideLink
                label={t('New flip')}
                onClick={() => router.push('/flips/new')}
              >
                <Box
                  boxSize={[8, 5]}
                  backgroundColor={['brandBlue.10', 'initial']}
                  borderRadius="10px"
                >
                  <PhotoIcon
                    color="blue.500"
                    boxSize={5}
                    mt={['6px', 0]}
                    ml={['6px', 0]}
                  />
                </Box>
              </WideLink>
              <WideLink
                label={t('Invite')}
                onClick={() => router.push('/contacts?new')}
                isDisabled={!canInvite}
              >
                <Box
                  boxSize={[8, 5]}
                  backgroundColor={['brandBlue.10', 'initial']}
                  borderRadius="10px"
                >
                  <AddUserIcon
                    color="blue.500"
                    boxSize={5}
                    mt={['6px', 0]}
                    ml={['6px', 0]}
                  />
                </Box>
              </WideLink>
              <WideLink
                label={t('Terminate')}
                onClick={onOpenKillForm}
                isDisabled={!canTerminate}
              >
                <Box
                  boxSize={[8, 5]}
                  backgroundColor={['brandBlue.10', 'initial']}
                  borderRadius="10px"
                >
                  <DeleteIcon
                    color="blue.500"
                    boxSize={5}
                    mt={['6px', 0]}
                    ml={['6px', 0]}
                  />
                </Box>
              </WideLink>
            </Stack>
          </Stack>
        </Stack>

        <KillForm isOpen={isOpenKillForm} onClose={onCloseKillForm}></KillForm>

        {showValidationResults && epoch && (
          <ValidationResultToast epoch={epoch.epoch} />
        )}

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
