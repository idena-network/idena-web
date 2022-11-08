import React, {useEffect} from 'react'
import {useRouter} from 'next/router'
import {
  Flex,
  Stack,
  useDisclosure,
  CloseButton,
  useToast,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useMachine} from '@xstate/react'
import {DeleteIcon} from '@chakra-ui/icons'
import {Page, PageTitle} from '../../screens/app/components'
import {
  FlipMaster,
  FlipStepBody,
  FlipKeywordPanel,
  FlipKeywordTranslationSwitch,
  FlipKeyword,
  FlipKeywordName,
  FlipImageList,
  FlipImageListItem,
  FlipMasterFooter,
  FlipCardMenuItem,
  FlipCardMenu,
  DeleteFlipDrawer,
} from '../../screens/flips/components'
import Layout from '../../shared/components/layout'
import {createViewFlipMachine} from '../../screens/flips/machines'
import {rem} from '../../shared/theme'
import {Toast} from '../../shared/components/components'
import {FlipType} from '../../shared/types'
import db from '../../shared/utils/db'
import {redact} from '../../shared/utils/logs'
import {useIdentity} from '../../shared/providers/identity-context'

export default function ViewFlipPage() {
  const {t, i18n} = useTranslation()

  const router = useRouter()

  const {id} = router.query

  const {
    isOpen: isOpenDeleteForm,
    onOpen: openDeleteForm,
    onClose: onCloseDeleteForm,
  } = useDisclosure()

  const toast = useToast()

  const [{flips: knownFlips}] = useIdentity()

  const [current, send] = useMachine(createViewFlipMachine(), {
    context: {
      locale: 'en',
    },
    services: {
      // eslint-disable-next-line no-shadow
      loadFlip: async ({id}) => db.table('ownFlips').get(id),
    },
    actions: {
      onDeleted: () => router.push('/flips/list'),
      onDeleteFailed: ({error}) =>
        toast({
          // eslint-disable-next-line react/display-name
          render: () => <Toast title={error} status="error" />,
        }),
    },
    logger: msg => console.log(redact(msg)),
  })

  useEffect(() => {
    if (id) {
      send('LOAD', {id})
    }
  }, [id, send])

  const {
    hash,
    keywords,
    images: originalImages,
    protectedImages,
    originalOrder,
    order,
    showTranslation,
    type,
  } = current.context

  const images = protectedImages?.every(Boolean)
    ? protectedImages
    : originalImages

  if (!id) return null

  return (
    <Layout showHamburger={false}>
      <Page px={0} py={0}>
        <Flex
          direction="column"
          flex={1}
          alignSelf="stretch"
          px={20}
          overflowY="auto"
        >
          <Flex
            align="center"
            alignSelf="stretch"
            justify="space-between"
            my={6}
            mb={0}
          >
            <PageTitle mb={0} pb={0}>
              {t('View flip')}
            </PageTitle>
            <CloseButton onClick={() => router.push('/flips/list')} />
          </Flex>
          {current.matches('loaded') && (
            <FlipMaster>
              <FlipStepBody minH="180px" my="auto">
                <Stack isInline spacing={10}>
                  <FlipKeywordPanel w={rem(320)}>
                    {keywords.words.length ? (
                      <FlipKeywordTranslationSwitch
                        keywords={keywords}
                        showTranslation={showTranslation}
                        locale={i18n.language}
                        isInline={false}
                        onSwitchLocale={() => send('SWITCH_LOCALE')}
                      />
                    ) : (
                      <FlipKeyword>
                        <FlipKeywordName>
                          {t('Missing keywords')}
                        </FlipKeywordName>
                      </FlipKeyword>
                    )}
                  </FlipKeywordPanel>
                  <Stack isInline spacing={10} justify="center">
                    <FlipImageList>
                      {originalOrder.map((num, idx) => (
                        <FlipImageListItem
                          key={num}
                          src={images?.[num]}
                          isFirst={idx === 0}
                          isLast={idx === images.length - 1}
                          width={130}
                        />
                      ))}
                    </FlipImageList>
                    <FlipImageList>
                      {order.map((num, idx) => (
                        <FlipImageListItem
                          key={num}
                          src={images?.[num]}
                          isFirst={idx === 0}
                          isLast={idx === images.length - 1}
                          width={130}
                        />
                      ))}
                    </FlipImageList>
                  </Stack>
                </Stack>
              </FlipStepBody>
            </FlipMaster>
          )}
        </Flex>
        {type !== FlipType.Archived && (
          <FlipMasterFooter>
            <FlipCardMenu>
              <FlipCardMenuItem
                onClick={() => {
                  if ((knownFlips || []).includes(hash)) openDeleteForm()
                  else send('ARCHIVE')
                }}
              >
                <DeleteIcon size={5} mr={2} color="red.500" />
                {t('Delete flip')}
              </FlipCardMenuItem>
            </FlipCardMenu>
          </FlipMasterFooter>
        )}

        {current.matches('loaded') && (
          <DeleteFlipDrawer
            hash={hash}
            cover={images?.[originalOrder[0]]}
            isOpen={isOpenDeleteForm}
            onClose={onCloseDeleteForm}
            onDelete={() => {
              send('DELETE')
              onCloseDeleteForm()
            }}
          />
        )}
      </Page>
    </Layout>
  )
}
