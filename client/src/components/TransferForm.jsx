import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../context/WalletContext'
import { useFormatting } from '../hooks/useFormatting'
import Loading from './Loading'

function TransferForm({ onClose, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { t } = useTranslation()
  const { currentWallet, walletService, isLoading, error } = useWallet()
  const { formatCurrency } = useFormatting()
  
  const [formData, setFormData] = useState({
    recipient: '',
    amount: ''
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [transferResult, setTransferResult] = useState(null)

  const validateForm = () => {
    const errors = {}
    
    // Recipient validation
    if (!formData.recipient.trim()) {
      errors.recipient = t('validation.required')
    } else if (formData.recipient.trim().length < 2) {
      errors.recipient = t('validation.minLength', { min: 2 })
    }
    
    // Amount validation
    if (!formData.amount.trim()) {
      errors.amount = t('validation.required')
    } else {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        errors.amount = t('validation.positiveNumber')
      } else if (amount > currentWallet.balance) {
        errors.amount = t('messages.insufficient_funds')
      }
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
    
    // Clear transfer result when user modifies form
    if (transferResult) {
      setTransferResult(null)
    }
    
    // Start open animation if not already open
    if (!isOpen) {
      setIsOpen(true);
    }
  }

  useEffect(() => {
    // Start open animation
    if (!isOpen) {
      setTimeout(() => setIsOpen(true), 10);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const result = await walletService.transferByUsername(
        currentWallet.username,
        formData.recipient.trim(),
        parseFloat(formData.amount)
      )
      
      if (result.success) {
        setTransferResult({
          success: true,
          message: t('transfer.success'),
          transaction: result.transaction
        })
        
        // Reset form
        setFormData({ recipient: '', amount: '' })
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result)
        }
        
        // Close the modal with animation
        setTimeout(() => {
          handleClose()
        }, 1000)
      }
    } catch (error) {
      setTransferResult({
        success: false,
        message: error.message || t('transfer.failed')
      })
    }
  }

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsOpen(false);
      if (onClose) {
        onClose();
      }
    }, 300);
  }

  return (
    <div className="transfer-form-overlay">
      <div className={`transfer-form glass-modal ${isOpen ? 'open' : ''} ${isClosing ? 'closing' : ''}`}>
        <div className="transfer-form__header">
          <h2 className="transfer-form__title">{t('transfer.form')}</h2>
          <button 
            className="transfer-form__close"
            onClick={handleClose}
            type="button"
            aria-label="Close transfer form"
          >
            ×
          </button>
        </div>

        <div className="transfer-form__balance">
          <span className="balance-label">{t('wallet.currentBalance')}:</span>
          <span className="balance-value">{formatCurrency(currentWallet.balance)}</span>
        </div>

        {error && (
          <div className="transfer-form__error">
            {error}
          </div>
        )}

        {transferResult && (
          <div className={`transfer-form__result ${transferResult.success ? 'transfer-form__result--success' : 'transfer-form__result--error'}`}>
            {transferResult.message}
          </div>
        )}

        <form className="transfer-form__form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="recipient" className="form-label">
              {t('transfer.recipient')}
            </label>
            <input
              type="text"
              id="recipient"
              name="recipient"
              value={formData.recipient}
              onChange={handleInputChange}
              className={`form-input ${validationErrors.recipient ? 'form-input--error' : ''}`}
              placeholder={t('transfer.enterRecipient')}
              disabled={isLoading}
            />
            {validationErrors.recipient && (
              <span className="form-error">{validationErrors.recipient}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="amount" className="form-label">
              {t('transfer.amount')}
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className={`form-input ${validationErrors.amount ? 'form-input--error' : ''}`}
              placeholder={t('transfer.enterAmount')}
              step="0.01"
              min="0.01"
              max={currentWallet.balance}
              disabled={isLoading}
            />
            {validationErrors.amount && (
              <span className="form-error">{validationErrors.amount}</span>
            )}
          </div>

          <div className="transfer-form__actions">
            <button 
              type="button" 
              className="transfer-form__cancel"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="transfer-form__submit"
              disabled={isLoading || !formData.recipient.trim() || !formData.amount.trim()}
            >
              {isLoading ? t('transfer.processing') : t('transfer.submit')}
            </button>
          </div>
        </form>

        {isLoading && (
          <div className="transfer-form__loading">
            <Loading />
          </div>
        )}
      </div>
    </div>
  )
}

export default TransferForm