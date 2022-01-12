import React, {useState} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import {useTranslation} from 'react-i18next'

import {useQuery} from 'react-query'
import {
  Heading,
  Flex as ChakraFlex,
  Box as ChakraBox,
  Box,
} from '@chakra-ui/react'
import {useRouter} from 'next/router'
import theme, {rem} from '../shared/theme'
import {Link} from '../shared/components'
import Flex from '../shared/components/flex'
import Actions from '../shared/components/actions'

import TotalAmount from '../screens/wallets/components/total-amount'
import WalletTransactions from '../screens/wallets/components/wallet-transactions'
import TransferForm from '../screens/wallets/components/transfer-form'
import ReceiveForm from '../screens/wallets/components/receive-form'
import {Page, PageTitleNew} from '../screens/app/components'
import Layout from '../shared/components/layout'
import {useAuthState} from '../shared/providers/auth-context'
import {fetchBalance} from '../shared/api/wallet'
import WalletCard from '../screens/wallets/components/wallet-card'
import {IconButton} from '../shared/components/button'
import {Avatar} from '../shared/components/components'
import {AngleArrowBackIcon, OpenExplorerIcon} from '../shared/components/icons'
import {WideLink} from '../screens/profile/components'

export default function Index() {
  const {t} = useTranslation()
  const router = useRouter()

  const {coinbase} = useAuthState()

  const {
    data: {balance, stake},
    status,
  } = useQuery(['get-balance', coinbase], () => fetchBalance(coinbase), {
    initialData: {balance: 0, stake: 0},
    enabled: !!coinbase,
    refetchInterval: 10 * 1000,
  })

  const isLoading = status === 'loading'

  const [isReceiveFormOpen, setIsReceiveFormOpen] = useState(false)
  const [isTransferFormOpen, setIsTransferFormOpen] = useState(false)

  return (
    <Layout>
      <Page>
        <AngleArrowBackIcon
          position="absolute"
          left={4}
          top="28px"
          h="28px"
          w="28px"
          onClick={() => {
            router.push('/home')
          }}
        />
        <PageTitleNew>{t('Wallets')}</PageTitleNew>
        <ChakraBox w="100%">
          <ChakraFlex
            direction={['column', 'row']}
            justify="space-between"
            mb="20px"
          >
            <ChakraFlex direction="row" align="center" mb={[4, 0]}>
              <Avatar
                display={['block', 'none']}
                size="80px"
                mr={6}
                address={coinbase}
              />
              <TotalAmount
                amount={parseFloat(balance) + parseFloat(stake)}
                isLoading={isLoading}
              />
            </ChakraFlex>
            <ChakraFlex justify={['center', 'flex-start']}>
              <div>
                <Actions>
                  <IconButton
                    h={[12, 'auto']}
                    mx={[3, 0]}
                    fontSize={['mobile', 'md']}
                    color={['red.500', 'blue.500']}
                    icon={<i className="icon icon--withdraw" />}
                    onClick={() => {
                      setIsTransferFormOpen(!isTransferFormOpen)
                    }}
                  >
                    {t('Send')}
                  </IconButton>
                  <IconButton
                    h={[12, 'auto']}
                    mx={[3, 0]}
                    fontSize={['mobile', 'md']}
                    icon={<i className="icon icon--deposit" />}
                    onClick={() => {
                      setIsReceiveFormOpen(!isReceiveFormOpen)
                    }}
                  >
                    {t('Receive')}
                  </IconButton>
                </Actions>
              </div>
            </ChakraFlex>
          </ChakraFlex>
          <div>
            <ChakraFlex
              mb={[6, 0]}
              overflowX={['auto', 'initial']}
              sx={{
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }}
            >
              <WalletCard
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
            </ChakraFlex>
          </div>

          <WideLink
            display={['initial', 'none']}
            label={t('More details in Explorer')}
            href={`https://scan.idena.io/address/${coinbase}#rewards`}
            isNewTab
          >
            <Box boxSize={8} backgroundColor="brandBlue.10" borderRadius="10px">
              <OpenExplorerIcon boxSize={5} mt="6px" ml="6px" />
            </Box>
          </WideLink>

          <Heading
            fontSize={['md', 'lg']}
            color={['muted', 'brandGray.500']}
            fontWeight={[400, 500]}
            mb={2}
            mt={[4, 8]}
          >
            {t('Recent transactions')}
          </Heading>

          <ChakraBox display={['none', 'block']}>
            <Link
              target="_blank"
              href={`https://scan.idena.io/address/${coinbase}#rewards`}
              color={theme.colors.primary}
              style={{
                marginBottom: rem(19),
              }}
            >
              <Flex>
                <span>{t('See Explorer for rewards and penalties')} </span>

                <FiChevronRight
                  style={{
                    position: 'relative',
                    top: '3px',
                  }}
                  fontSize={rem(14)}
                />
              </Flex>
            </Link>
          </ChakraBox>
          <WalletTransactions address={coinbase} />
        </ChakraBox>
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
