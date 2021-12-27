/* eslint-disable react/prop-types */
import React from 'react'
import {useRouter} from 'next/router'
import {
  Alert,
  Flex,
  ListItem,
  Stack,
  Text,
  UnorderedList,
  useDisclosure,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import Sidebar from './sidebar'
import Notifications from './notifications'
import {shouldStartValidation} from '../../screens/validation/utils'
import {ValidationToast} from '../../screens/validation/components'
import {Hamburger, LayoutContainer} from '../../screens/app/components'
import {useAuthState} from '../providers/auth-context'
import Auth from './auth'
import {apiKeyStates, useSettingsState} from '../providers/settings-context'
import {useIdentity} from '../providers/identity-context'
import {useEpoch} from '../providers/epoch-context'
import {useTestValidationState} from '../providers/test-validation-context'
import {EpochPeriod, IdentityStatus} from '../types'
import {Dialog, DialogBody, DialogFooter} from './components'
import {PrimaryButton, SecondaryButton} from './button'

export default function Layout(props) {
  const {auth} = useAuthState()
  const {isOpen, onOpen, onClose} = useDisclosure()

  return (
    <LayoutContainer>
      {auth ? (
        <>
          <Hamburger onClick={onOpen} />
          <Sidebar isOpen={isOpen} onClose={onClose} />
          <NormalApp {...props} />
        </>
      ) : (
        <Auth />
      )}
    </LayoutContainer>
  )
}

function NormalApp({children, canRedirect = true}) {
  const router = useRouter()

  const {t} = useTranslation()

  const epoch = useEpoch()
  const [identity] = useIdentity()
  const settings = useSettingsState()

  const {
    current: currentTrainingValidation,
    epoch: testValidationEpoch,
  } = useTestValidationState()

  React.useEffect(() => {
    if (!canRedirect) return
    if (settings.apiKeyState === apiKeyStates.OFFLINE) {
      router.push('/node/offline')
    } else if (shouldStartValidation(epoch, identity))
      router.push('/validation')
    else if (currentTrainingValidation?.period === EpochPeriod.ShortSession)
      router.push('/try/validation')
  }, [
    canRedirect,
    currentTrainingValidation,
    epoch,
    identity,
    router,
    settings.apiKeyState,
  ])

  return (
    <Flex
      as="section"
      direction="column"
      flex={1}
      h={['auto', '100vh']}
      overflowY="auto"
    >
      <MyIdenaBotAlert />

      {children}

      {currentTrainingValidation && (
        <ValidationToast epoch={testValidationEpoch} isTestValidation />
      )}

      {epoch && <ValidationToast epoch={epoch} identity={identity} />}

      <Notifications />
    </Flex>
  )
}

function MyIdenaBotAlert() {
  const {t} = useTranslation()

  const [{state}] = useIdentity()

  const myIdenaBotDisclosure = useDisclosure()

  const eitherState = (...states) => states.some(s => s === state)

  return (
    <>
      <Alert
        variant="solid"
        boxShadow="0 3px 12px 0 rgb(255 163 102 /0.1), 0 2px 3px 0 rgb(255 163 102 /0.2)"
        justifyContent="center"
        color="white"
        fontWeight={500}
        fontSize="md"
        rounded="md"
        p={3}
        m={2}
        mb={0}
        w="auto"
        zIndex="banner"
        cursor="pointer"
        onClick={myIdenaBotDisclosure.onOpen}
      >
        🤖{' '}
        {t(`Subscribe to @MyIdenaBot to get personalized notifications based on
        your status`)}
      </Alert>

      <Dialog title="🤖 Subscribe to @MyIdenaBot" {...myIdenaBotDisclosure}>
        <DialogBody>
          <Stack>
            <Text>
              MyIdenaBot reminds you about important actions based on your
              identity status:
            </Text>

            {eitherState(IdentityStatus.Undefined) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'notification when you get an invite',
                  'reminder to activate your invite',
                  'your validation results when validation consensus is reached',
                ]}
              />
            )}

            {eitherState(IdentityStatus.Invite, IdentityStatus.Candidate) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'your validation results when validation consensus is reached',
                ]}
              />
            )}

            {eitherState(IdentityStatus.Newbie) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'reminder to create flips if you haven’t done it yet and the validation is coming',
                  'your validation results when validation consensus is reached',
                ]}
              />
            )}

            {eitherState(IdentityStatus.Verified, IdentityStatus.Human) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'reminder to create flips',
                  'your validation results when validation consensus is reached',
                  'reminder to share your remaining invites',
                  'reminder to submit extra flips to get more rewards',
                  'status update of all your invitees to check if they are ready for the validation (activated invites, submitted flips)',
                ]}
              />
            )}
            {eitherState(IdentityStatus.Zombie, IdentityStatus.Suspended) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'your validation results when validation consensus is reached',
                  'reminder to share your remaining invites',
                  'reminder to submit extra flips to get more rewards',
                  'status update of all your invitees to check if they are ready for the validation (activated invites, submitted flips)',
                ]}
              />
            )}
          </Stack>
        </DialogBody>
        <DialogFooter>
          <SecondaryButton onClick={myIdenaBotDisclosure.onClose}>
            Not now
          </SecondaryButton>
          <PrimaryButton onClick={myIdenaBotDisclosure.onClose}>
            Connect
          </PrimaryButton>
        </DialogFooter>
      </Dialog>
    </>
  )
}

function IdenaBotFeatureList({features, listSeparator = ';'}) {
  return (
    <UnorderedList spacing={1} styleType="'- '" pl={2}>
      {features.map((feature, idx) => (
        <ListItem textTransform="lowercase">
          {feature}
          {idx < features.length - 1 ? listSeparator : '.'}
        </ListItem>
      ))}
    </UnorderedList>
  )
}
