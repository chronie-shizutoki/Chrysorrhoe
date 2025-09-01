const LANGUAGE_STORAGE_KEY = 'language'
const DEFAULT_LANGUAGE = 'zh-CN'

export const languageStorage = {
  // Get saved language from localStorage
  getLanguage: () => {
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE
    } catch (error) {
      console.warn('Failed to get language from localStorage:', error)
      return DEFAULT_LANGUAGE
    }
  },

  // Save language to localStorage
  setLanguage: (language) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
      return true
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error)
      return false
    }
  },

  // Remove language from localStorage
  removeLanguage: () => {
    try {
      localStorage.removeItem(LANGUAGE_STORAGE_KEY)
      return true
    } catch (error) {
      console.warn('Failed to remove language from localStorage:', error)
      return false
    }
  },

  // Check if language is supported
  isSupported: (language) => {
    const supportedLanguages = ['zh-CN', 'zh-TW', 'ja-JP', 'en-US']
    return supportedLanguages.includes(language)
  },

  // Get browser language preference
  getBrowserLanguage: () => {
    try {
      const browserLang = navigator.language || navigator.languages[0]
      
      // Map browser language codes to our supported languages
      const languageMap = {
        'zh': 'zh-CN',
        'zh-CN': 'zh-CN',
        'zh-Hans': 'zh-CN',
        'zh-TW': 'zh-TW',
        'zh-Hant': 'zh-TW',
        'ja': 'ja-JP',
        'ja-JP': 'ja-JP',
        'en': 'en-US',
        'en-US': 'en-US',
        'en-GB': 'en-US'
      }

      return languageMap[browserLang] || languageMap[browserLang.split('-')[0]] || DEFAULT_LANGUAGE
    } catch (error) {
      console.warn('Failed to get browser language:', error)
      return DEFAULT_LANGUAGE
    }
  }
}