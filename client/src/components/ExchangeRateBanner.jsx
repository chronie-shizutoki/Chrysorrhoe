import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormatting } from '../hooks/useFormatting'
import '../styles/ExchangeRateBanner.css'

function ExchangeRateBanner() {
  const { t } = useTranslation()
  const { formatNumber } = useFormatting()
  const bannerRef = useRef(null)
  
  const [exchangeRate, setExchangeRate] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isHovered, setIsHovered] = useState(false)

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
        throw new Error(data.message || t('messages.exchangeRateFetchFailed'))
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err)
      setError(err.message || t('messages.exchangeRateFetchFailed'))
      
      // Generate a random rate as fallback
      setExchangeRate(generateRandomRate())
      setLastUpdated(new Date())
    } finally {
      setIsLoading(false)
    }
  }
  
  // Generate a random exchange rate for demo/fallback purposes
  const generateRandomRate = () => {
    return Number((Math.random() * 0.5 + 0.8).toFixed(4))
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
  
  // Handle mouse movement for interactive glass effect
  const handleMouseMove = (e) => {
    if (bannerRef.current) {
      const rect = bannerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // Create a subtle light spot that follows the mouse
      bannerRef.current.style.background = `rgba(255, 255, 255, 0.1) radial-gradient(circle at ${x}px ${y}px, rgba(255, 255, 255, 0.1), transparent 150px)`
    }
  }
  
  // Reset glass effect when mouse leaves
  const handleMouseLeave = () => {
    if (bannerRef.current) {
      bannerRef.current.style.background = 'rgba(255, 255, 255, 0.1)'
    }
    setIsHovered(false)
  }
  
  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  // For dark mode adjustments
  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDarkMode && bannerRef.current) {
      bannerRef.current.style.background = 'rgba(0, 0, 0, 0.15)'
    }
  }, [])
  
  return (
    <div 
      ref={bannerRef}
      className={`exchange-rate-banner ${isLoading ? 'loading' : ''} ${error ? 'error' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      <div className="exchange-rate-content">
        <div className="exchange-rate-label">{t('exchangeRate.title')}</div>
        
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