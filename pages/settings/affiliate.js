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
import React, {useState} from 'react'
import {useTranslation} from 'react-i18next'
import SettingsLayout from './layout'
import {SubHeading} from '../../shared/components'
import {
  FormLabel,
  Input,
  ExternalLink,
} from '../../shared/components/components'
import {
  AngleArrowBackIcon,
  OpenExplorerIcon,
} from '../../shared/components/icons'
import {FlatButton} from '../../shared/components/button'
import {Page, PageTitleNew} from '../../screens/app/components'
import {useIsDesktop} from '../../shared/utils/utils'
import {WideLink} from '../../screens/home/components'

export default function Affiliate() {
  const {t} = useTranslation()

  const [refLink, setRefLink] = useState('-')
  const {onCopy: onCopyRef, hasCopied} = useClipboard(refLink)

  const detailLinkTitle = useBreakpointValue([
    'More details',
    'More details about Idena affiliate program',
  ])

  return (
    <SettingsLayout>
      <Flex direction="column" mt={10} w={['100%', '480px']}>
        <AngleArrowBackIcon
          display={['block', 'none']}
          position="absolute"
          left={4}
          top={4}
          h="28px"
          w="28px"
          onClick={() => {
            router.push('/settings')
          }}
        />
        <PageTitleNew display={['block', 'none']}>
          {t('Affilate program')}
        </PageTitleNew>
        <SubHeading fontSize={['20px', 'lg']} mb={4}>
          Idena affiliate program
        </SubHeading>
        <Text fontSize={['mdx', 'md']}>
          The program offers an opportunity to earn rewards for new validated
          identities you bring to the network.
        </Text>
        <FullSizeLink label={detailLinkTitle} href="/" mt={[4, '3px']}>
          <Box boxSize={8} backgroundColor="brandBlue.10" borderRadius="10px">
            <OpenExplorerIcon boxSize={5} mt="6px" ml="6px" />
          </Box>
        </FullSizeLink>
        <UnorderedList mt={9} ml={[0, 4]}>
          <UniversalListItem title="Apply for participation by submitting request form">
            <SimpleLink href="/">Referral link request form</SimpleLink>
          </UniversalListItem>
          <UniversalListItem title="Get approved">
            <Text>And get your personal referral link</Text>
          </UniversalListItem>
          <UniversalListItem title="Distribute">
            <Text>Educate your community about Idena</Text>
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
              <Input size="lg" value={refLink} width="100%" disabled />
            </Box>
            <Text>
              Motivate your audience to join and help them to get an invite by
              tweeting about Idena
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
                <Text color="muted">Your Referral link</Text>
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
              <Text color="gray.500" fontWeight={500}>
                {refLink}
              </Text>
            </Box>
          </UniversalListItem>
          <UniversalListItem
            isLast
            title="Help your invitees through the onboarding process"
          >
            <Text>
              Remind him about the validation ceremony and help them get
              validated
            </Text>
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
          mt={1.5}
        >
          {title}
        </Text>
        {children}
        <Divider
          display={isLast ? 'none' : 'block'}
          position={['initial', 'absolute']}
          top="12px"
          left="-15px"
          mt={[6, 0]}
          borderColor={['brandGray.800', 'gray.50']}
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
    <ComponentLink label={label} href={href} {...props}>
      {isDesktop ? label : children}
    </ComponentLink>
  )
}

function SimpleLink({href, children, ...props}) {
  const isDesktop = useIsDesktop()
  const ComponentLink = isDesktop ? ExternalLink : Link

  return (
    <ComponentLink color="brandBlue.500" href={href} {...props}>
      {children}
    </ComponentLink>
  )
}
