import {CheckIcon} from '@chakra-ui/icons'
import {Box, Flex, Stack, Text} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {AVAILABLE_LANGS, isoLangs} from '../../i18n'
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
} from '../../shared/components/components'
import {AngleArrowBackIcon} from '../../shared/components/icons'
import {useLanguage} from '../../shared/hooks/use-language'
import {useSettingsDispatch} from '../../shared/providers/settings-context'
import {PageTitleNew} from '../app/components'

export function ChangeLanguageDrawer({changeLanguageDisclosure, ...props}) {
  const {t, i18n} = useTranslation()
  const {setLanguage} = useSettingsDispatch()
  const {lng} = useLanguage()

  return (
    <Drawer {...changeLanguageDisclosure} isCloseable={false} {...props}>
      <DrawerHeader>
        <AngleArrowBackIcon
          stroke="#578FFF"
          display={['block', 'none']}
          position="absolute"
          left={4}
          top={4}
          h="28px"
          w="28px"
          onClick={() => changeLanguageDisclosure.onClose()}
        />
        <PageTitleNew>{t('Language')}</PageTitleNew>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={0}>
          {AVAILABLE_LANGS.map(lang => (
            <Box
              key={lang}
              borderBottom="1px solid"
              borderBottomColor="gray.100"
              py={3}
              onClick={() => {
                i18n.changeLanguage(lang)
                setLanguage(lang)
              }}
            >
              <Flex justifyContent="space-between" align="center">
                <Text>
                  {isoLangs[lang].nativeName} ({lang.toUpperCase()})
                </Text>
                {lang === lng && (
                  <CheckIcon boxSize={4} mr={2} color="blue.500" />
                )}
              </Flex>
            </Box>
          ))}
        </Stack>
      </DrawerBody>
    </Drawer>
  )
}
