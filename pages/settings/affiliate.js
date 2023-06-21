/* eslint-disable react/prop-types */
import {
  Box,
  Divider,
  Flex,
  Link,
  ListItem,
  Text,
  UnorderedList,
  useBreakpointValue,
  useClipboard,
} from '@chakra-ui/react'
import React from 'react'
import {Trans, useTranslation} from 'react-i18next'
import SettingsLayout from './layout'
import {SubHeading} from '../../shared/components'
import {
  FormLabel,
  Input,
  ExternalLink,
} from '../../shared/components/components'
import {OpenExplorerIcon} from '../../shared/components/icons'
import {FlatButton} from '../../shared/components/button'
import {useIsDesktop} from '../../shared/utils/utils'
import {WideLink} from '../../screens/home/components'
import {useAuthState} from '../../shared/providers/auth-context'

export default function Affiliate() {
  const {t} = useTranslation()
  const {coinbase} = useAuthState()

  const refLink = `app.idena.io?ref=${coinbase}`
  const {onCopy: onCopyRef, hasCopied} = useClipboard(refLink)

  const detailLinkTitle = useBreakpointValue([
    'More details',
    'More details about Idena affiliate program',
  ])

  return (
    <SettingsLayout title={t('Affilate program')}>
      <Flex direction="column" mt={10} w={['100%', '480px']}>
        <SubHeading fontSize={['20px', 'lg']} mb={4}>
          {t('Idena affiliate program')}
        </SubHeading>
        <Text fontSize={['mdx', 'md']}>
          {t(
            'The program allows you to earn rewards for new validated identities you bring to the network.'
          )}
        </Text>
        <FullSizeLink
          label={detailLinkTitle}
          href="https://docs.idena.io/docs/community/affiliate"
          mt={[4, '3px']}
        >
          <Box boxSize={8} backgroundColor="brandBlue.10" borderRadius="10px">
            <OpenExplorerIcon boxSize={5} mt="6px" ml="6px" />
          </Box>
        </FullSizeLink>
        <UnorderedList mt={9} ml={[0, 4]}>
          <UniversalListItem title="Apply for participation by submitting request form">
            <SimpleLink href="https://forms.gle/1R1AKZokEYn3aUU19">
              {t('Referral link request form')}
            </SimpleLink>
          </UniversalListItem>
          <UniversalListItem title="Spread the word">
            <Text>{t('Educate your community about Idena')}</Text>
          </UniversalListItem>
          <UniversalListItem title="Share your referral link">
            <Box mt={2} mb={4} display={['block', 'none']}>
              {hasCopied ? (
                <FormLabel
                  position="absolute"
                  right={0}
                  top="1px"
                  fontSize="base"
                  color="green.500"
                  h={5}
                  m={0}
                >
                  {t('Copied!')}
                </FormLabel>
              ) : (
                <FlatButton
                  position="absolute"
                  right={0}
                  top="2px"
                  fontSize="base"
                  fontWeight={500}
                  h={5}
                  onClick={onCopyRef}
                >
                  {t('Copy')}
                </FlatButton>
              )}
              <Input
                size="lg"
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
                value={refLink}
                width="100%"
                disabled
              />
            </Box>
            <Text>
              {t(
                'Motivate your audience to join and help them to get an invite'
              )}
            </Text>
            <Box
              display={['none', 'block']}
              mt={4}
              px={10}
              py={6}
              backgroundColor="gray.50"
              borderRadius="lg"
            >
              <Flex justify="space-between">
                <Text color="muted">{t('Your Referral link')}</Text>
                {hasCopied ? (
                  <FormLabel color="green.500" fontSize="md" m={0}>
                    {t('Copied!')}
                  </FormLabel>
                ) : (
                  <FlatButton fontWeight={500} onClick={onCopyRef}>
                    {t('Copy')}
                  </FlatButton>
                )}
              </Flex>
              <Text
                color="gray.500"
                fontWeight={500}
                wordBreak="break-all"
                w="80%"
              >
                {refLink}
              </Text>
            </Box>
          </UniversalListItem>
          <UniversalListItem title="Help your invitees through the onboarding process">
            <Text>
              {t(
                'Remind them about the validation ceremony and help them get validated'
              )}
            </Text>
          </UniversalListItem>
          <UniversalListItem isLast title="Get rewards">
            <Trans t={t} i18nKey="affiliateFillRewards">
              <Text>
                Find the rewards you get and reward conditions on the{' '}
                <SimpleLink href="https://docs.idena.io/docs/community/affiliate">
                  Idena affiliate program page
                </SimpleLink>
              </Text>
            </Trans>
          </UniversalListItem>
        </UnorderedList>
      </Flex>
    </SettingsLayout>
  )
}

function UniversalListItem({title, isLast, children, ...props}) {
  const orientation = useBreakpointValue(['horizontal', 'vertical'])
  return (
    <ListItem listStyleType={['none', 'disc']} fontSize="base" {...props}>
      <Box
        position="relative"
        fontSize={['base', 'md']}
        fontWeight={[500, 400]}
        textColor="muted"
      >
        <Text
          fontSize={['base', 'mdx']}
          fontWeight={500}
          color="gray.500"
          pt={0.5}
          my={1}
        >
          {title}
        </Text>
        {children}
        <Divider
          display={isLast ? 'none' : 'block'}
          position={['initial', 'absolute']}
          top="15px"
          left="-15px"
          mt={[6, 0]}
          borderColor="brandGray.800"
          orientation={orientation}
          zIndex={-1}
        />
        <Box h={4} w={4} />
      </Box>
    </ListItem>
  )
}

function FullSizeLink({label, href, children, ...props}) {
  const isDesktop = useIsDesktop()
  const ComponentLink = isDesktop ? ExternalLink : WideLink

  return (
    <ComponentLink label={label} href={href} target="_blank" {...props}>
      {isDesktop ? label : children}
    </ComponentLink>
  )
}

function SimpleLink({href, children, ...props}) {
  const isDesktop = useIsDesktop()
  const ComponentLink = isDesktop ? ExternalLink : Link

  return (
    <ComponentLink color="brandBlue.500" href={href} target="_blank" {...props}>
      {children}
    </ComponentLink>
  )
}
