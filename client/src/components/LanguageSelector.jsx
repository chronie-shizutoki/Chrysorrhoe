import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../context/WalletContext'
import { languageStorage } from '../utils/languageStorage'
import '../styles/LanguageSelector.css'

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
  const [isClosing, setIsClosing] = useState(false)
  const dropdownRef = useRef(null)
  const containerRef = useRef(null)

  // Sync i18n language with wallet context on mount
  useEffect(() => {
    if (i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage)
    }
  }, [i18n, currentLanguage])

  // Close dropdown with animation
  const closeDropdown = useCallback(() => {
    setIsClosing(true)
    // Wait for animation to complete before setting isOpen to false
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
    }, 250) // Match the animation duration
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && isOpen) {
        closeDropdown()
      }
    }
    
    // Close on Escape key
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        closeDropdown()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, closeDropdown])

  const handleLanguageChange = useCallback((languageCode) => {
    if (languageStorage.isSupported(languageCode) && languageCode !== currentLanguage) {
      i18n.changeLanguage(languageCode)
      dispatch({ type: 'SET_LANGUAGE', payload: languageCode })
      languageStorage.setLanguage(languageCode)
      closeDropdown()
    } else if (languageCode === currentLanguage) {
      // Close immediately if clicking on the already selected language
      closeDropdown()
    }
  }, [i18n, dispatch, currentLanguage, closeDropdown])

  const getCurrentLanguageName = useCallback(() => {
    const language = languages.find(lang => lang.code === currentLanguage)
    return language ? language.name : currentLanguage
  }, [currentLanguage])

  // Toggle dropdown with animation
  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown()
    } else {
      setIsOpen(true)
      setIsClosing(false)
    }
  }

  return (
    <div className="language-selector" ref={containerRef}>
      <button
        className={`language-select-button ${isOpen || isClosing ? 'open' : ''}`}
        onClick={toggleDropdown}
        aria-label="Select Language"
        aria-expanded={isOpen}
        type="button"
      >
        <span className="language-select-text">{getCurrentLanguageName()}</span>
        <span className={`language-select-arrow ${isOpen || isClosing ? 'open' : ''}`}>
          <svg width="8" height="6" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      {(isOpen || isClosing) && (
        <div 
          className={`language-select-dropdown ${isClosing ? 'closing' : ''}`}
          ref={dropdownRef}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`language-select-option ${currentLanguage === lang.code ? 'selected' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
              role="option"
              aria-selected={currentLanguage === lang.code}
              type="button"
              tabIndex="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleLanguageChange(lang.code)
                }
              }}
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