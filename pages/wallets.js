import React, {useEffect, useState} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import {useTranslation} from 'react-i18next'

import {useQuery} from 'react-query'
import {Heading} from '@chakra-ui/core'
import theme, {rem} from '../shared/theme'
import {Box, Link} from '../shared/components'
import Flex from '../shared/components/flex'
import Actions from '../shared/components/actions'
import IconLink from '../shared/components/icon-link'

import TotalAmount from '../screens/wallets/components/total-amount'
import WalletTransactions from '../screens/wallets/components/wallet-transactions'
import TransferForm from '../screens/wallets/components/transfer-form'
import ReceiveForm from '../screens/wallets/components/receive-form'
import KillForm from '../screens/wallets/components/kill-form'
import {Page, PageTitle} from '../screens/app/components'
import Layout from '../shared/components/layout'
import {useAuthState} from '../shared/providers/auth-context'
import {fetchBalance} from '../shared/api/wallet'
import WalletCard from '../screens/wallets/components/wallet-card'

const walletType = {
  Balance: 0,
  Stake: 1,
}

export default function Index() {
  const {t} = useTranslation()

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
  const [isWithdrawStakeFormOpen, setIsWithdrawStakeFormOpen] = useState(false)

  const [activeWallet, setActiveWallet] = useState(walletType.Balance)

  return (
    <Layout>
      <Page>
        <PageTitle>{t('Wallets')}</PageTitle>
        <Box>
          <Flex css={{justifyContent: 'space-between', marginBottom: 20}}>
            <div>
              <TotalAmount
                amount={balance + stake}
                percentChanges={0}
                amountChanges={0}
                isLoading={isLoading}
              />
            </div>
            <div>
              <Actions>
                <IconLink
                  disabled={activeWallet === walletType.Stake}
                  icon={<i className="icon icon--withdraw" />}
                  onClick={() => {
                    setIsTransferFormOpen(!isTransferFormOpen)
                  }}
                >
                  {t('Send')}
                </IconLink>
                <IconLink
                  disabled={activeWallet === walletType.Stake}
                  icon={<i className="icon icon--deposit" />}
                  onClick={() => {
                    setIsReceiveFormOpen(!isReceiveFormOpen)
                  }}
                >
                  {t('Receive')}
                </IconLink>
              </Actions>
            </div>
          </Flex>
          <div>
            <Flex>
              <WalletCard
                wallet={{name: 'Main', balance, isStake: false}}
                isSelected={activeWallet === walletType.Balance}
                onSend={() => setIsTransferFormOpen(true)}
                onReceive={() => setIsReceiveFormOpen(true)}
                onClick={() => setActiveWallet(walletType.Balance)}
                isLoading={isLoading}
              />
              <WalletCard
                wallet={{name: 'Stake', balance: stake, isStake: true}}
                isSelected={activeWallet === walletType.Stake}
                onWithdrawStake={() => setIsWithdrawStakeFormOpen(true)}
                onClick={() => setActiveWallet(walletType.Stake)}
                isLoading={isLoading}
              />
            </Flex>
          </div>
          <Heading fontSize="lg" fontWeight={500} mb={2} mt={8}>
            {t('Recent transactions')}
          </Heading>

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
          <WalletTransactions address={coinbase} />
        </Box>
        <TransferForm
          isOpen={isTransferFormOpen}
          onClose={() => setIsTransferFormOpen(false)}
        />

        <ReceiveForm
          address={coinbase}
          isOpen={isReceiveFormOpen}
          onClose={() => setIsReceiveFormOpen(false)}
        />

        <KillForm
          isOpen={isWithdrawStakeFormOpen}
          onClose={() => setIsWithdrawStakeFormOpen(false)}
        />
      </Page>
    </Layout>
  )
}
