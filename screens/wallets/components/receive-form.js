import React from 'react'
import {margin} from 'polished'
import PropTypes from 'prop-types'
import QRCode from 'qrcode.react'
import {useTranslation} from 'react-i18next'
import {
  Flex,
  FormControl,
  Heading,
  Stack,
  useBreakpointValue,
  useClipboard,
} from '@chakra-ui/react'
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  FormLabel,
  Input,
} from '../../../shared/components/components'
import {FlatButton} from '../../../shared/components/button'
import {ReceiveIcon} from '../../../shared/components/icons'

function ReceiveForm({isOpen, onClose, address}) {
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
            style={{height: qrSize, width: qrSize, ...margin(0, 'auto')}}
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

ReceiveForm.propTypes = {
  address: PropTypes.string,
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
}

export default ReceiveForm
