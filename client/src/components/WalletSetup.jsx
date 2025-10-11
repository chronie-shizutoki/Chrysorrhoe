import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import Loading from './Loading'

function WalletSetup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { walletService, isLoading, error } = useWallet()
  
  const [mode, setMode] = useState('login') // 'login' or 'create'
  const [formData, setFormData] = useState({
    username: ''
  })
  const [validationErrors, setValidationErrors] = useState({})

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      let result
      if (mode === 'create') {
        // 固定初始余额为0
        result = await walletService.createWallet(
          formData.username.trim(),
          0
        )
      } else {
        // 登录模式
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
      <div className="wallet-setup__container glass-card">
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
              placeholder={mode === 'login' ? t('wallet.enterUsername') : t('wallet.username')}
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
            <button 
              type="button" 
              className="switch-mode-button"
              onClick={switchMode}
            >
              {mode === 'login' ? t('wallet.create') : t('wallet.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default WalletSetup