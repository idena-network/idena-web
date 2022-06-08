import {Flex, useBoolean, useDisclosure} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import * as React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ContactListSidebar,
  ContactCard,
  IssueInviteDrawer,
  EditContactDrawer,
  KillInviteDrawer,
} from '../screens/contacts/containers'
import {Page} from '../screens/app/components'
import Layout from '../shared/components/layout'
import {NoContactDataPlaceholder} from '../screens/contacts/components'
import {InviteProvider} from '../shared/providers/invite-context'
import {useFailToast, useSuccessToast} from '../shared/hooks/use-toast'

export default function ContactsPage() {
  const {t} = useTranslation()

  const router = useRouter()

  const [selectedContact, setSelectedContact] = React.useState(null)

  const sendInviteDisclosure = useDisclosure()
  const {
    onOpen: onOpenInviteDrawer,
    onClose: onCloseInviteDrawer,
  } = sendInviteDisclosure

  const {
    isOpen: isOpenEditContactDrawer,
    onOpen: onOpenEditContactDrawer,
    onClose: onCloseEditContactDrawer,
  } = useDisclosure()

  const {
    isOpen: isOpenKillContactDrawer,
    onOpen: onOpenKillContactDrawer,
    onClose: onCloseKillContactDrawer,
  } = useDisclosure()

  React.useEffect(() => {
    if (router.query.new !== undefined) {
      onOpenInviteDrawer()
    }
  }, [onOpenInviteDrawer, router])

  const successToast = useSuccessToast()
  const failToast = useFailToast()

  const [isMining, setIsMining] = useBoolean()

  const handleInviteMined = React.useCallback(() => {
    if (router.query.new !== undefined) {
      router.push('/contacts')
    }
    onCloseInviteDrawer()
    setIsMining.off()
  }, [onCloseInviteDrawer, router, setIsMining])

  return (
    <InviteProvider>
      <Layout>
        <Page px={0} py={0}>
          <Flex w="full">
            <ContactListSidebar
              selectedContactId={selectedContact?.id}
              onSelectContact={setSelectedContact}
              onNewContact={onOpenInviteDrawer}
            />
            <Flex flex={1} py={6} px={20}>
              {selectedContact ? (
                <ContactCard
                  contact={selectedContact}
                  onEditContact={onOpenEditContactDrawer}
                  onRemoveContact={() => {
                    setSelectedContact(null)
                  }}
                  onRecoverContact={setSelectedContact}
                  onKillContact={onOpenKillContactDrawer}
                  onInviteMined={handleInviteMined}
                />
              ) : (
                <NoContactDataPlaceholder>
                  {t('You haven’t selected contacts yet.')}
                </NoContactDataPlaceholder>
              )}
            </Flex>
          </Flex>

          <IssueInviteDrawer
            {...sendInviteDisclosure}
            inviteeAddress={router.query.address}
            isMining={isMining}
            onIssue={invite => {
              setSelectedContact(invite)
              setIsMining.on()
            }}
            onIssueFail={error => {
              failToast({
                title: error ?? t('Something went wrong'),
                status: 'error',
              })
            }}
          />

          <EditContactDrawer
            contact={selectedContact ?? {}}
            isOpen={isOpenEditContactDrawer}
            onRename={({firstName, lastName}) => {
              setSelectedContact(contact => ({
                ...contact,
                firstName,
                lastName,
              }))
              successToast(t('Changes have been saved'))
              onCloseEditContactDrawer()
            }}
            onClose={onCloseEditContactDrawer}
          />

          <KillInviteDrawer
            invite={selectedContact ?? {}}
            isOpen={isOpenKillContactDrawer}
            onClose={onCloseKillContactDrawer}
            onKill={() => {
              successToast('Invite terminated')
              onCloseKillContactDrawer()
            }}
            onFail={error => {
              failToast({
                title: 'Failed to terminate invite',
                description: error,
              })
            }}
          />
        </Page>
      </Layout>
    </InviteProvider>
  )
}
