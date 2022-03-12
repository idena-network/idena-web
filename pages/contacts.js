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

  const {query} = useRouter()

  const [selectedContact, setSelectedContact] = React.useState(null)

  const sendInviteDisclosure = useDisclosure()

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
    if (query.new !== undefined) sendInviteDisclosure.onOpen()
  }, [query.new, sendInviteDisclosure])

  const successToast = useSuccessToast()
  const failToast = useFailToast()

  const [isMining, setIsMining] = useBoolean()

  const handleInviteMined = React.useCallback(() => {
    setIsMining.off()
    sendInviteDisclosure.onClose()
  }, [sendInviteDisclosure, setIsMining])

  return (
    <InviteProvider>
      <Layout>
        <Page px={0} py={0}>
          <Flex w="full">
            <ContactListSidebar
              selectedContactId={selectedContact?.id}
              onSelectContact={setSelectedContact}
              onNewContact={sendInviteDisclosure.onOpen}
            />
            <Flex flex={1} py={6} px={20}>
              {selectedContact ? (
                <ContactCard
                  contact={selectedContact}
                  onEditContact={onOpenEditContactDrawer}
                  onRemoveContact={() => {
                    setSelectedContact(null)
                  }}
                  onRecoverContact={contact => {
                    setSelectedContact(contact)
                  }}
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
            inviteeAddress={query.address}
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
