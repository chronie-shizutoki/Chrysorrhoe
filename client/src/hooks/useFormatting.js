import { useTranslation } from 'react-i18next'

export function useFormatting() {
  const { i18n } = useTranslation()
  const currentLanguage = i18n.language

  const formatCurrency = (value) => {
    const formatters = {
      'zh-CN': new Intl.NumberFormat('zh-CN', { 
        style: 'currency', 
        currency: 'CNY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      'zh-TW': new Intl.NumberFormat('zh-TW', { 
        style: 'currency', 
        currency: 'TWD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      'ja-JP': new Intl.NumberFormat('ja-JP', { 
        style: 'currency', 
        currency: 'JPY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      'en-US': new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
    
    const formatter = formatters[currentLanguage] || formatters['zh-CN']
    return formatter.format(value)
  }

  const formatNumber = (value) => {
    const formatters = {
      'zh-CN': new Intl.NumberFormat('zh-CN', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      }),
      'zh-TW': new Intl.NumberFormat('zh-TW', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      }),
      'ja-JP': new Intl.NumberFormat('ja-JP', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      }),
      'en-US': new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      })
    }
    
    const formatter = formatters[currentLanguage] || formatters['zh-CN']
    return formatter.format(value)
  }

  const formatDate = (date) => {
    const formatters = {
      'zh-CN': new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      'zh-TW': new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      'ja-JP': new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      'en-US': new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const formatter = formatters[currentLanguage] || formatters['zh-CN']
    return formatter.format(new Date(date))
  }

  const formatDateTime = (date) => {
    const formatters = {
      'zh-CN': new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      'zh-TW': new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      'ja-JP': new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      'en-US': new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
    
    const formatter = formatters[currentLanguage] || formatters['zh-CN']
    return formatter.format(new Date(date))
  }

  return {
    formatCurrency,
    formatNumber,
    formatDate,
    formatDateTime,
    currentLanguage
  }
}