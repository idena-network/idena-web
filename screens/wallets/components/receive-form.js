import React from 'react'
import {margin} from 'polished'
import PropTypes from 'prop-types'
import QRCode from 'qrcode.react'
import {useTranslation} from 'react-i18next'
import {
  Flex,
  FormControl,
  Heading,
  Icon,
  Stack,
  useClipboard,
} from '@chakra-ui/core'
import theme, {rem} from '../../../shared/theme'
import {Label} from '../../../shared/components'
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  FormLabel,
  Input,
} from '../../../shared/components/components'
import {FlatButton} from '../../../shared/components/button'

function ReceiveForm({isOpen, onClose, address}) {
  const {t} = useTranslation()
  const {onCopy, hasCopied} = useClipboard(address)
  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader mb={8}>
        <Flex
          align="center"
          justify="center"
          h={12}
          w={12}
          rounded="xl"
          bg="blue.012"
        >
          <Icon name="send-out" w={6} h={6} color="blue.500" />
        </Flex>
        <Heading
          color="brandGray.500"
          fontSize="lg"
          fontWeight={500}
          lineHeight="base"
          mt={4}
        >
          {t(`Receive iDNA`)}
        </Heading>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={5}>
          <QRCode value={address} style={{...margin(0, 'auto')}} />
          <FormControl>
            <Flex justify="space-between">
              <FormLabel style={{fontSize: rem(13)}}>{t('Address')}</FormLabel>
              {hasCopied ? (
                <Label style={{fontSize: rem(13)}}>{t('Copied!')}</Label>
              ) : (
                <FlatButton
                  color={theme.colors.primary}
                  onClick={onCopy}
                  style={{
                    fontSize: rem(13),
                    marginBottom: rem(10),
                    textAlign: 'center',
                  }}
                >
                  {t('Copy')}
                </FlatButton>
              )}
            </Flex>
            <Input value={address} isDisabled></Input>
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
