import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormatting } from '../hooks/useFormatting'

function ExchangeRateBanner() {
  const { t } = useTranslation()
  const { formatNumber } = useFormatting()
  
  const [exchangeRate, setExchangeRate] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

// Fetch the latest exchange rate from the server
  const fetchExchangeRate = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/exchange-rates/latest')
      const data = await response.json()
      
      if (data.success && data.data) {
        setExchangeRate(data.data.rate)
        setLastUpdated(new Date(data.data.created_at))
      } else {
        throw new Error(data.message || 'Failed to fetch exchange rate')
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err)
      setError(err.message || 'Failed to fetch exchange rate data')
      
      setExchangeRate(generateRandomRate())
      setLastUpdated(new Date())
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize exchange rate and set it to update every hour
  useEffect(() => {
    // Initial fetch of exchange rate
    fetchExchangeRate()

    // Set up interval to update exchange rate every hour
    const intervalId = setInterval(fetchExchangeRate, 60 * 60 * 1000) // 1 hour = 60 minutes * 60 seconds * 1000 milliseconds
    
    // Cleanup function to clear interval when component unmounts
    return () => clearInterval(intervalId)
  }, [])

  // Format the last updated time to a readable string
  const formatUpdateTime = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  // Format the exchange rate number using the current language's number formatting rules
  const formattedRate = exchangeRate ? formatNumber(exchangeRate) : '0'

  return (
    <div className={`exchange-rate-banner ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`}>
      <div className="exchange-rate-content">
        <div className="exchange-rate-title">{t('exchangeRate.title')}</div>
        
        {isLoading ? (
          <div className="exchange-rate-loading">
            {t('exchangeRate.loading')}
          </div>
        ) : error ? (
          <div className="exchange-rate-error">
            {error}
          </div>
        ) : (
          <>
            <div className="exchange-rate-value">
              {t('exchangeRate.rate', { rate: formattedRate })}
            </div>
            <div className="exchange-rate-update-time">
              {t('exchangeRate.lastUpdated', { time: formatUpdateTime(lastUpdated) })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ExchangeRateBanner