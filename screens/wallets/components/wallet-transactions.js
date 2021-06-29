import React from 'react'
import PropTypes from 'prop-types'
import {ellipsis, rgba} from 'polished'
import {useTranslation} from 'react-i18next'
import {useInfiniteQuery} from 'react-query'
import {Flex, Stack} from '@chakra-ui/core'
import theme, {rem} from '../../../shared/theme'
import Avatar from '../../../shared/components/avatar'
import {
  Table,
  TableCol,
  TableRow,
  TableHeaderCol,
  TableHint,
} from '../../../shared/components/table'
import {fetchApiTransactions} from '../../../shared/api/wallet'
import {FlatButton} from '../../../shared/components/button'
import {Skeleton} from '../../../shared/components/components'
import {HASH_IN_MEMPOOL} from '../../../shared/hooks/use-tx'

function RowStatus({direction, type, isMining, walletName, ...props}) {
  const txColor =
    direction === 'Sent' ? theme.colors.danger : theme.colors.primary

  const iconColor = isMining ? theme.colors.muted : txColor

  return (
    <div {...props} className="status">
      <div className="icn">
        {direction === 'Sent' ? (
          <i className="icon icon--up_arrow" />
        ) : (
          <i className="icon icon--down_arrow" />
        )}
      </div>
      <div className="content">
        <div className="type">{type}</div>
        <div
          className="name"
          style={{
            color: theme.colors.muted,
          }}
        >
          {walletName}
        </div>
      </div>
      <style jsx>{`
        .icn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          padding: ${rem(8)};
          text-align: center;
          float: left;
          margin-right: ${rem(12)};
          background-color: ${rgba(iconColor, 0.12)};
          color: ${iconColor};
        }
        .content {
          overflow: hidden;
          padding-top: ${rem(3)};
        }
        .name {
          font-size: ${rem(13)};
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

RowStatus.propTypes = {
  direction: PropTypes.oneOf(['Sent', 'Received']),
  type: PropTypes.string,
  isMining: PropTypes.bool,
  walletName: PropTypes.string,
}

const LIMIT = 10

function transactionType(tx) {
  const {type} = tx
  const {data} = tx
  if (type === 'SendTx') return 'Transfer'
  if (type === 'ActivationTx') return 'Invitation activated'
  if (type === 'InviteTx') return 'Invitation issued'
  if (type === 'KillInviteeTx') return 'Invitation terminated'
  if (type === 'KillTx') return 'Identity terminated'
  if (type === 'SubmitFlipTx') return 'Flip submitted'
  if (type === 'DelegateTx') return 'Delegatee added'
  if (type === 'UndelegateTx') return 'Delegatee removed'
  if (type === 'OnlineStatusTx')
    return `Mining status ${data && data.becomeOnline ? 'On' : 'Off'}`
  return type
}

const lowerCase = str => str?.toLowerCase()

// eslint-disable-next-line react/prop-types
function WalletTransactions({address}) {
  const {t} = useTranslation(['translation', 'error'])

  const fetchTxs = ({pageParam = null}) =>
    fetchApiTransactions(address, LIMIT, pageParam).then(p => {
      const {result, continuationToken} = p
      if (!result) return {result: []}
      const newResult = result.map(tx => {
        const fromWallet =
          lowerCase(address) === lowerCase(tx.from) ? address : null
        const toWallet =
          lowerCase(address) === lowerCase(tx.to) ? address : null

        const direction = fromWallet ? t('Sent') : t('Received')

        const typeName = tx.type === 'SendTx' ? direction : transactionType(tx)

        const sourceWallet = fromWallet || toWallet
        const signAmount = fromWallet ? -tx.amount : `+${tx.amount}`
        const counterParty = fromWallet ? tx.to : tx.from
        const counterPartyWallet = fromWallet ? toWallet : fromWallet
        const isMining = tx.blockHash === HASH_IN_MEMPOOL

        const nextTx = {
          ...tx,
          typeName,
          wallet: sourceWallet,
          direction,
          signAmount,
          counterParty,
          counterPartyWallet,
          isMining,
        }
        return nextTx
      })
      return {result: newResult, continuationToken}
    })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery(['transactions', address], fetchTxs, {
    getNextPageParam: lastPage => lastPage?.continuationToken,
    refetchInterval: 10 * 1000,
  })

  const isLoading = status === 'loading'

  return (
    <div>
      <Table style={{tableLayout: 'fixed'}}>
        <thead>
          <TableRow>
            <TableHeaderCol>{t('Transaction')}</TableHeaderCol>
            <TableHeaderCol>{t('Address')}</TableHeaderCol>
            <TableHeaderCol className="text-right">
              {t('Amount, iDNA')}
            </TableHeaderCol>
            <TableHeaderCol className="text-right">
              {t('Fee, iDNA')}
            </TableHeaderCol>
            <TableHeaderCol>{t('Date')}</TableHeaderCol>
            <TableHeaderCol>{t('Blockchain transaction ID')}</TableHeaderCol>
          </TableRow>
        </thead>
        <tbody>
          {!isLoading &&
            data &&
            data.pages.map((group, i) => (
              <React.Fragment key={i}>
                {group.result.map((tx, k) => (
                  <TableRow key={k}>
                    <TableCol>
                      <RowStatus
                        isMining={tx.isMining}
                        direction={tx.direction}
                        type={tx.typeName}
                        walletName="Main"
                      />
                    </TableCol>

                    <TableCol>
                      {(!tx.to && '\u2013') || (
                        <Flex align="center">
                          <Avatar
                            username={lowerCase(tx.counterParty)}
                            size={32}
                          />
                          <div>
                            <div>
                              {tx.direction === 'Sent' ? t('To') : t('From')}{' '}
                              {tx.counterPartyWallet
                                ? `${t('wallet')} Main`
                                : t('address')}
                            </div>
                            <TableHint style={{...ellipsis(rem(130))}}>
                              {tx.counterParty}
                            </TableHint>
                          </div>
                        </Flex>
                      )}
                    </TableCol>

                    <TableCol className="text-right">
                      <div
                        style={{
                          color:
                            tx.signAmount < 0
                              ? theme.colors.danger
                              : theme.colors.text,
                        }}
                      >
                        {(tx.type === 'kill' && t('See in Explorer...')) ||
                          (tx.amount === '0' ? '\u2013' : tx.signAmount)}
                      </div>
                    </TableCol>

                    <TableCol className="text-right">
                      {((!tx.isMining || tx.maxFee === '0') &&
                        (tx.fee === '0' ? '\u2013' : tx.fee)) || (
                        <div>
                          <div> {tx.maxFee} </div>
                          <TableHint>{t('Fee limit')}</TableHint>
                        </div>
                      )}

                      {}
                    </TableCol>
                    <TableCol>
                      {!tx.timestamp
                        ? '\u2013'
                        : new Date(tx.timestamp).toLocaleString()}
                    </TableCol>

                    <TableCol>
                      {(tx.isMining && t('Mining...')) || (
                        <div>
                          <div> {t('Confirmed')}</div>
                          <TableHint style={{...ellipsis(rem(130))}}>
                            {tx.isMining ? '' : tx.hash}
                          </TableHint>
                        </div>
                      )}
                    </TableCol>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
        </tbody>
      </Table>
      {isLoading && (
        <Stack spacing={2} mt={2}>
          {new Array(10).fill(0).map(() => (
            <Skeleton height={rem(25)} w="full"></Skeleton>
          ))}
        </Stack>
      )}
      {!isLoading && hasNextPage && (
        <Flex justify="center" mt={2}>
          <FlatButton
            color={theme.colors.primary}
            style={{
              fontSize: rem(13),
              marginBottom: rem(10),
              textAlign: 'center',
            }}
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? t('Loading more...') : t('Load More')}
          </FlatButton>
        </Flex>
      )}

      {!isLoading && data?.pages && data.pages[0].result?.length === 0 && (
        <div
          style={{
            color: theme.colors.muted,
            textAlign: 'center',
            lineHeight: '40vh',
          }}
        >
          {t(`You don't have any transactions yet`)}
        </div>
      )}
    </div>
  )
}

export default WalletTransactions
