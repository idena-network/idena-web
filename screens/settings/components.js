import {Box, Heading} from '@chakra-ui/react'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {AVAILABLE_LANGS, isoLangs} from '../../i18n'
import {PrimaryButton} from '../../shared/components/button'
import {Select} from '../../shared/components/components'

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
  const [lng, setLng] = useState()

  const change = () => {
    i18n.changeLanguage(lng)
  }

  useEffect(() => {
    setLng(new Intl.Locale(i18n.language).language)
  }, [i18n])

  return (
    <>
      <Select value={lng} h={8} onChange={e => setLng(e.target.value)}>
        {AVAILABLE_LANGS.map(lang => (
          <option key={lang} value={lang}>
            {isoLangs[lang].nativeName} ({lang.toUpperCase()})
          </option>
        ))}
      </Select>
      <PrimaryButton ml={2} onClick={change}>
        {t('Save')}
      </PrimaryButton>
    </>
  )
}
