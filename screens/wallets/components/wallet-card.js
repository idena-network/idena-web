import React, {forwardRef, useState, useRef} from 'react'
import PropTypes from 'prop-types'
import {MdMoreVert} from 'react-icons/md'

import {margin, position, borderRadius} from 'polished'
import {useTranslation} from 'react-i18next'
import {useTheme} from '@emotion/react'
import {
  Flex as ChakraFlex,
  Box,
  Button,
  Divider,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
  useMediaQuery,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react'
import useClickOutside from '../../../shared/hooks/use-click-outside'
import {Absolute} from '../../../shared/components'
import Flex from '../../../shared/components/flex'
import theme, {rem} from '../../../shared/theme'
import {IconButton} from '../../../shared/components/button'

import {Skeleton} from '../../../shared/components/components'
import {useIsDesktop} from '../../../shared/utils/utils'

// eslint-disable-next-line react/display-name
const WalletMenu = forwardRef((props, ref) => (
  <Box
    bg={theme.colors.white}
    py={theme.spacings.small}
    css={{
      ...borderRadius('top', '10px'),
      ...borderRadius('bottom', '10px'),
      boxShadow:
        '0 4px 6px 0 rgba(83, 86, 92, 0.24), 0 0 2px 0 rgba(83, 86, 92, 0.2)',
    }}
    w="145px"
    ref={ref}
    {...props}
  />
))

function WalletMenuItem({icon, ...props}) {
  const chakraTheme = useTheme()
  return (
    <IconButton
      w="100%"
      color="brandGray.080"
      icon={React.cloneElement(icon, {
        style: {
          color: chakraTheme.colors.brandBlue['500'],
          marginRight: rem(10),
        },
      })}
      _hover={{bg: 'gray.50'}}
      _active={{bg: 'gray.50'}}
      {...props}
    />
  )
}

WalletMenuItem.propTypes = {
  onClick: PropTypes.func,
  icon: PropTypes.node,
  disabled: PropTypes.bool,
}

function WalletCard({
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
  const isDesktop = useBreakpointValue([false, true])

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

  return (
    <Box
      background={isSelected ? theme.colors.primary : theme.colors.gray}
      borderRadius="8px"
      color={isSelected ? theme.colors.white : theme.colors.primary2}
      position="relative"
      p={4}
      mr={6}
      minW="195px"
      w={['196px', '315px']}
      {...props}
    >
      <div className="title">
        <div className="icn">
          {isStake ? (
            <i className="icon icon--small_lock" />
          ) : (
            <i className="icon icon--small_balance" />
          )}
        </div>
        {name.length > 20 ? `${name.substr(0, 20)}...` : name}
      </div>

      {!isStake && (
        <>
          <div className="action">
            <MdMoreVert onClick={onModalOpen} style={{cursor: 'pointer'}} />
          </div>

          <Box my={theme.spacings.normal} css={{marginBottom: 0}} w="150px">
            <Flex justify="space-between" align="center">
              <Box css={position('fixed')}>
                {isMenuOpen && (
                  <Absolute top="-1.5em" right="-22em" zIndex={2}>
                    <WalletMenu ref={menuRef}>
                      <WalletMenuItem
                        onClick={async () => {
                          setIsMenuOpen(false)
                          onSend(wallet)
                        }}
                        isDisabled={isStake}
                        icon={<i className="icon icon--withdraw" />}
                      >
                        {t('Send')}
                      </WalletMenuItem>
                      <WalletMenuItem
                        onClick={async () => {
                          setIsMenuOpen(false)
                          onReceive(wallet)
                        }}
                        isDisabled={isStake}
                        icon={<i className="icon icon--deposit" />}
                      >
                        {t('Receive')}
                      </WalletMenuItem>
                    </WalletMenu>
                  </Absolute>
                )}
              </Box>
            </Flex>
          </Box>
        </>
      )}

      <div
        className="balance"
        style={{color: isSelected ? theme.colors.white : theme.colors.muted}}
      >
        {t('Balance')}
      </div>
      {isLoading ? (
        <Skeleton height={rem(24)} />
      ) : (
        <div className="value">{balance} iDNA</div>
      )}

      <CardMenuModal
        address={address}
        wallet={wallet}
        isOpen={isOpenWalletCardModal}
        onClose={onCloseWalletCardModal}
        onSendClick={onSend}
        onReceiveClick={onReceive}
      />

      <style jsx>{`
        .title {
          margin-bottom: ${rem(17)};
          font-weight: 500;
        }
        .icn {
          display: inline-block;
          vertical-align: middle;
          margin: 0 ${rem(10)} 0 0;
        }
        .value {
          word-wrap: break-word;
          font-size: ${rem(17)};
          line-height: ${rem(24)};
          font-weight: 500;
        }
        .action {
          padding: ${rem(5)};
          font-size: ${rem(20)};
          position: absolute;
          top: ${rem(10)};
          right: ${rem(8)};
          cursor: pointer;
        }
      `}</style>
    </Box>
  )
}

WalletCard.propTypes = {
  wallet: PropTypes.object,
  isSelected: PropTypes.bool,
  isLoading: PropTypes.bool,

  onSend: PropTypes.func,
  onReceive: PropTypes.func,
}

// eslint-disable-next-line react/prop-types
function CardMenuModal({
  address,
  wallet,
  onClose,
  onSendClick,
  onReceiveClick,
  ...props
}) {
  const {t} = useTranslation(['translation', 'error'])

  return (
    <Modal variant="mobile" {...props}>
      <ModalOverlay />
      <ModalContent backgroundColor="transparent" mb={10}>
        <ModalBody px={2}>
          <ChakraFlex
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
                window.open(
                  `https://scan.idena.io/address/${address}#rewards`,
                  '_blank'
                )
              }}
              size="lgx"
              variant="primaryFlat"
              w="100%"
              color="brandBlue.800"
            >
              Details
            </Button>
          </ChakraFlex>
          <ChakraFlex backgroundColor="white" borderRadius="14px" mt={2}>
            <Button
              onClick={onClose}
              size="lgx"
              variant="primaryFlat"
              w="100%"
              color="brandBlue.800"
            >
              Cancel
            </Button>
          </ChakraFlex>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default WalletCard
