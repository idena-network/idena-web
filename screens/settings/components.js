import {Box, Heading} from '@chakra-ui/react'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {AVAILABLE_LANGS, isoLangs} from '../../i18n'
import {PrimaryButton} from '../../shared/components/button'
import {Select} from '../../shared/components/components'
import {useLanguage} from '../../shared/hooks/use-language'
import {useSettingsDispatch} from '../../shared/providers/settings-context'

// eslint-disable-next-line react/prop-types
export function Section({title, children, ...props}) {
  return (
    <Box mt={8} {...props}>
      <Heading
        as="h1"
        fontSize={['20px', 'lg']}
        fontWeight={500}
        textAlign="start"
        mb={[0, '0.5em']}
      >
        {title}
      </Heading>
      <Box mt={[5, 2]}>{children}</Box>
    </Box>
  )
}

export function LocaleSwitcher() {
  const {t, i18n} = useTranslation()
  const {lng} = useLanguage()
  const {setLanguage} = useSettingsDispatch()

  const [selectValue, setSelectValue] = useState('')

  useEffect(() => {
    setSelectValue(lng)
  }, [lng])

  const change = () => {
    i18n.changeLanguage(selectValue)
    setLanguage(selectValue)
  }

  return (
    <>
      <Select
        id="selectedLanguage"
        value={selectValue}
        h={8}
        w="auto"
        onChange={e => setSelectValue(e.target.value)}
      >
        {AVAILABLE_LANGS.map(lang => (
          <option key={lang} value={lang}>
            {isoLangs[lang].nativeName} ({lang.toUpperCase()})
          </option>
        ))}
      </Select>
      <PrimaryButton onClick={change} ml={2}>
        {t('Save')}
      </PrimaryButton>
    </>
  )
}
