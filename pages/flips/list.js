/* eslint-disable react/prop-types */
import React, {useEffect} from 'react'
import {useMachine} from '@xstate/react'
import {
  Flex,
  Box,
  Alert,
  AlertIcon,
  Image,
  useDisclosure,
  PopoverTrigger,
  Stack,
  Text,
  Button,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {Page, PageTitleNew} from '../../screens/app/components'
import {
  FlipCardTitle,
  FlipCardSubtitle,
  RequiredFlipPlaceholder,
  OptionalFlipPlaceholder,
  FlipCardList,
  EmptyFlipBox,
  FlipCard,
  DeleteFlipDrawer,
} from '../../screens/flips/components'
import {formatKeywords} from '../../screens/flips/utils'
import {
  FlipType,
  IdentityStatus,
  FlipFilter as FlipFilterType,
  OnboardingStep,
} from '../../shared/types'
import {flipsMachine} from '../../screens/flips/machines'
import Layout from '../../shared/components/layout'
import {loadPersistentState} from '../../shared/utils/persist'
import {useAuthState} from '../../shared/providers/auth-context'
import {redact} from '../../shared/utils/logs'
import {useIdentity} from '../../shared/providers/identity-context'
import {useEpoch} from '../../shared/providers/epoch-context'
import {useOnboarding} from '../../shared/providers/onboarding-context'
import {onboardingShowingStep} from '../../shared/utils/onboarding'
import {
  OnboardingPopover,
  OnboardingPopoverContent,
  OnboardingPopoverContentIconRow,
} from '../../shared/components/onboarding'
import {eitherState} from '../../shared/utils/utils'
import {
  PenaltyIcon,
  PlusSolidIcon,
  RewardIcon,
} from '../../shared/components/icons'
import IconLink from '../../shared/components/icon-link'
import {MobileApiStatus} from '../../shared/components/components'
import {useFailToast} from '../../shared/hooks/use-toast'

export default function FlipListPage() {
  const {t} = useTranslation()

  const epochState = useEpoch()
  const {privateKey} = useAuthState()

  const {
    isOpen: isOpenDeleteForm,
    onOpen: openDeleteForm,
    onClose: onCloseDeleteForm,
  } = useDisclosure()

  const [
    {
      flips: knownFlips,
      requiredFlips: requiredFlipsNumber,
      availableFlips: availableFlipsNumber,
      state: status,
    },
  ] = useIdentity()

  const [selectedFlip, setSelectedFlip] = React.useState()

  const canSubmitFlips = [
    IdentityStatus.Verified,
    IdentityStatus.Human,
    IdentityStatus.Newbie,
  ].includes(status)

  const failToast = useFailToast()

  const [current, send] = useMachine(flipsMachine, {
    context: {
      knownFlips: knownFlips || [],
      filter: loadPersistentState('flipFilter') || FlipFilterType.Active,
    },
    actions: {
      onError: (_, {error}) => {
        failToast(error)
      },
    },
    logger: msg => console.log(redact(msg)),
  })

  useEffect(() => {
    if (epochState && privateKey && status) {
      send('INITIALIZE', {epoch: epochState.epoch, privateKey, canSubmitFlips})
    }
  }, [canSubmitFlips, epochState, privateKey, send, status])

  const {flips, missingFlips, filter} = current.context

  const filterFlips = () => {
    switch (filter) {
      case FlipFilterType.Active:
        return flips.filter(({type}) =>
          [
            FlipType.Publishing,
            FlipType.Published,
            FlipType.Deleting,
            FlipType.Invalid,
          ].includes(type)
        )
      case FlipType.Draft:
        return flips.filter(({type}) => type === FlipType.Draft)
      case FlipType.Archived:
        return flips.filter(({type}) =>
          [FlipType.Archived, FlipType.Deleted].includes(type)
        )
      default:
        return []
    }
  }

  const madeFlipsNumber = (knownFlips || []).length

  const remainingRequiredFlips = requiredFlipsNumber - madeFlipsNumber
  const remainingOptionalFlips =
    availableFlipsNumber - Math.max(requiredFlipsNumber, madeFlipsNumber)

  const [currentOnboarding, {dismissCurrentTask}] = useOnboarding()

  const eitherOnboardingState = (...states) =>
    eitherState(currentOnboarding, ...states)

  return (
    <Layout>
      <Page pt={[4, 6]}>
        <MobileApiStatus display={['initial', 'none']} left={4} />
        <PageTitleNew>{t('My Flips')}</PageTitleNew>
        <Flex justify="space-between" align="center" alignSelf="stretch" mb={8}>
          <Stack spacing={2} isInline>
            <Button
              variant="tab"
              onClick={() => send('FILTER', {filter: FlipFilterType.Active})}
              isActive={filter === FlipFilterType.Active}
            >
              {t('Active')}
            </Button>
            <Button
              variant="tab"
              onClick={() => send('FILTER', {filter: FlipFilterType.Draft})}
              isActive={filter === FlipFilterType.Draft}
            >
              {t('Drafts')}
            </Button>
            <Button
              variant="tab"
              onClick={() => send('FILTER', {filter: FlipFilterType.Archived})}
              isActive={filter === FlipFilterType.Archived}
            >
              {t('Archived')}
            </Button>
          </Stack>
          <Box alignSelf="end">
            <OnboardingPopover
              isOpen={eitherOnboardingState(
                onboardingShowingStep(OnboardingStep.CreateFlips)
              )}
            >
              <PopoverTrigger>
                <Box onClick={dismissCurrentTask}>
                  <IconLink
                    icon={<PlusSolidIcon boxSize={5} />}
                    href="/flips/new"
                    bg="white"
                    position={
                      eitherOnboardingState(
                        onboardingShowingStep(OnboardingStep.CreateFlips)
                      )
                        ? 'relative'
                        : 'initial'
                    }
                    zIndex={2}
                  >
                    {t('New flip')}
                  </IconLink>
                </Box>
              </PopoverTrigger>
              <OnboardingPopoverContent
                title={t('Create required flips')}
                onDismiss={dismissCurrentTask}
              >
                <Stack>
                  <Text>
                    {t(`You need to create at least 3 flips per epoch to participate
                    in the next validation ceremony. Follow step-by-step
                    instructions.`)}
                  </Text>
                  <OnboardingPopoverContentIconRow
                    icon={<RewardIcon boxSize={5} />}
                  >
                    {t(
                      `You'll get rewarded for every successfully qualified flip.`
                    )}
                  </OnboardingPopoverContentIconRow>
                  <OnboardingPopoverContentIconRow
                    icon={<PenaltyIcon boxSize={5} />}
                  >
                    {t(`Read carefully "What is a bad flip" rules to avoid
                      penalty.`)}
                  </OnboardingPopoverContentIconRow>
                </Stack>
              </OnboardingPopoverContent>
            </OnboardingPopover>
          </Box>
        </Flex>
        {current.matches('ready.dirty.active') &&
          canSubmitFlips &&
          (remainingRequiredFlips > 0 || remainingOptionalFlips > 0) && (
            <Box alignSelf="stretch" mb={8}>
              <Alert
                status="success"
                bg="green.010"
                borderWidth="1px"
                borderColor="green.050"
                fontWeight={500}
                rounded="md"
                px={3}
                py={2}
              >
                <AlertIcon name="info" color="green.500" size={5} mr={3} />
                {remainingRequiredFlips > 0
                  ? t(
                      `Please submit {{remainingRequiredFlips}} required flips.`,
                      {remainingRequiredFlips}
                    )
                  : null}{' '}
                {remainingOptionalFlips > 0
                  ? t(
                      `You can also submit {{remainingOptionalFlips}} optional flips if you want.`,
                      {
                        remainingOptionalFlips,
                      }
                    )
                  : null}
              </Alert>
            </Box>
          )}

        {status && !canSubmitFlips && (
          <Box alignSelf="stretch" mb={8}>
            <Alert
              status="error"
              bg="red.010"
              borderWidth="1px"
              borderColor="red.050"
              fontWeight={500}
              rounded="md"
              px={3}
              py={2}
            >
              <AlertIcon
                name="info"
                color="red.500"
                size={5}
                mr={3}
              ></AlertIcon>
              {t('You can not submit flips. Please get validated first. ')}
            </Alert>
          </Box>
        )}

        {current.matches('ready.pristine') && (
          <Flex
            flex={1}
            alignItems="center"
            justifyContent="center"
            alignSelf="stretch"
          >
            <Image src="/static/flips-cant-icn.svg" />
          </Flex>
        )}

        {current.matches('ready.dirty') && (
          <FlipCardList>
            {filterFlips().map(flip => (
              <FlipCard
                key={flip.id}
                flipService={flip.ref}
                onDelete={() => {
                  if (
                    flip.type === FlipType.Published &&
                    (knownFlips || []).includes(flip.hash)
                  ) {
                    setSelectedFlip(flip)
                    openDeleteForm()
                  } else flip.ref.send('ARCHIVE')
                }}
              />
            ))}
            {current.matches('ready.dirty.active') && (
              <>
                {missingFlips.map(({keywords}, idx) => (
                  <Box key={idx}>
                    <EmptyFlipBox>
                      <Image src="/static/flips-cant-icn.svg" />
                    </EmptyFlipBox>
                    <Box mt={4}>
                      <FlipCardTitle>
                        {keywords
                          ? formatKeywords(keywords.words)
                          : t('Missing keywords')}
                      </FlipCardTitle>
                      <FlipCardSubtitle>
                        {t('Missing on client')}
                      </FlipCardSubtitle>
                    </Box>
                  </Box>
                ))}
                {Array.from({length: remainingRequiredFlips}, (flip, idx) => (
                  <RequiredFlipPlaceholder
                    key={idx}
                    title={`Flip #${madeFlipsNumber + idx + 1}`}
                    {...flip}
                  />
                ))}
                {Array.from({length: remainingOptionalFlips}, (flip, idx) => (
                  <OptionalFlipPlaceholder
                    key={idx}
                    title={`Flip #${availableFlipsNumber -
                      (remainingOptionalFlips - idx - 1)}`}
                    {...flip}
                    isDisabled={remainingRequiredFlips > 0}
                  />
                ))}
              </>
            )}
          </FlipCardList>
        )}

        <DeleteFlipDrawer
          hash={selectedFlip?.hash}
          cover={selectedFlip?.images[selectedFlip.originalOrder[0]]}
          isOpen={isOpenDeleteForm}
          onClose={onCloseDeleteForm}
          onDelete={() => {
            selectedFlip.ref.send('DELETE')
            onCloseDeleteForm()
          }}
        />
      </Page>
    </Layout>
  )
}
