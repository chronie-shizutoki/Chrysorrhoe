import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../context/WalletContext'
import { languageStorage } from '../utils/languageStorage'

const languages = [
  { code: 'en-US', name: 'English' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' }
]

function LanguageSelector() {
  const { i18n } = useTranslation()
  const { currentLanguage, dispatch } = useWallet()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Sync i18n language with wallet context on mount
  useEffect(() => {
    if (i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage)
    }
  }, [i18n, currentLanguage])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLanguageChange = (languageCode) => {
    if (languageStorage.isSupported(languageCode)) {
      i18n.changeLanguage(languageCode)
      dispatch({ type: 'SET_LANGUAGE', payload: languageCode })
      languageStorage.setLanguage(languageCode)
      setIsOpen(false)
    }
  }

  const getCurrentLanguageName = () => {
    const language = languages.find(lang => lang.code === currentLanguage)
    return language ? language.name : currentLanguage
  }

  return (
    <div className="language-selector" ref={dropdownRef}>
      <button
        className={`language-select-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select Language"
        aria-expanded={isOpen}
      >
        <span className="language-select-text">{getCurrentLanguageName()}</span>
        <span className={`language-select-arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="language-select-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`language-select-option ${currentLanguage === lang.code ? 'selected' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
              role="option"
              aria-selected={currentLanguage === lang.code}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSelector