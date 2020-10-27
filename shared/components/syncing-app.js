import {useTranslation} from 'react-i18next'
import theme from '../theme'

export function LoadingApp() {
  const {t} = useTranslation()
  return (
    <section>
      <div>
        <h3>{t('Please wait...')}</h3>
      </div>
      <style jsx>{`
        section {
          background: ${theme.colors.darkGraphite};
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
        }
        section > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-direction: column;
          width: 50%;
        }
      `}</style>
    </section>
  )
}
