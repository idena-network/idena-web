/* eslint-disable no-nested-ternary */
import React, {useEffect} from 'react'
import {
  Box,
  PopoverTrigger,
  Stack,
  Text,
  Button,
  useBreakpointValue,
  useClipboard,
  useDisclosure,
  Flex,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useQuery, useQueryClient} from 'react-query'
import {useRouter} from 'next/router'
import {Page} from '../../screens/app/components'
import {
  UserInlineCard,
  UserStatList,
  UserStatistics,
  ActivateMiningForm,
  KillForm,
  AnnotatedUserStatistics,
  WideLink,
  MyIdenaBotAlert,
  ActivateInvitationPanel,
  AcceptInvitationPanel,
  StartIdenaJourneyPanel,
  AcceptInviteOnboardingContent,
  ActivateInviteOnboardingContent,
  StartIdenaJourneyOnboardingContent,
  ActivateInvitationDialog,
  UserStat,
  UserStatLabel,
  UserStatValue,
  ReplenishStakeDrawer,
  StakingAlert,
} from '../../screens/home/components'
import Layout from '../../shared/components/layout'
import {IdentityStatus, OnboardingStep} from '../../shared/types'
import {toPercent, toLocaleDna, eitherState} from '../../shared/utils/utils'
import {useIdentity} from '../../shared/providers/identity-context'
import {useEpoch} from '../../shared/providers/epoch-context'
import {fetchBalance} from '../../shared/api/wallet'
import {useAuthState} from '../../shared/providers/auth-context'
import {ExternalLink, TextLink} from '../../shared/components/components'
import {useOnboarding} from '../../shared/providers/onboarding-context'
import {
  OnboardingPopover,
  OnboardingPopoverContent,
} from '../../shared/components/onboarding'
import {onboardingShowingStep} from '../../shared/utils/onboarding'
import {useScroll} from '../../shared/hooks/use-scroll'
import {
  AddUserIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  DeleteIcon,
  OpenExplorerIcon,
  PhotoIcon,
  TestValidationIcon,
} from '../../shared/components/icons'
import {useFailToast, useSuccessToast} from '../../shared/hooks/use-toast'
import {isValidDnaUrl} from '../../screens/dna/utils'
import {
  useIdenaBot,
  useStakingApy,
  useValidationResults,
} from '../../screens/home/hooks'
import {ValidationReportSummary} from '../../screens/validation-report/components'

export default function ProfilePage() {
  const queryClient = useQueryClient()

  const {
    t,
    i18n: {language},
  } = useTranslation()

  const [identity] = useIdentity()

  const {
    address,
    state,
    online,
    delegatee,
    delegationEpoch,
    pendingUndelegation,
    canMine,
    canInvite,
    canTerminate,
    canActivateInvite,
  } = identity

  const router = useRouter()

  const epoch = useEpoch()
  const {privateKey} = useAuthState()
  const userStatAddress = useBreakpointValue([
    address ? `${address.substr(0, 3)}...${address.substr(-4, 4)}` : '',
    address,
  ])

  const [showValidationResults, setShowValidationResults] = React.useState()

  const {onCopy} = useClipboard(address)
  const successToast = useSuccessToast()

  const {
    isOpen: isOpenKillForm,
    onOpen: onOpenKillForm,
    onClose: onCloseKillForm,
  } = useDisclosure()

  const {
    data: {balance, stake, replenishedStake},
  } = useQuery(['get-balance', address], () => fetchBalance(address), {
    initialData: {balance: 0, stake: 0, replenishedStake: 0},
    enabled: !!address,
    refetchInterval: 30 * 1000,
  })

  const [validationResultSeen, setValidationResultSeen] = useValidationResults()

  useEffect(() => {
    if (epoch) {
      const {epoch: epochNumber} = epoch
      if (epochNumber) {
        queryClient.invalidateQueries('get-balance')
        setShowValidationResults(!validationResultSeen)
      }
    }
  }, [epoch, queryClient, validationResultSeen])

  const [dnaUrl] = React.useState(() =>
    typeof window !== 'undefined'
      ? JSON.parse(sessionStorage.getItem('dnaUrl'))
      : null
  )

  React.useEffect(() => {
    if (dnaUrl) {
      if (isValidDnaUrl(dnaUrl.route))
        router.push({pathname: dnaUrl.route, query: dnaUrl.query})
      sessionStorage.removeItem('dnaUrl')
    }
  }, [dnaUrl, router])

  const toDna = toLocaleDna(language, {maximumFractionDigits: 4})

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

  const activateInviteDisclosure = useDisclosure()

  const activateInviteRef = React.useRef()

  const {scrollTo: scrollToActivateInvite} = useScroll(activateInviteRef)

  React.useEffect(() => {
    if (
      isOpenActivateInvitePopover ||
      eitherState(
        currentOnboarding,
        onboardingShowingStep(OnboardingStep.StartTraining),
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

  const canSubmitFlip = [
    IdentityStatus.Verified,
    IdentityStatus.Human,
    IdentityStatus.Newbie,
  ].includes(state)

  const [didConnectIdenaBot, connectIdenaBot] = useIdenaBot()

  const shouldStartIdenaJourney = currentOnboarding.matches(
    OnboardingStep.StartTraining
  )
  const onboardingPopoverPlacement = useBreakpointValue(['top', 'bottom'])

  const replenishStakeDisclosure = useDisclosure()

  const {onOpen: onOpenReplenishStakeDisclosure} = replenishStakeDisclosure

  React.useEffect(() => {
    if (Object.keys(router.query).find(q => q === 'replenishStake')) {
      onOpenReplenishStakeDisclosure()
      router.push('/home')
    }
  }, [onOpenReplenishStakeDisclosure, router])

  const failToast = useFailToast()

  const toast = useSuccessToast()

  const stakingApy = useStakingApy()

  return (
    <Layout canRedirect={!dnaUrl} didConnectIdenaBot={didConnectIdenaBot}>
      {!didConnectIdenaBot && <MyIdenaBotAlert onConnect={connectIdenaBot} />}

      <Page pt="10">
        <Stack
          w={['100%', '480px']}
          direction={['column', 'row']}
          spacing={[0, 10]}
        >
          <Box>
            <Stack
              spacing={[1, 8]}
              w={['100%', '480px']}
              align={['center', 'initial']}
              ref={activateInviteRef}
            >
              <UserInlineCard
                identity={identity}
                h={['auto', 24]}
                mb={[8, 0]}
              />
              {canActivateInvite && (
                <Box w={['100%', 'initial']} pb={[8, 0]}>
                  <OnboardingPopover
                    isOpen={isOpenActivateInvitePopover}
                    placement={onboardingPopoverPlacement}
                  >
                    <PopoverTrigger>
                      {shouldStartIdenaJourney ? (
                        <StartIdenaJourneyPanel
                          onHasActivationCode={activateInviteDisclosure.onOpen}
                        />
                      ) : state === IdentityStatus.Invite ? (
                        <AcceptInvitationPanel />
                      ) : (
                        <ActivateInvitationPanel />
                      )}
                    </PopoverTrigger>
                    {shouldStartIdenaJourney ? (
                      <StartIdenaJourneyOnboardingContent
                        onDismiss={() => {
                          dismissCurrentTask()
                          onCloseActivateInvitePopover()
                        }}
                      />
                    ) : state === IdentityStatus.Invite ? (
                      <AcceptInviteOnboardingContent
                        onDismiss={() => {
                          dismissCurrentTask()
                          onCloseActivateInvitePopover()
                        }}
                      />
                    ) : (
                      <ActivateInviteOnboardingContent
                        onDismiss={() => {
                          dismissCurrentTask()
                          onCloseActivateInvitePopover()
                        }}
                      />
                    )}
                  </OnboardingPopover>
                </Box>
              )}

              {showValidationResults && (
                <ValidationReportSummary
                  onClose={() => setValidationResultSeen()}
                />
              )}

              <UserStatList title={t('My Wallet')}>
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
                    ml="4px"
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
                  onClick={() => {
                    router.push('/wallets')
                  }}
                  w="100%"
                  h={10}
                  fontSize="15px"
                  variant="outline"
                  color="blue.500"
                  border="none"
                  borderColor="transparent"
                >
                  {t('Send iDNA')}
                </Button>
              </UserStatList>

              {Boolean(state) && state !== IdentityStatus.Undefined && (
                <UserStatList title={t('Stake')}>
                  <Flex>
                    <Stack spacing="5px" flex={1}>
                      <UserStat>
                        <Stack spacing="3px">
                          <UserStatLabel lineHeight="4">
                            {t('Balance')}
                          </UserStatLabel>
                          <UserStatValue lineHeight="4">
                            {toDna(
                              state === IdentityStatus.Newbie
                                ? (stake - (replenishedStake ?? 0)) * 0.25
                                : stake
                            )}
                          </UserStatValue>
                        </Stack>
                      </UserStat>
                      <Button
                        variant="link"
                        color="blue.500"
                        fontWeight={500}
                        lineHeight="4"
                        w="fit-content"
                        _hover={{
                          background: 'transparent',
                          textDecoration: 'underline',
                        }}
                        _focus={{
                          outline: 'none',
                        }}
                        onClick={replenishStakeDisclosure.onOpen}
                      >
                        {t('Add stake')}
                        <ChevronRightIcon boxSize="4" />
                      </Button>
                    </Stack>
                    <Stack spacing="5px" flex={1}>
                      <UserStat>
                        <Stack spacing="3px">
                          <UserStatLabel lineHeight="4">
                            {t('APY')}
                          </UserStatLabel>
                          <UserStatValue lineHeight="4">
                            {stakingApy > 0 ? toPercent(stakingApy) : '--'}
                          </UserStatValue>
                        </Stack>
                      </UserStat>
                      <ExternalLink href="https://idena.io/staking">
                        {t('Staking calculator')}
                      </ExternalLink>
                    </Stack>
                  </Flex>

                  {stake > 0 && state === IdentityStatus.Newbie && (
                    <AnnotatedUserStatistics
                      annotation={t(
                        'You need to get Verified status to get the locked funds into the normal wallet'
                      )}
                      label={t('Locked')}
                      value={toDna((stake - (replenishedStake ?? 0)) * 0.75)}
                    />
                  )}
                </UserStatList>
              )}
            </Stack>
            <StakingAlert mt="2" />
          </Box>

          <Stack spacing={[0, 10]} flexShrink={0} w={['100%', 200]}>
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
                        pendingUndelegation={pendingUndelegation}
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
                display={['initial', 'none']}
                label="Open in blockchain explorer"
                href={`https://scan.idena.io/address/${address}`}
                isNewTab
              >
                <Box
                  boxSize={8}
                  backgroundColor="brandBlue.10"
                  borderRadius="10px"
                >
                  <OpenExplorerIcon boxSize={5} mt="6px" ml="6px" />
                </Box>
              </WideLink>
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
                isDisabled={!canSubmitFlip}
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

        <ActivateInvitationDialog {...activateInviteDisclosure} />

        <ReplenishStakeDrawer
          {...replenishStakeDisclosure}
          onSuccess={React.useCallback(
            hash => {
              toast({
                title: t('Transaction sent'),
                description: hash,
              })
              replenishStakeDisclosure.onClose()
            },
            [replenishStakeDisclosure, t, toast]
          )}
          onError={failToast}
        />
      </Page>
    </Layout>
  )
}
