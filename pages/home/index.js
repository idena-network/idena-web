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
  UserProfileCard,
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
  AdCarousel,
  SpoilInviteDrawer,
} from '../../screens/home/components'
import Layout from '../../shared/components/layout'
import {IdentityStatus, OnboardingStep} from '../../shared/types'
import {
  toPercent,
  toLocaleDna,
  eitherState,
  openExternalUrl,
  useIsDesktop,
} from '../../shared/utils/utils'
import {useIdentity} from '../../shared/providers/identity-context'
import {useEpoch} from '../../shared/providers/epoch-context'
import {fetchBalance} from '../../shared/api/wallet'
import {useAuthState} from '../../shared/providers/auth-context'
import {
  ExternalLink,
  HDivider,
  MobileApiStatus,
  TextLink,
  Tooltip,
} from '../../shared/components/components'
import {useOnboarding} from '../../shared/providers/onboarding-context'
import {
  OnboardingPopover,
  OnboardingPopoverContent,
} from '../../shared/components/onboarding'
import {onboardingShowingStep} from '../../shared/utils/onboarding'
import {useScroll} from '../../shared/hooks/use-scroll'
import {
  AddUserIcon,
  ChevronRightIcon,
  AdsIcon,
  CopyIcon,
  DeleteIcon,
  OpenExplorerIcon,
  OracleIcon,
  PhotoIcon,
  TestValidationIcon,
  PooIcon,
  InfoIcon,
} from '../../shared/components/icons'
import {useFailToast, useSuccessToast} from '../../shared/hooks/use-toast'
import {isValidDnaUrl} from '../../screens/dna/utils'
import {useStakingApy, useValidationResults} from '../../screens/home/hooks'
import {ValidationReportSummary} from '../../screens/validation-report/components'
import {useAppContext} from '../../shared/providers/app-context'
import {useRotatingAds} from '../../screens/ads/hooks'
import {StakeProtectionBadge} from '../../screens/home/stake-protection'

export default function HomePage() {
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

  const [{idenaBotConnected}, {persistIdenaBot, skipIdenaBot}] = useAppContext()

  const shouldStartIdenaJourney = currentOnboarding.matches(
    OnboardingStep.StartTraining
  )
  const onboardingPopoverPlacement = useBreakpointValue(['top', 'bottom'])

  const replenishStakeDisclosure = useDisclosure()

  const {
    onOpen: onOpenReplenishStakeDisclosure,
    onClose: onCloseReplenishStakeDisclosure,
  } = replenishStakeDisclosure

  React.useEffect(() => {
    if (Object.keys(router.query).find(q => q === 'replenishStake')) {
      onOpenReplenishStakeDisclosure()
      router.push('/home')
    }
  }, [onOpenReplenishStakeDisclosure, router])

  const failToast = useFailToast()

  const stakingApy = useStakingApy()

  const ads = useRotatingAds()

  const isDesktop = useIsDesktop()

  const spoilInviteDisclosure = useDisclosure()

  const showActivateMiningStatusIcon = canMine && !online && !delegatee
  const showValidateIdentityIcon = !canMine && Number(stake) > 0

  const lockedNewbieStake = (stake - (replenishedStake ?? 0)) * 0.75
  const availableStake =
    state === IdentityStatus.Newbie ? stake - lockedNewbieStake : stake

  return (
    <Layout canRedirect={!dnaUrl} didConnectIdenaBot={idenaBotConnected}>
      {!idenaBotConnected && (
        <MyIdenaBotAlert onConnect={persistIdenaBot} onSkip={skipIdenaBot} />
      )}
      <Page pt="10" position="relative">
        <MobileApiStatus top={idenaBotConnected ? 4 : 5 / 2} left={4} />
        <Stack
          w={['100%', '480px']}
          direction={['column', 'row']}
          spacing={['6', 10]}
        >
          <Box>
            <Stack
              spacing={[1, 8]}
              w={['100%', '480px']}
              align={['center', 'initial']}
              ref={activateInviteRef}
            >
              <UserProfileCard identity={identity} my={[4, 0]} />

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
                      <ChevronRightIcon boxSize={4} />
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

              <Stack spacing="2" w="full">
                {Boolean(state) && state !== IdentityStatus.Undefined && (
                  <UserStatList title={t('Stake')}>
                    <Stack spacing={['6']}>
                      <Stack direction={['column', 'row']} spacing={['5', '2']}>
                        <Stack spacing={['5', '4']} flex={1}>
                          <UserStat>
                            <Stack
                              direction={['row', 'column']}
                              spacing="1"
                              justify={['space-between', null]}
                            >
                              <UserStatLabel
                                color={[null, 'muted']}
                                fontSize={['mdx', 'md']}
                                fontWeight={[400, 500]}
                              >
                                {t('Amount')}
                              </UserStatLabel>
                              <UserStatValue fontSize={['mdx', 'md']}>
                                {toDna(availableStake)}
                              </UserStatValue>
                            </Stack>
                          </UserStat>
                          {stake > 0 && state === IdentityStatus.Newbie && (
                            <AnnotatedUserStatistics
                              label={t('Locked')}
                              value={toDna(lockedNewbieStake)}
                              tooltip={t(
                                'You need to get Verified status to get the locked funds into the normal wallet'
                              )}
                            />
                          )}
                        </Stack>
                        <UserStat flex={1}>
                          <Stack
                            direction={['row', 'column']}
                            spacing="1"
                            justify={['space-between', null]}
                          >
                            <UserStatLabel
                              color={[null, 'muted']}
                              fontSize={['mdx', 'md']}
                              fontWeight={[400, 500]}
                            >
                              {t('APY')}
                            </UserStatLabel>
                            <UserStatValue fontSize={['mdx', 'md']}>
                              <Stack direction={['row']} spacing="2">
                                <Text as="span">
                                  {stakingApy > 0
                                    ? toPercent(stakingApy)
                                    : '--'}
                                  {(showActivateMiningStatusIcon ||
                                    showValidateIdentityIcon) && (
                                    <Tooltip
                                      shouldWrapChildren
                                      bg="graphite.500"
                                      placement="top"
                                      hasArrow
                                      label={
                                        showActivateMiningStatusIcon
                                          ? t(
                                              'Please activate your mining status to earn the staking rewards'
                                            )
                                          : t(
                                              'Please validate your account to earn the staking rewards'
                                            )
                                      }
                                      w="130px"
                                    >
                                      <InfoIcon
                                        boxSize={[5, 4]}
                                        color="red.500"
                                        mt={[-1, -1 / 2]}
                                        ml={1}
                                      />
                                    </Tooltip>
                                  )}
                                </Text>
                                <ExternalLink
                                  href={`https://idena.io/staking?amount=${Math.floor(
                                    state === IdentityStatus.Newbie
                                      ? stake - lockedNewbieStake
                                      : stake
                                  )}`}
                                  alignSelf="center"
                                  display={['none', 'inline-flex']}
                                >
                                  {t('Calculator')}
                                </ExternalLink>
                              </Stack>
                            </UserStatValue>
                          </Stack>
                        </UserStat>
                      </Stack>

                      {Number(stake) > 0 && (
                        <Stack direction={('column', 'row')} spacing="2">
                          <StakeProtectionBadge type="miss" />
                          <StakeProtectionBadge type="fail" />
                        </Stack>
                      )}

                      <HDivider />

                      <Flex justify="flex-end" display={['none', 'flex']}>
                        <Button
                          variant="outline"
                          onClick={replenishStakeDisclosure.onOpen}
                        >
                          Add stake
                        </Button>
                      </Flex>

                      <Stack display={['inline-flex', 'none']}>
                        <Button
                          onClick={replenishStakeDisclosure.onOpen}
                          w="100%"
                          h={10}
                          fontSize="15px"
                          variant="outline"
                          color="blue.500"
                          border="none"
                          borderColor="transparent"
                        >
                          {t('Add stake')}
                        </Button>

                        <Button
                          onClick={() => {
                            openExternalUrl(
                              `https://idena.io/staking?amount=${Math.floor(
                                availableStake
                              )}`
                            )
                          }}
                          w="100%"
                          h={10}
                          fontSize="15px"
                          variant="outline"
                          color="blue.500"
                          border="none"
                          borderColor="transparent"
                        >
                          {t('Calculator')}
                        </Button>
                      </Stack>
                    </Stack>
                  </UserStatList>
                )}
              </Stack>
            </Stack>
            {ads?.length > 0 && !isDesktop && (
              <Box display={['block', 'none']} mt="6">
                <AdCarousel ads={ads} />
              </Box>
            )}
          </Box>

          <Stack spacing={[0, 10]} flexShrink={0} w={['100%', 200]}>
            {address && privateKey && canMine && (
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
                      <ActivateMiningForm
                        privateKey={privateKey}
                        isOnline={online}
                        delegatee={delegatee}
                        delegationEpoch={delegationEpoch}
                        pendingUndelegation={pendingUndelegation}
                        onShow={nextOnboardingTask}
                      />
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
            )}
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
                label={t('New voting')}
                onClick={() => router.push('/oracles/new')}
              >
                <Box
                  boxSize={[8, 5]}
                  backgroundColor={['brandBlue.10', 'initial']}
                  borderRadius="10px"
                >
                  <OracleIcon
                    color="blue.500"
                    boxSize={5}
                    mt={['6px', 0]}
                    ml={['6px', 0]}
                  />
                </Box>
              </WideLink>
              <WideLink
                label={t('New ad')}
                onClick={() => router.push('/adn/new')}
              >
                <Box
                  boxSize={[8, 5]}
                  backgroundColor={['brandBlue.10', 'initial']}
                  borderRadius="10px"
                >
                  <AdsIcon
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
                label={t('Spoil invite')}
                onClick={spoilInviteDisclosure.onOpen}
              >
                <Box
                  boxSize={[8, 5]}
                  backgroundColor={['brandBlue.10', 'initial']}
                  borderRadius="10px"
                >
                  <PooIcon
                    color="blue.500"
                    boxSize="5"
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
          onMined={onCloseReplenishStakeDisclosure}
          onError={failToast}
        />

        <SpoilInviteDrawer
          {...spoilInviteDisclosure}
          onSuccess={() => {
            successToast(t('Invitation is successfully spoiled'))
            spoilInviteDisclosure.onClose()
          }}
          onFail={failToast}
        />
      </Page>
    </Layout>
  )
}
