import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import Loading from './Loading'
import '../styles/WalletSetup.css'

function WalletSetup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { walletService, isLoading, error } = useWallet()
  
  const [mode, setMode] = useState('login') // 'login' or 'create'
  const [formData, setFormData] = useState({username: ''})
  const [validationErrors, setValidationErrors] = useState({})
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [cardElement, setCardElement] = useState(null)

  const validateForm = () => {
    const errors = {}
    
    // Username validation
    if (!formData.username.trim()) {
      errors.username = t('validation.required')
    } else if (formData.username.trim().length < 2) {
      errors.username = t('validation.minLength', { min: 2 })
    } else if (formData.username.trim().length > 50) {
      errors.username = t('validation.maxLength', { max: 50 })
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }
  
  // Handle mouse movement for interactive glass effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setMousePosition({ x, y })
        
        // Add subtle gradient movement effect
        cardElement.style.background = `rgba(255, 255, 255, 0.1) radial-gradient(circle at ${x}px ${y}px, rgba(255, 255, 255, 0.15), transparent 80px)`
      }
    }
    
    const container = document.querySelector('.wallet-setup__container')
    if (container) {
      setCardElement(container)
      container.addEventListener('mousemove', handleMouseMove)
    }
    
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [])
  
  // Reset glass effect when mouse leaves
  useEffect(() => {
    const handleMouseLeave = () => {
      if (cardElement) {
        cardElement.style.background = 'rgba(255, 255, 255, 0.1)'
      }
    }
    
    const container = document.querySelector('.wallet-setup__container')
    if (container) {
      container.addEventListener('mouseleave', handleMouseLeave)
    }
    
    return () => {
      if (container) {
        container.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [cardElement])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      let result
      if (mode === 'create') {
        // Set the initial balance to 0
        result = await walletService.createWallet(
          formData.username.trim(),
          0
        )
      } else {
        // Login mode
        result = await walletService.loginWallet(
          formData.username.trim()
        )
      }
      
      if (result.success) {
        // Navigate to dashboard after successful login/creation
        navigate('/')
      }
    } catch (error) {
      console.error(`Failed to ${mode} wallet:`, error)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'create' : 'login')
    setFormData({ username: '' })
    setValidationErrors({})
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="wallet-setup">
      <div className="wallet-setup__container">
        {/* Dynamic light effect for glass card */}
        <div 
          className="glass-card-light"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 255, 255, 0.15), transparent 120px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 0
          }}
        />
        
        <h1 className="wallet-setup__title">
          {mode === 'login' ? t('wallet.login') : t('wallet.create')}
        </h1>
        
        {error && (
          <div className="wallet-setup__error">
            {error}
          </div>
        )}
        
        <form className="wallet-setup__form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              {t('wallet.username')}
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`form-input ${validationErrors.username ? 'form-input--error' : ''}`}
              placeholder={t('wallet.enterUsername')}
              spellCheck="false"
              autoComplete="off"
            />
            {validationErrors.username && (
              <span className="form-error">{validationErrors.username}</span>
            )}
          </div>

          <button 
            type="submit" 
            className="wallet-setup__submit"
            disabled={isLoading}
          >
            {isLoading ? t('messages.loading') : (mode === 'login' ? t('wallet.login') : t('wallet.create'))}
          </button>
        </form>

        <div className="wallet-setup__switch">
          <p>
            {mode === 'login' ? t('wallet.noAccount') : t('wallet.hasAccount')}
          </p>
          <button 
            type="button" 
            className="switch-mode-button"
            onClick={switchMode}
          >
            {mode === 'login' ? t('wallet.create') : t('wallet.login')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WalletSetup