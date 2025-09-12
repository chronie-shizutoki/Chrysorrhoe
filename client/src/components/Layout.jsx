import { useTranslation } from 'react-i18next'
import LanguageSelector from './LanguageSelector'
import ExchangeRateBanner from './ExchangeRateBanner'

function Layout({ children }) {
  const { t } = useTranslation()

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-to-main">
        {t('accessibility.skipToMain', 'Skip to main content')}
      </a>
      <header className="app-header">
        <h1 className="app-title">{t('wallet.title')}</h1>
      </header>
      <ExchangeRateBanner />
      <main id="main-content" className="app-main">
        {children}
      </main>
      <footer className="app-footer">
        <div className="app-footer__content">
          <p className="app-footer__copyright">𝙲𝚑𝚛𝚢𝚜𝚘𝚛𝚛𝚑𝚘𝚎</p>
          <LanguageSelector />
        </div>
      </footer>
    </div>
  )
}

export default Layout