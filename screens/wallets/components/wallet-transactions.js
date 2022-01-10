import React from 'react'
import PropTypes from 'prop-types'
import {ellipsis, rgba} from 'polished'
import {useTranslation} from 'react-i18next'
import {useInfiniteQuery} from 'react-query'
import {Box, Flex, Divider, Stack, Table, Thead, Tbody} from '@chakra-ui/react'
import theme, {rem} from '../../../shared/theme'
import Avatar from '../../../shared/components/avatar'
import {
  TableCol,
  TableRow,
  TableHeaderCol,
  TableHint,
} from '../../../shared/components/table'
import {fetchApiTransactions} from '../../../shared/api/wallet'
import {FlatButton} from '../../../shared/components/button'
import {Skeleton} from '../../../shared/components/components'
import {lowerCase} from '../../../shared/utils/utils'

function RowStatus({direction, type, isMining, walletName, tx, ...props}) {
  const txColor =
    direction === 'Sent' ? theme.colors.danger : theme.colors.primary

  const iconColor = isMining ? theme.colors.muted : txColor

  return (
    <div {...props} className="status">
      <Box
        h={[10, 8]}
        w={[10, 8]}
        backgroundColor={rgba(iconColor, 0.12)}
        color={iconColor}
        borderRadius={['12px', '8px']}
        mt={['6px', 0]}
        mr={[4, 3]}
        p={2}
        float="left"
        fontSize={['130%', '100%']}
        textAlign="center"
      >
        {direction === 'Sent' ? (
          <i className="icon icon--up_arrow" />
        ) : (
          <i className="icon icon--down_arrow" />
        )}
      </Box>
      <Box className="content" overflow="hidden" pt={['2px', '3px']}>
        <Flex
          fontSize={['base', 'md']}
          fontWeight={[500, 400]}
          justify={['space-between', 'flex-start']}
        >
          <Box
            className="type"
            textOverflow={['ellipsis', 'initial']}
            overflow={['hidden', 'auto']}
            maxW={['50%', 'auto']}
            whiteSpace={['nowrap', 'initial']}
          >
            {type}
          </Box>
          <Box display={['block', 'none']}>
            {/* eslint-disable-next-line react/prop-types */}
            {(tx.type === 'kill' && 'See in Explorer...') ||
              // eslint-disable-next-line react/prop-types
              (tx.amount === '0' ? '\u2013' : tx.signAmount + ' iDNA')}
          </Box>
        </Flex>
        <Flex justify={['space-between', 'flex-start']}>
          <Box display={['block', 'none']}>
            {/* eslint-disable-next-line react/prop-types */}
            {!tx.timestamp ? '\u2013' : new Date(tx.timestamp).toLocaleDateString()}
          </Box>
          <Box
            className="name"
            color={theme.colors.muted}
            fontSize="md"
            fontWeight={500}
          >
            {walletName}
          </Box>
        </Flex>
      </Box>
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
        const isMining = !tx.timestamp

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
        <Thead display={['none', 'table-header-group']}>
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
        </Thead>
        <Tbody>
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
                        tx={tx}
                      />
                    </TableCol>

                    <TableCol display={['none', 'table-cell']}>
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

                    <TableCol
                      display={['none', 'table-cell']}
                      textAlign="right"
                    >
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

                    <TableCol
                      display={['none', 'table-cell']}
                      textAlign="right"
                    >
                      {(!tx.isMining &&
                        (tx.fee === '0' ? '\u2013' : tx.fee)) || (
                        <div>
                          <div> {tx.maxFee} </div>
                          <TableHint>{t('Fee limit')}</TableHint>
                        </div>
                      )}

                      {}
                    </TableCol>
                    <TableCol display={['none', 'table-cell']}>
                      {!tx.timestamp
                        ? '\u2013'
                        : new Date(tx.timestamp).toLocaleString()}
                    </TableCol>

                    <TableCol display={['none', 'table-cell']}>
                      <div>
                        <div>
                          {tx.isMining ? t('Mining...') : t('Confirmed')}
                        </div>
                        <TableHint style={{...ellipsis(rem(130))}}>
                          {tx.hash}
                        </TableHint>
                      </div>
                    </TableCol>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
        </Tbody>
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
            mb={2.5}
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
