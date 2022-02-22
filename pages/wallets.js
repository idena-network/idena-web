import React, {useState} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import {useTranslation} from 'react-i18next'

import {
  Heading,
  Flex,
  Box,
  Link,
  Icon,
  Divider,
  Stack,
  TabList,
  TabPanels,
  Tabs,
  TabPanel,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'

import {Page, PageTitleNew} from '../screens/app/components'
import Layout from '../shared/components/layout'
import {useAuthState} from '../shared/providers/auth-context'
import {IconButton} from '../shared/components/button'
import {Avatar, Badge} from '../shared/components/components'
import {
  AngleArrowBackIcon,
  OpenExplorerIcon,
  ReceiveIcon,
  SendOutIcon,
} from '../shared/components/icons'
import {
  ReceiveForm,
  TotalAmount,
  TransactionsTab,
  TransferForm,
  WalletCard,
  WalletPendingTransactions,
  WalletTransactions,
} from '../screens/wallets/components'
import {useDeferredVotes} from '../screens/oracles/hooks'
import {useBalance} from '../shared/hooks/use-balance'

export default function Index() {
  const {t} = useTranslation()
  const router = useRouter()

  const {coinbase} = useAuthState()

  const [{all}] = useDeferredVotes()

  const {
    data: {balance, stake},
    isLoading,
  } = useBalance()

  const [isReceiveFormOpen, setIsReceiveFormOpen] = useState(false)
  const [isTransferFormOpen, setIsTransferFormOpen] = useState(false)

  return (
    <Layout>
      <Page pt={[4, 6]}>
        <AngleArrowBackIcon
          display={['block', 'none']}
          position="absolute"
          left={4}
          top={4}
          h="28px"
          w="28px"
          onClick={() => {
            router.push('/home')
          }}
        />
        <PageTitleNew>{t('Wallets')}</PageTitleNew>
        <Flex w="100%" flexFlow="row wrap">
          <Flex flexBasis={['100%', '50%']} order={1}>
            <Avatar
              display={['block', 'none']}
              size="80px"
              mr={6}
              address={coinbase}
            />
            <TotalAmount
              amount={parseFloat(balance) + parseFloat(stake)}
              isLoading={isLoading}
              mt={[2, 0]}
            />
          </Flex>
          <Flex flexBasis={['100%', '50%']} order={[4, 2]} mt={1}>
            <Stack
              justifyContent={['space-around', 'flex-end']}
              isInline
              h={6}
              alignItems="center"
              flexBasis="100%"
            >
              <Divider orientation="vertical" display={['none', 'initial']} />
              <IconButton
                mx={[3, 0]}
                fontSize={['mobile', 'md']}
                color={['red.500', 'blue.500']}
                icon={
                  <SendOutIcon boxSize={5} color={['red.500', 'blue.500']} />
                }
                onClick={() => {
                  setIsTransferFormOpen(!isTransferFormOpen)
                }}
              >
                {t('Send')}
              </IconButton>
              <Divider orientation="vertical" />
              <IconButton
                mx={[3, 0]}
                fontSize={['mobile', 'md']}
                icon={<ReceiveIcon boxSize={5} color="blue.500" />}
                onClick={() => {
                  setIsReceiveFormOpen(!isReceiveFormOpen)
                }}
              >
                {t('Receive')}
              </IconButton>
            </Stack>
          </Flex>
          <Flex flexBasis="100%" order={[2, 3]} mt={[8, 2]}>
            <Link
              target="_blank"
              href={`https://scan.idena.io/address/${coinbase}`}
              color="blue.500"
              fontWeight={500}
              w={['100%', 'auto']}
            >
              <Flex
                fontSize={['base', 'md']}
                alignItems="center"
                w={['100%', 'auto']}
              >
                <Box
                  boxSize={8}
                  backgroundColor="brandBlue.10"
                  borderRadius="10px"
                  display={['inline-block', 'none']}
                >
                  <OpenExplorerIcon boxSize={5} mt={1} ml={3 / 2} />
                </Box>
                <Box
                  as="span"
                  ml={[3, 0]}
                  borderBottomWidth={['1px', 0]}
                  flex={[1, 'auto']}
                  pb={[1, 0]}
                >
                  {t('More details in explorer')}{' '}
                  <Icon display={['none', 'inline']} as={FiChevronRight} />
                </Box>
              </Flex>
            </Link>
          </Flex>
          <Flex
            flexBasis="100%"
            order={[3, 4]}
            overflowX={['auto', 'initial']}
            sx={{
              '&::-webkit-scrollbar': {
                display: 'none',
              },
            }}
            mt={8}
            mb={[6, 0]}
          >
            <WalletCard
              address={coinbase}
              wallet={{name: 'Main', balance, isStake: false}}
              isSelected
              onSend={() => setIsTransferFormOpen(true)}
              onReceive={() => setIsReceiveFormOpen(true)}
              isLoading={isLoading}
            />
            <WalletCard
              wallet={{name: 'Stake', balance: stake, isStake: true}}
              isLoading={isLoading}
            />
          </Flex>
        </Flex>

        <Heading
          fontSize="lg"
          color="brandGray.500"
          fontWeight={500}
          mb={0}
          mt={8}
          display={['none', 'block']}
        >
          {t('Transactions')}
        </Heading>

        {all.length > 0 ? (
          <Tabs variant="unstyled" w={['100%', 'auto']} mt={[8, 6]}>
            <TabList bg={['gray.50', 'white']} borderRadius="md" p={[1, 0]}>
              <TransactionsTab>
                {t('Scheduled')}
                {all.length > 0 && (
                  <>
                    <Badge ml={2} display={['none', 'inline-block']}>
                      {all.length}
                    </Badge>
                    <Box as="span" ml={1} display={['inline', 'none']}>
                      {all.length}
                    </Box>
                  </>
                )}
              </TransactionsTab>
              <TransactionsTab> {t('Recent')}</TransactionsTab>
            </TabList>
            <TabPanels mt={4}>
              <TabPanel p={0}>
                <WalletPendingTransactions />
              </TabPanel>
              <TabPanel p={0}>
                <WalletTransactions address={coinbase} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        ) : (
          <Flex mt={4}>
            <WalletTransactions address={coinbase} />
          </Flex>
        )}

        <TransferForm
          isOpen={isTransferFormOpen}
          onClose={() => setIsTransferFormOpen(false)}
        />

        <ReceiveForm
          address={coinbase}
          isOpen={isReceiveFormOpen}
          onClose={() => setIsReceiveFormOpen(false)}
        />
      </Page>
    </Layout>
  )
}
