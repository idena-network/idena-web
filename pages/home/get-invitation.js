import {
  Box,
  CloseButton,
  Flex,
  Link,
  ListItem,
  OrderedList,
  Stack,
  TabList,
  TabPanels,
  Tabs,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import {useRef, useState} from 'react'
import {Trans, useTranslation} from 'react-i18next'
import cookie from 'cookie-cutter'
import {Page, PageTitle} from '../../screens/app/components'
import {
  GetInvitationCopyButton,
  GetInvitationTab,
  GetInvitationTabPanel,
  GetInvitationTabTitle,
  GetInvitationTwitterInput,
} from '../../screens/home/components'
import {getInvitationCode} from '../../shared/api/self'
import {PrimaryButton} from '../../shared/components/button'
import {
  DiscordIcon,
  DiscordInvertedIcon,
  RedditIcon,
  RedditInvertedIcon,
  TelegramIcon,
  TelegramInvertedIcon,
  TwitterIcon,
} from '../../shared/components/icons'
import Layout from '../../shared/components/layout'
import {useFailToast, useSuccessToast} from '../../shared/hooks/use-toast'
import {useScroll} from '../../shared/hooks/use-scroll'

export default function GetInvitation() {
  const router = useRouter()
  const {t} = useTranslation()

  const [nickname, setNickname] = useState('')

  const failToast = useFailToast()
  const successToast = useSuccessToast()

  const [code, setCode] = useState()
  const [isWaiting, setIsWaiting] = useState(false)

  const size = useBreakpointValue(['lg', 'md'])

  const followersCount = process.env.NEXT_PUBLIC_TWITTER_MINIMUM_SUBS_COUNT || 100

  const invitationCodeRef = useRef()

  const {scrollTo: scrollToCode} = useScroll(invitationCodeRef)

  const getCode = async () => {
    setIsWaiting(true)
    const name = nickname.startsWith('@') ? nickname.substring(1) : nickname

    try {
      const {invitation} = await getInvitationCode(name, cookie.get('refId'))
      setCode(invitation)
      successToast(t('Your invitation code has been generated successfully!'))
      scrollToCode()
    } catch (e) {
      failToast(e.message)
    } finally {
      setIsWaiting(false)
    }
  }

  return (
    <Layout showHamburger={false}>
      <Page>
        <Flex
          align="center"
          alignSelf="stretch"
          justify={['center', 'space-between']}
          mb={[8, 2]}
          w={['100%', null]}
        >
          <PageTitle
            fontSize={['base', 'xl']}
            fontWeight={['bold', 500]}
            mb={0}
          >
            {t('How to get an invitation')}
          </PageTitle>
          <CloseButton
            color={['blue.500', 'inherit']}
            size="lg"
            position={['absolute', 'inherit']}
            right={2}
            onClick={() => router.push('/home')}
          />
        </Flex>
        <Flex
          direction="column"
          maxW="480px"
          w={['100%', null]}
          fontSize={['mdx', 'md']}
        >
          <Text>
            {t(
              'To minimize the probability of a Sybil attack, the pace of network growth is restricted: Idena network participation is invitation-based. New invitations can be sent out only by validated users. The number of invitations is limited and increases as the network grows.',
              {nsSeparator: '|'}
            )}
          </Text>
          <Text mt={2}>
            {t(
              'Please choose the platform where you have the most active account:',
              {nsSeparator: '|'}
            )}
          </Text>

          <Tabs variant="unstyled" mt={8}>
            <TabList bg={['gray.50', 'white']} p={[1, 0]} borderRadius="md">
              <GetInvitationTab
                iconSelected={<TelegramInvertedIcon />}
                icon={<TelegramIcon />}
                title="Telegram"
              />
              <GetInvitationTab
                iconSelected={<DiscordInvertedIcon />}
                icon={<DiscordIcon />}
                title="Discord"
              />
              <GetInvitationTab
                iconSelected={<TwitterIcon />}
                icon={<TwitterIcon />}
                title="Twitter"
              />
              <GetInvitationTab
                iconSelected={<RedditInvertedIcon />}
                icon={<RedditIcon />}
                title="Reddit"
              />
            </TabList>
            <TabPanels>
              <GetInvitationTabPanel>
                <GetInvitationTabTitle>Telegram</GetInvitationTabTitle>
                <Text>
                  <Trans t={t} i18nKey="joinIdenaTelegram">
                    Join the official{' '}
                    <Link
                      href="https://t.me/IdenaNetworkPublic"
                      target="_blank"
                      color="blue.500"
                    >
                      Idena Telegram group
                    </Link>{' '}
                    and request an invitation code from the community.
                  </Trans>
                </Text>
              </GetInvitationTabPanel>
              <GetInvitationTabPanel>
                <GetInvitationTabTitle>Discord</GetInvitationTabTitle>
                <Text>
                  <Trans t={t} i18nKey="joinIdenaDiscord">
                    Join{' '}
                    <Link
                      href="https://discord.gg/8BusRj7"
                      target="_blank"
                      color="blue.500"
                    >
                      Idena Community Discord
                    </Link>{' '}
                    and request an invitation code from the community in
                    #invite-requests channel.
                  </Trans>
                </Text>
              </GetInvitationTabPanel>
              <GetInvitationTabPanel>
                <GetInvitationTabTitle>Twitter</GetInvitationTabTitle>
                <OrderedList spacing={2}>
                  <ListItem>
                    {t('Follow')}{' '}
                    <Link
                      href="https://twitter.com/IdenaNetwork"
                      target="_blank"
                      color="blue.500"
                    >
                      @IdenaNetwork
                    </Link>{' '}
                  </ListItem>
                  <ListItem>
                    <Stack spacing={4}>
                      <Text>
                        <Trans t={t} i18nKey="joinIdenaTwitterSendTweet">
                          <Link
                            target="_blank"
                            color="blue.500"
                            rel="noreferrer"
                            href="https://twitter.com/intent/tweet?text=I%20want%20to%20join%20%40IdenaNetwork%20to%20become%20a%20validator%20of%20the%20first%20Proof-of-Person%20blockchain%20%23IdenaInvite%0A%0Ahttps://www.idena.io"
                          >
                            Send a tweet
                          </Link>{' '}
                          with a hashtag #IdenaInvite from your account. To get
                          an invite, your account should be older than 1 year or
                          older than two months and have at least{' '}
                          {{followersCount}} followers. The tweet should say:
                        </Trans>
                      </Text>
                      <Flex mt={4} p={[7, 10]} borderRadius="md" bg="gray.50">
                        <Flex direction={['column', 'row']}>
                          <Stack>
                            <Text color="gray.500">
                              I want to join @IdenaNetwork to become a validator
                              of the first Proof-of-Person blockchain
                              #IdenaInvite
                            </Text>
                            <Text>
                              <Link
                                href="https://www.idena.io"
                                target="_blank"
                                color="blue.500"
                              >
                                https://www.idena.io
                              </Link>
                            </Text>
                          </Stack>
                          <GetInvitationCopyButton
                            ml={[0, 10]}
                            value={
                              'I want to join @IdenaNetwork to become a validator of the first Proof-of-Person blockchain #IdenaInvite\n' +
                              '\n' +
                              'https://www.idena.io'
                            }
                          />
                        </Flex>
                      </Flex>
                    </Stack>
                  </ListItem>
                  <ListItem>
                    <Stack spacing={4} pt={2}>
                      <Text>
                        <Trans t={t} i18nKey="joinIdenaTwitterGetCode">
                          Enter your twitter name and click{' '}
                          <i>Get an invitation code</i> button. The code will be
                          shown automatically.
                        </Trans>
                      </Text>
                      <Stack>
                        <Text color="gray.500" fontWeight="500">
                          {t('Your nickname')}
                        </Text>
                        <GetInvitationTwitterInput
                          value={nickname}
                          onChange={value => setNickname(value)}
                        />
                      </Stack>

                      {code ? (
                        <Flex
                          boxShadow="0 3px 12px 0 rgba(83, 86, 92, 0.1), 0 2px 3px 0 rgba(83, 86, 92, 0.2)"
                          px={10}
                          py={8}
                          borderRadius="lg"
                          position="relative"
                        >
                          <Flex
                            direction={['column', 'row']}
                            justifyContent="space-between"
                            w="100%"
                          >
                            <Stack spacing={0}>
                              <Text color="muted">{t('Invitation code')}</Text>
                              <Text
                                color="gray.500"
                                fontWeight={500}
                                wordBreak="break-all"
                              >
                                {code}
                              </Text>
                            </Stack>
                            <GetInvitationCopyButton
                              value={code}
                              ml={[0, 10]}
                            />
                          </Flex>
                        </Flex>
                      ) : (
                        <Flex>
                          <PrimaryButton
                            ml="auto"
                            onClick={getCode}
                            isLoading={isWaiting}
                            loadingText=""
                            w={['100%', 'auto']}
                            size={size}
                          >
                            {t('Get an invitation code')}
                          </PrimaryButton>
                        </Flex>
                      )}
                      <Box ref={invitationCodeRef}></Box>
                    </Stack>
                  </ListItem>
                </OrderedList>
              </GetInvitationTabPanel>
              <GetInvitationTabPanel>
                <GetInvitationTabTitle>Reddit</GetInvitationTabTitle>
                <Text color="gray.500">
                  <Trans t={t} i18nKey="joinIdenaReddit">
                    Join{' '}
                    <Link
                      href="https://www.reddit.com/r/Idena/"
                      target="_blank"
                      color="blue.500"
                    >
                      Idena subreddit
                    </Link>{' '}
                    and request an invitation code from the community.
                  </Trans>
                </Text>
              </GetInvitationTabPanel>
            </TabPanels>
          </Tabs>
        </Flex>
      </Page>
    </Layout>
  )
}
