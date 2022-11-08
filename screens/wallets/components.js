import {ArrowDownIcon, ArrowUpIcon, LockIcon} from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  DrawerContent,
  DrawerOverlay,
  DrawerBody as ChakraDrawerBody,
  DrawerHeader as ChakraDrawerHeader,
  Flex,
  FormControl,
  Heading,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Stack,
  Tab,
  Table,
  Tbody,
  Td,
  Text,
  Thead,
  Tr,
  useBreakpointValue,
  useClipboard,
  useDisclosure,
  useTheme,
} from '@chakra-ui/react'
import React, {forwardRef, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import QRCode from 'qrcode.react'
import {transparentize} from '@chakra-ui/theme-tools'
import {useInfiniteQuery} from 'react-query'
import {
  FlatButton,
  IconButton,
  PrimaryButton,
} from '../../shared/components/button'
import {
  Avatar,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  FormControlWithLabel,
  FormLabel,
  Input,
  RoundedTh,
  Skeleton,
} from '../../shared/components/components'
import {
  AngleArrowBackIcon,
  BasketIcon,
  MoreIcon,
  OpenExplorerIcon,
  ReceiveIcon,
  SendIcon,
  SendOutIcon,
  TimerIcon,
} from '../../shared/components/icons'
import useClickOutside from '../../shared/hooks/use-click-outside'
import {
  getDateFromBlocks,
  lowerCase,
  openExternalUrl,
  toLocaleDna,
  toLocaleNumber,
} from '../../shared/utils/utils'
import {useFailToast} from '../../shared/hooks/use-toast'
import {useAuthState} from '../../shared/providers/auth-context'
import {sendDna} from '../../shared/api/utils'
import {getTxs} from '../../shared/api/indexer'
import {isAddress, transactionType} from './utils'
import useSyncing from '../../shared/hooks/use-syncing'
import {WideLink} from '../home/components'
import {useDeferredVotes} from '../oracles/hooks'
import {AdDrawer} from '../ads/containers'
import {useTrackTx} from '../ads/hooks'

export function TransactionsTab(props) {
  return (
    <Tab
      color={['gray.500', 'muted']}
      fontWeight="500"
      fontSize={['mobile', 'md']}
      _selected={{
        color: ['white', 'blue.500'],
        bg: ['gray.500', 'gray.50'],
        borderRadius: 'md',
      }}
      mr={[0, 2]}
      w={['50%', 'auto']}
      py={3 / 2}
      {...props}
    />
  )
}

export function TotalAmount({amount, isLoading, ...props}) {
  const {t} = useTranslation()
  const dna = toLocaleDna(undefined, {maximumFractionDigits: 4})
  return (
    <Box {...props}>
      <Text color="muted" fontSize={['mdx', 'md']}>
        {t('Total amount')}
      </Text>
      <Box mt={[2, 0]}>
        {isLoading ? (
          <Skeleton height={7} w={40} />
        ) : (
          <Text fontSize="lg" fontWeight={500}>
            {dna(amount)}
          </Text>
        )}
      </Box>
    </Box>
  )
}

// eslint-disable-next-line react/display-name
const WalletMenu = forwardRef((props, ref) => (
  <Box
    bg="white"
    py={1}
    borderRadius="md"
    boxShadow="0 4px 6px 0 rgba(83, 86, 92, 0.24), 0 0 2px 0 rgba(83, 86, 92, 0.2)"
    w="145px"
    ref={ref}
    {...props}
  />
))

function WalletMenuItem({icon, color = 'gray.080', ...props}) {
  return (
    <IconButton
      w="100%"
      color={color}
      icon={React.cloneElement(icon, {
        boxSize: 4,
        mr: 2,
      })}
      _hover={{bg: 'gray.50'}}
      _active={{bg: 'gray.50'}}
      {...props}
    />
  )
}

export function WalletCard({
  address,
  wallet,
  isSelected,
  onSend,
  onReceive,
  isLoading,
  ...props
}) {
  const {name, balance, isStake} = wallet

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef()

  const {
    isOpen: isOpenWalletCardModal,
    onOpen: onOpenWalletCardModal,
    onClose: onCloseWalletCardModal,
  } = useDisclosure()

  const onModalOpen = useBreakpointValue([
    onOpenWalletCardModal,
    () => {
      setIsMenuOpen(!isMenuOpen)
    },
  ])

  useClickOutside(menuRef, () => {
    setIsMenuOpen(false)
  })

  const {t} = useTranslation()

  const dna = toLocaleDna(undefined, {maximumFractionDigits: 4})

  return (
    <Box
      background={isSelected ? 'blue.500' : 'gray.50'}
      borderRadius="8px"
      color={isSelected ? 'white' : 'gray.500'}
      position="relative"
      p={4}
      mr={6}
      minW="195px"
      w={['196px', '230px']}
      {...props}
    >
      <Text fontWeight={500} fontSize="mdx">
        {name.length > 20 ? `${name.substr(0, 20)}...` : name}
      </Text>

      {isStake && <LockIcon position="absolute" top={3} right={3} />}

      {!isStake && (
        <Box position="absolute" top={3} right={3}>
          <MoreIcon cursor="pointer" onClick={onModalOpen} boxSize={5} />
          {isMenuOpen && (
            <Box position="absolute" top={6} right={0} zIndex={2}>
              <WalletMenu ref={menuRef}>
                <WalletMenuItem
                  onClick={async () => {
                    setIsMenuOpen(false)
                    onSend(wallet)
                  }}
                  isDisabled={isStake}
                  icon={<SendOutIcon color="blue.500" />}
                >
                  {t('Send')}
                </WalletMenuItem>
                <WalletMenuItem
                  onClick={async () => {
                    setIsMenuOpen(false)
                    onReceive(wallet)
                  }}
                  isDisabled={isStake}
                  icon={<ReceiveIcon color="blue.500" />}
                >
                  {t('Receive')}
                </WalletMenuItem>
              </WalletMenu>
            </Box>
          )}
        </Box>
      )}

      <Text
        mt={3}
        fontSize={['base', 'md']}
        fontWeight="normal"
        color={isSelected ? 'whiteAlpha.700' : 'muted'}
      >
        {t('Balance')}
      </Text>

      {isLoading ? (
        <Skeleton height={6} />
      ) : (
        <Text fontSize={['base', 'mdx']} fontWeight={500}>
          {dna(balance)}
        </Text>
      )}

      <CardMenuModal
        address={address}
        wallet={wallet}
        isOpen={isOpenWalletCardModal}
        onClose={onCloseWalletCardModal}
        onSendClick={onSend}
        onReceiveClick={onReceive}
      />
    </Box>
  )
}

function CardMenuModal({
  address,
  wallet,
  onClose,
  onSendClick,
  onReceiveClick,
  ...props
}) {
  const {t} = useTranslation()

  return (
    <Modal variant="mobile" {...props}>
      <ModalOverlay />
      <ModalContent backgroundColor="transparent" mb={10}>
        <ModalBody px={2}>
          <Flex
            direction="column"
            align="center"
            backgroundColor="white"
            borderRadius="14px"
          >
            <Text my={4} fontSize="mdx" fontWeight="normal" color="muted">
              {t('Choose an option')}
            </Text>
            <Divider />
            <Button
              onClick={async () => {
                onSendClick(wallet)
                onClose()
              }}
              size="lgx"
              variant="primaryFlat"
              w="100%"
              color="brandBlue.800"
            >
              Send
            </Button>
            <Divider />
            <Button
              onClick={async () => {
                onReceiveClick(wallet)
                onClose()
              }}
              size="lgx"
              variant="primaryFlat"
              w="100%"
              color="brandBlue.800"
            >
              Receive
            </Button>
            <Divider />
            <Button
              onClick={() => {
                onClose()
                openExternalUrl(`https://scan.idena.io/address/${address}`)
              }}
              size="lgx"
              variant="primaryFlat"
              w="100%"
              color="brandBlue.800"
            >
              Details
            </Button>
          </Flex>
          <Flex backgroundColor="white" borderRadius="14px" mt={2}>
            <Button
              onClick={onClose}
              size="lgx"
              variant="primaryFlat"
              w="100%"
              color="brandBlue.800"
            >
              Cancel
            </Button>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export function ReceiveDrawer({isOpen, onClose, address}) {
  const {t} = useTranslation()
  const {onCopy, hasCopied} = useClipboard(address)

  const size = useBreakpointValue(['lg', 'md'])
  const qrSize = useBreakpointValue(['170px', '128px'])
  const variant = useBreakpointValue(['outlineMobile', 'outline'])

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader mb={[12, 8]}>
        <Flex direction="column" textAlign={['center', 'start']}>
          <Flex
            order={[2, 1]}
            align="center"
            justify="center"
            mt={[8, 0]}
            h={12}
            w={12}
            rounded="xl"
            bg="blue.012"
          >
            <ReceiveIcon boxSize={6} color="blue.500" />
          </Flex>
          <Heading
            order={[1, 2]}
            color="brandGray.500"
            fontSize={['base', 'lg']}
            fontWeight={[['bold', 500]]}
            lineHeight="base"
            mt={[0, 4]}
          >
            {t(`Receive iDNA`)}
          </Heading>
        </Flex>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={[12, 5]}>
          <QRCode
            value={address}
            style={{height: qrSize, width: qrSize, margin: '0 auto'}}
          />
          <FormControl>
            <Flex justify="space-between">
              <FormLabel fontSize={['base', 'md']}>{t('Address')}</FormLabel>
              {hasCopied ? (
                <FormLabel fontSize={['base', 'md']}>{t('Copied!')}</FormLabel>
              ) : (
                <FlatButton onClick={onCopy} mb={2.5}>
                  {t('Copy')}
                </FlatButton>
              )}
            </Flex>
            <Input value={address} size={size} variant={variant} isDisabled />
          </FormControl>
        </Stack>
      </DrawerBody>
    </Drawer>
  )
}

export function SendDrawer(props) {
  const {t} = useTranslation()

  const size = useBreakpointValue(['lg', 'md'])
  const variant = useBreakpointValue(['outlineMobile', 'outline'])
  const labelFontSize = useBreakpointValue(['base', 'md'])

  const failToast = useFailToast()

  const {coinbase, privateKey} = useAuthState()

  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      const {type = typeof action === 'string' && action} = action

      switch (type) {
        case 'submit':
        case 'mine': {
          return {
            ...prevState,
            ...action,
            status: 'pending',
          }
        }
        case 'done':
          return {
            ...prevState,
            hash: null,
            amount: null,
            to: null,
            status: 'done',
          }
        case 'error':
          return {...prevState, error: action.error, status: 'error'}

        default:
          return prevState
      }
    },
    {
      status: 'idle',
    }
  )

  const {onClose} = props

  useTrackTx(state.hash, {
    onMined: React.useCallback(() => {
      dispatch('done')
      onClose()
    }, [onClose]),
  })

  const isPending = state.status === 'pending'

  React.useEffect(() => {
    if (state.status === 'error') {
      failToast({
        title: t('Error while sending transaction'),
        description: state.error,
      })
    }
  }, [failToast, state, t])

  return (
    <AdDrawer
      isMining={isPending}
      {...props}
      onClose={() => {
        dispatch('done')
        // eslint-disable-next-line react/destructuring-assignment
        props.onClose()
      }}
    >
      <DrawerHeader mb="6">
        <Flex direction="column" textAlign={['center', 'start']}>
          <Flex
            order={[2, 1]}
            align="center"
            justify="center"
            mt={[8, 0]}
            h={12}
            w={12}
            rounded="xl"
            bg="red.012"
          >
            <SendOutIcon boxSize={6} color="red.500" />
          </Flex>
          <Heading
            order={[1, 2]}
            color="gray.500"
            fontSize={['base', 'lg']}
            fontWeight={[['bold', 500]]}
            lineHeight="base"
            mt={[0, 4]}
          >
            {t('Send iDNA')}
          </Heading>
        </Flex>
      </DrawerHeader>
      <DrawerBody>
        <form
          id="send"
          onSubmit={async e => {
            e.preventDefault()

            dispatch('submit')

            const {to, amount} = Object.fromEntries(
              new FormData(e.target).entries()
            )

            try {
              if (!isAddress(to)) {
                throw new Error(`Incorrect 'To' address: ${to}`)
              }

              if (amount <= 0) {
                throw new Error(`Incorrect Amount: ${amount}`)
              }

              const result = await sendDna(privateKey, to, amount)

              dispatch({type: 'submit', to, amount, hash: result})
            } catch (error) {
              dispatch({type: 'error', error: error.message})
            }
          }}
        >
          <Stack spacing={[4, 5]}>
            <FormControlWithLabel
              label={t('From')}
              labelFontSize={labelFontSize}
            >
              <Input
                defaultValue={coinbase}
                backgroundColor={['gray.50', 'gray.100']}
                size={size}
                variant={variant}
                isDisabled
              />
            </FormControlWithLabel>
            <FormControlWithLabel label={t('To')} labelFontSize={labelFontSize}>
              <Input
                name="to"
                defaultValue={state.to}
                variant={variant}
                borderColor="gray.100"
                size={size}
              />
            </FormControlWithLabel>
            <FormControlWithLabel
              label={t('Amount')}
              labelFontSize={labelFontSize}
            >
              <Input
                type="number"
                name="amount"
                defaultValue={state.amount}
                min={0}
                step="any"
                variant={variant}
                size={size}
              />
            </FormControlWithLabel>
            <PrimaryButton
              type="submit"
              display={['flex', 'none']}
              fontSize="mobile"
              size="lg"
              isLoading={isPending}
              loadingText={t('Mining...')}
            >
              {t('Send')}
            </PrimaryButton>
          </Stack>
        </form>
      </DrawerBody>
      <DrawerFooter display={['none', 'flex']}>
        <PrimaryButton
          form="send"
          type="submit"
          isLoading={isPending}
          loadingText={t('Mining...')}
        >
          {t('Transfer')}
        </PrimaryButton>
      </DrawerFooter>
    </AdDrawer>
  )
}

function TableHint(props) {
  return <Box color="muted" fontWeight={500} fontSize="sm" {...props} />
}

function TransactionsTd({children, ...props}) {
  return (
    <Td
      px={[0, 3]}
      py={3 / 2}
      borderBottomColor="gray.100"
      borderBottomWidth={[0, '1px']}
      {...props}
    >
      {children}
      <Divider
        display={['block', 'none']}
        color="gray.100"
        mt="6px"
        ml={14}
        w="auto"
      />
    </Td>
  )
}

function TransactionRow({
  title,
  value,
  valueWidth = 'auto',
  children,
  ...props
}) {
  return (
    <Flex direction="column" mt={2} {...props}>
      <Text fontSize="base" fontWeight={500} color="brandGray.500">
        {title}
      </Text>
      <Text fontSize="base" w={valueWidth} fontWeight={400} color="gray.300">
        {value}
      </Text>
      {children}
      <Divider mt={3} />
    </Flex>
  )
}

function RowStatus({direction, isMining, type, walletName, tx, ...props}) {
  const {i18n} = useTranslation()
  const toDna = toLocaleDna(i18n.language, {maximumFractionDigits: 3})

  function getColor(dir) {
    switch (dir) {
      case 'Sent':
        return 'red.500'
      case 'Pending':
        return 'warning.500'
      default:
        return 'gray.500'
    }
  }

  function getIcon(dir) {
    switch (dir) {
      case 'Sent':
        return <ArrowUpIcon boxSize={5} />
      case 'Pending':
        return <TimerIcon boxSize={5} />
      default:
        return <ArrowDownIcon boxSize={5} />
    }
  }

  const chakraTheme = useTheme()
  const color = isMining ? 'muted' : getColor(direction)
  const iconColor = transparentize(color, 0.12)(chakraTheme)

  const {
    isOpen: isOpenTxDetailDrawer,
    onOpen: onOpenTxDetailDrawer,
    onClose: onCloseTxDetailDrawer,
  } = useDisclosure()

  const onDrawerOpen = useBreakpointValue([onOpenTxDetailDrawer, () => {}])

  return (
    <Flex
      {...props}
      onClick={onDrawerOpen}
      className="status"
      alignItems="center"
    >
      <Box
        h={[10, 8]}
        w={[10, 8]}
        backgroundColor={iconColor}
        color={color}
        borderRadius={['xl', 'lg']}
        mr={[4, 3]}
        p={3 / 2}
        float="left"
        fontSize={['130%', '100%']}
        textAlign="center"
      >
        {getIcon(direction)}
      </Box>
      <Box className="content" overflow="hidden" flex={1}>
        <Flex
          fontSize={['base', 'md']}
          fontWeight={[500, 400]}
          justify={['space-between', 'flex-start']}
        >
          <Box
            className="type"
            textOverflow={['ellipsis', 'initial']}
            overflow={['hidden', 'auto']}
            maxW={['50%', 'initial']}
            whiteSpace={['nowrap', 'initial']}
          >
            {type}
          </Box>
          <Box display={['block', 'none']}>{toDna(tx.amount)}</Box>
        </Flex>
        <Flex justify={['space-between', 'flex-start']}>
          <Box display={['block', 'none']}>
            {!tx.timestamp
              ? '\u2013'
              : new Date(tx.timestamp).toLocaleDateString()}
          </Box>
          <Box
            className="name"
            color="muted"
            fontSize={['md', 'sm']}
            fontWeight={500}
          >
            {walletName}
          </Box>
        </Flex>
      </Box>

      <TransactionDetailDrawer
        tx={tx}
        direction={direction}
        isOpen={isOpenTxDetailDrawer}
        onClose={onCloseTxDetailDrawer}
      />
    </Flex>
  )
}

export function WalletTransactions({address}) {
  const LIMIT = 10
  const {t, i18n} = useTranslation()

  const toNumber = toLocaleNumber(i18n.language, {maximumFractionDigits: 4})

  const fetchTxs = ({pageParam = null}) =>
    getTxs(address, LIMIT, pageParam).then(result => {
      if (!result) {
        return {result: []}
      }
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
      return {result: newResult, continuationToken: result.continuationToken}
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
      <Table
        sx={{
          '&': {
            tableLayout: 'fixed',
          },
          tr: {
            '&:last-of-type': {
              td: {borderBottomWidth: 0},
            },
          },
        }}
      >
        <Thead display={['none', 'table-header-group']}>
          <Tr>
            <RoundedTh isLeft>{t('Transaction')}</RoundedTh>
            <RoundedTh>{t('Address')}</RoundedTh>
            <RoundedTh textAlign="right">{t('Amount, iDNA')}</RoundedTh>
            <RoundedTh textAlign="right">{t('Fee, iDNA')}</RoundedTh>
            <RoundedTh>{t('Date')}</RoundedTh>
            <RoundedTh isRight>{t('Blockchain transaction ID')}</RoundedTh>
          </Tr>
        </Thead>
        <Tbody>
          {!isLoading &&
            data &&
            data.pages.map((group, i) => (
              <React.Fragment key={i}>
                {group.result.map((tx, k) => (
                  <Tr key={i + k}>
                    <TransactionsTd>
                      <RowStatus
                        isMining={tx.isMining}
                        direction={tx.direction}
                        type={tx.typeName}
                        walletName="Main"
                        tx={tx}
                      />
                    </TransactionsTd>

                    <TransactionsTd display={['none', 'table-cell']}>
                      {(!tx.to && '\u2013') || (
                        <Flex align="center">
                          <Avatar
                            address={lowerCase(tx.counterParty)}
                            size={8}
                          />
                          <Box ml={3}>
                            <div>
                              {tx.direction === 'Sent' ? t('To') : t('From')}{' '}
                              {tx.counterPartyWallet
                                ? `${t('wallet')} Main`
                                : t('address')}
                            </div>
                            <TableHint>
                              <Text isTruncated w="130px">
                                {tx.counterParty}
                              </Text>
                            </TableHint>
                          </Box>
                        </Flex>
                      )}
                    </TransactionsTd>

                    <TransactionsTd
                      display={['none', 'table-cell']}
                      textAlign="right"
                    >
                      <Box color={tx.signAmount < 0 ? 'red.500' : 'gray.500'}>
                        {(tx.type === 'kill' && t('See in Explorer...')) ||
                          (tx.amount === '0'
                            ? '\u2013'
                            : toNumber(tx.signAmount))}
                      </Box>
                    </TransactionsTd>

                    <TransactionsTd
                      display={['none', 'table-cell']}
                      textAlign="right"
                    >
                      {(!tx.isMining &&
                        (tx.fee === '0' ? '\u2013' : toNumber(tx.fee))) || (
                        <div>
                          <div> {tx.maxFee} </div>
                          <TableHint>{t('Fee limit')}</TableHint>
                        </div>
                      )}
                    </TransactionsTd>
                    <TransactionsTd display={['none', 'table-cell']}>
                      {!tx.timestamp
                        ? '\u2013'
                        : new Date(tx.timestamp).toLocaleString()}
                    </TransactionsTd>

                    <TransactionsTd display={['none', 'table-cell']}>
                      <div>
                        <div>
                          {tx.isMining ? t('Mining...') : t('Confirmed')}
                        </div>
                        <TableHint>
                          <Text isTruncated w="130px">
                            {tx.hash}
                          </Text>
                        </TableHint>
                      </div>
                    </TransactionsTd>
                  </Tr>
                ))}
              </React.Fragment>
            ))}
        </Tbody>
      </Table>
      {isLoading && (
        <Stack spacing={2} mt={2}>
          {new Array(10).fill(0).map((_, i) => (
            <Skeleton key={i} height={10} w="full"></Skeleton>
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
        <Box color="muted" textAlign="center" lineHeight="40vh">
          {t(`You don't have any transactions yet`)}
        </Box>
      )}
    </div>
  )
}

export function WalletPendingTransactions() {
  const {t} = useTranslation()

  const {
    data: {currentBlock},
  } = useSyncing()

  const [{all: votes, isReady}] = useDeferredVotes()

  const data = votes.map(item => ({
    timestamp: getDateFromBlocks(item.block, currentBlock)
      .toDate()
      .getTime(),
    ...item,
  }))

  return (
    <div>
      <Table
        sx={{
          '&': {
            tableLayout: 'fixed',
          },
          tr: {
            '&:last-of-type': {
              td: {borderBottomWidth: 0},
            },
          },
        }}
      >
        <Thead display={['none', 'table-header-group']}>
          <Tr>
            <RoundedTh isLeft>{t('Transaction')}</RoundedTh>
            <RoundedTh>{t('Address')}</RoundedTh>
            <RoundedTh textAlign="right">{t('Amount, iDNA')}</RoundedTh>
            <RoundedTh textAlign="right">{t('Scheduled date')}</RoundedTh>
            <RoundedTh isRight></RoundedTh>
          </Tr>
        </Thead>
        <Tbody>
          {isReady &&
            data.map((tx, k) => (
              <Tr key={k}>
                <TransactionsTd>
                  <RowStatus
                    direction="Pending"
                    type="Send public vote"
                    walletName="Main"
                    tx={tx}
                  />
                </TransactionsTd>

                <TransactionsTd display={['none', 'table-cell']}>
                  <Flex align="center">
                    <Avatar address={lowerCase(tx.contractHash)} size={8} />
                    <Box ml={3}>
                      <Box>{t('To smart contract')}</Box>
                      <TableHint>
                        <Text isTruncated w="130px">
                          {tx.contractHash}
                        </Text>
                      </TableHint>
                    </Box>
                  </Flex>
                </TransactionsTd>

                <TransactionsTd
                  display={['none', 'table-cell']}
                  textAlign="right"
                >
                  <Box color={tx.amount < 0 ? 'red.500' : 'gray.500'}>
                    {tx.amount}
                  </Box>
                </TransactionsTd>

                <TransactionsTd
                  textAlign="right"
                  display={['none', 'table-cell']}
                >
                  <Box>
                    {' '}
                    {!tx.timestamp
                      ? '\u2013'
                      : new Date(tx.timestamp).toLocaleString()}
                  </Box>
                  <Box>
                    <TableHint>{tx.block}</TableHint>
                  </Box>
                </TransactionsTd>

                <TransactionsTd
                  textAlign="right"
                  display={['none', 'table-cell']}
                >
                  <TransactionMenu tx={tx} />
                </TransactionsTd>
              </Tr>
            ))}
        </Tbody>
      </Table>
      {!isReady && (
        <Stack spacing={2} mt={2}>
          {new Array(10).fill(0).map(() => (
            <Skeleton height={10} w="full"></Skeleton>
          ))}
        </Stack>
      )}

      {isReady && data.length === 0 && (
        <Box color="muted" textAlign="center" lineHeight="40vh">
          {t(`You don't have any pending transactions yet`)}
        </Box>
      )}
    </div>
  )
}

function TransactionMenu({tx}) {
  const {t} = useTranslation()
  const failToast = useFailToast()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef()
  const deleteModalDisclosure = useDisclosure()

  const [, {deleteVote, sendVote}] = useDeferredVotes()

  const del = async () => {
    try {
      await deleteVote(tx.id)
    } catch (e) {
      failToast(e.message)
    }
  }

  const send = async () => {
    try {
      await sendVote(tx)
    } catch (e) {
      failToast(e.message)
    }
  }

  useClickOutside(menuRef, () => {
    setIsMenuOpen(false)
  })

  return (
    <Box ml="auto" cursor="pointer" w={3} position="relative">
      <MoreIcon boxSize={5} onClick={() => setIsMenuOpen(true)} />
      {isMenuOpen && (
        <Box position="absolute" top={6} right={0} zIndex={2}>
          <WalletMenu ref={menuRef}>
            <WalletMenuItem
              color="blue.500"
              onClick={async () => {
                setIsMenuOpen(false)
                send(tx)
              }}
              icon={<SendOutIcon color="blue.500" />}
            >
              {t('Send now')}
            </WalletMenuItem>
            <WalletMenuItem
              color="red.500"
              onClick={async () => {
                setIsMenuOpen(false)
                deleteModalDisclosure.onOpen()
              }}
              icon={<BasketIcon color="red.500" />}
            >
              {t('Delete')}
            </WalletMenuItem>
          </WalletMenu>
        </Box>
      )}
      <PendingTxRemoveModal {...deleteModalDisclosure} onSubmit={del} />
    </Box>
  )
}

function TransactionDetailDrawer({tx, direction, onClose, ...props}) {
  const {t, i18n} = useTranslation()

  const dna = toLocaleDna(i18n.language, {maximumFractionDigits: 4})

  const [, {sendVote, deleteVote}] = useDeferredVotes()

  // eslint-disable-next-line no-shadow
  function getTitle(tx) {
    if (direction === 'Pending') {
      return t('To smart contract')
    }
    const a = tx.direction === 'Sent' ? t('To') : t('From')
    const b = tx.counterPartyWallet ? `${t('wallet')} Main` : t('address')
    return `${a} ${b}`
  }

  // eslint-disable-next-line no-shadow
  function getValue(tx) {
    if (direction === 'Pending') {
      return tx.contractHash
    }
    return (!tx.to && '\u2013') || tx.counterParty
  }

  const failToast = useFailToast()

  const del = async () => {
    try {
      await deleteVote(tx.id)
      onClose()
    } catch (e) {
      failToast(e.message)
    }
  }

  const send = async () => {
    try {
      await sendVote(tx)
      onClose()
    } catch (e) {
      failToast(e.message)
    }
  }

  const deleteModalDisclosure = useDisclosure()

  return (
    <>
      <Drawer placement="right" size="full" {...props}>
        <DrawerOverlay />
        <DrawerContent>
          <ChakraDrawerHeader>
            <AngleArrowBackIcon
              stroke="#578FFF"
              position="absolute"
              left={4}
              top={4}
              onClick={onClose}
            />
            <Flex direction="column" textAlign="center" mt="2px">
              <Text fontSize="16px" fontWeight="bold" color="brandGray.500">
                {tx.typeName}
              </Text>
              <Text fontSize="mdx" fontWeight="normal" color="gray.300">
                {t('Transaction')}
              </Text>
            </Flex>
          </ChakraDrawerHeader>
          <ChakraDrawerBody px={8} pt={0}>
            <TransactionRow
              position="relative"
              valueWidth="80%"
              title={getTitle(tx)}
              value={getValue(tx)}
            >
              {!!tx.to && (
                <Box position="absolute" top={2} right={0}>
                  <Avatar
                    address={lowerCase(tx.counterParty)}
                    size={10}
                    m={0}
                  />
                </Box>
              )}
            </TransactionRow>
            <TransactionRow
              title={t('Amount')}
              value={
                (tx.type === 'kill' && 'See in Explorer...') ||
                dna(tx.amount || tx.signAmount || 0)
              }
            />
            <TransactionRow
              title={t('Fee')}
              value={
                (!tx.isMining && (tx.fee === '0' ? '\u2013' : dna(tx.fee))) ||
                (tx.maxFee && dna(tx.maxFee)) ||
                'n/a'
              }
            />
            <TransactionRow
              title={direction === 'Pending' ? t('Scheduled date') : t('Date')}
              value={
                !tx.timestamp
                  ? '\u2013'
                  : new Date(tx.timestamp).toLocaleString()
              }
            />
            {tx.hash && (
              <>
                <TransactionRow mb={6} title="Transaction ID" value={tx.hash} />
                <WideLink
                  display={['initial', 'none']}
                  label={t('More details in Explorer')}
                  href={`https://scan.idena.io/transaction/${tx.hash}`}
                  isNewTab
                >
                  <Box
                    boxSize={8}
                    backgroundColor="brandBlue.10"
                    borderRadius="10px"
                  >
                    <OpenExplorerIcon boxSize={5} mt="6px" ml="6px" />
                  </Box>
                </WideLink>
              </>
            )}
            {direction === 'Pending' && (
              <Box mt={4}>
                <WideLink
                  display={['initial', 'none']}
                  label={t('Send now')}
                  onClick={send}
                >
                  <Box
                    boxSize={8}
                    backgroundColor="brandBlue.10"
                    borderRadius="10px"
                  >
                    <SendIcon boxSize={5} mt="6px" ml="6px" color="blue.500" />
                  </Box>
                </WideLink>
                <WideLink
                  display={['initial', 'none']}
                  label={t('Delete')}
                  color="red.500"
                  onClick={deleteModalDisclosure.onOpen}
                >
                  <Box
                    boxSize={8}
                    backgroundColor="red.010"
                    borderRadius="10px"
                  >
                    <BasketIcon boxSize={5} mt="6px" ml="6px" color="red.500" />
                  </Box>
                </WideLink>
              </Box>
            )}
          </ChakraDrawerBody>
        </DrawerContent>
      </Drawer>
      <PendingTxRemoveModal {...deleteModalDisclosure} onSubmit={del} />
    </>
  )
}

function PendingTxRemoveModal({onSubmit, onClose, ...props}) {
  const {t} = useTranslation()

  const size = useBreakpointValue(['mdx', 'md'])
  const variantPrimary = useBreakpointValue(['primaryFlat', 'primary'])
  const variantSecondary = useBreakpointValue(['secondaryFlat', 'secondary'])

  return (
    <Dialog onClose={onClose} {...props}>
      <DialogHeader>{t('Are you sure?')}</DialogHeader>
      <DialogBody>
        <Text fontSize={['base', 'md']} color="muted">
          {t(
            'This action is irreversible. Scheduled transaction will be deleted.'
          )}
        </Text>
      </DialogBody>
      <DialogFooter justify={['center', 'auto']}>
        <Button
          onClick={onClose}
          variant={variantPrimary}
          size={size}
          w={['100%', 'auto']}
          order={[1, 1]}
        >
          {t('No')}
        </Button>
        <Divider
          display={['block', 'none']}
          h={10}
          orientation="vertical"
          color="gray.100"
          order={2}
        />
        <Button
          onClick={() => {
            onClose()
            onSubmit()
          }}
          variant={variantSecondary}
          size={size}
          w={['100%', 'auto']}
          order={[3, 2]}
        >
          {t('Yes')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
