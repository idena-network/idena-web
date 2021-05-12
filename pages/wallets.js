import React, {useEffect} from 'react'
import {FiChevronRight} from 'react-icons/fi'
import {useTranslation} from 'react-i18next'

import theme, {rem} from '../shared/theme'
import {Box, Link, SubHeading} from '../shared/components'
import Flex from '../shared/components/flex'
import Actions from '../shared/components/actions'
import IconLink from '../shared/components/icon-link'

import TotalAmount from '../screens/wallets/components/total-amount'
import WalletList from '../screens/wallets/components/wallet-list'
import WalletActions from '../screens/wallets/components/wallet-actions'
import TransferForm from '../screens/wallets/components/transfer-form'
import ReceiveForm from '../screens/wallets/components/receive-form'
import KillForm from '../screens/wallets/components/kill-form'
import {useWallets} from '../shared/hooks/use-wallets'
import {Spinner} from '../shared/components/spinner'
import {Page, PageTitle} from '../screens/app/components'
import Layout from '../shared/components/layout'
import {Drawer} from '../shared/components/components'

export default function Index() {
  const {t} = useTranslation()

  const {wallets, totalAmount, txs, status} = useWallets()

  const [isReceiveFormOpen, setIsReceiveFormOpen] = React.useState(false)
  const [isTransferFormOpen, setIsTransferFormOpen] = React.useState(false)
  const [isWithdrawStakeFormOpen, setIsWithdrawStakeFormOpen] = React.useState(
    false
  )
  const handleCloseWithdrawStakeForm = () => setIsWithdrawStakeFormOpen(false)
  const handleCloseTransferForm = () => setIsTransferFormOpen(false)
  const handleCloseReceiveForm = () => setIsReceiveFormOpen(false)

  const [activeWallet, setActiveWallet] = React.useState()

  useEffect(() => {
    if (!activeWallet && wallets && wallets.length > 0) {
      setActiveWallet(wallets[0])
    }
  }, [activeWallet, wallets])

  return (
    <Layout>
      <Page>
        <PageTitle>{t('Wallets')}</PageTitle>
        <Box>
          {status === 'fetching' && (
            <Flex>
              <Box style={{transform: 'scale(0.35) translateX(24px)'}}>
                <Spinner color={theme.colors.primary} />
              </Box>
            </Flex>
          )}
          {['success', 'polling'].includes(status) && (
            <>
              <Flex css={{justifyContent: 'space-between', marginBottom: 20}}>
                <div>
                  <TotalAmount
                    amount={totalAmount}
                    percentChanges={0}
                    amountChanges={0}
                  />
                </div>
                <div>
                  <Actions>
                    <IconLink
                      disabled={activeWallet && activeWallet.isStake}
                      icon={<i className="icon icon--withdraw" />}
                      onClick={() => {
                        setIsTransferFormOpen(!isTransferFormOpen)
                      }}
                    >
                      {t('Send')}
                    </IconLink>
                    <IconLink
                      disabled={activeWallet && activeWallet.isStake}
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
                <WalletList
                  wallets={wallets}
                  activeWallet={activeWallet}
                  onChangeActiveWallet={wallet => setActiveWallet(wallet)}
                  onSend={() => setIsTransferFormOpen(true)}
                  onReceive={() => setIsReceiveFormOpen(true)}
                  onWithdrawStake={() => setIsWithdrawStakeFormOpen(true)}
                />
              </div>

              <SubHeading>{t('Recent transactions')}</SubHeading>

              <Link
                target="_blank"
                href={`https://scan.idena.io/address/${activeWallet?.address}#rewards`}
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
              <WalletActions transactions={txs} />
            </>
          )}
        </Box>
        <TransferForm
          isOpen={isTransferFormOpen}
          onClose={handleCloseTransferForm}
          onSuccess={handleCloseTransferForm}
        />

        <Drawer isOpen={isReceiveFormOpen} onClose={handleCloseReceiveForm}>
          <ReceiveForm address={wallets[0] && wallets[0].address} />
        </Drawer>

        <Drawer
          isOpen={isWithdrawStakeFormOpen}
          onClose={handleCloseWithdrawStakeForm}
        >
          <KillForm
            onSuccess={handleCloseWithdrawStakeForm}
            onFail={handleCloseWithdrawStakeForm}
          />
        </Drawer>
      </Page>
    </Layout>
  )
}
