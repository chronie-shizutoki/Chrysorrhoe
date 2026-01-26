import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../context/WalletContext'
import { useFormatting } from '../hooks/useFormatting'
import Loading from './Loading'
import '../styles/TransferForm.css';

function TransferForm({ onClose, onSuccess, buttonPosition, visible }) {
  const { t } = useTranslation()
  const { currentWallet, walletService, isLoading, error } = useWallet()
  const { formatCurrency } = useFormatting()
  const formRef = useRef(null);
  const overlayRef = useRef(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  
  // Calculate initial position based on button position
  const [initialPosition, setInitialPosition] = useState(() => {
    if (buttonPosition) {
      return {
        x: buttonPosition.x - window.innerWidth / 2,
        y: buttonPosition.y - window.innerHeight / 2
      };
    }
    return { x: 0, y: 0 };
  });
  
  // Update initial position when button position changes
  useEffect(() => {
    if (buttonPosition) {
      setInitialPosition({
        x: buttonPosition.x - window.innerWidth / 2,
        y: buttonPosition.y - window.innerHeight / 2
      });
    } else {
      setInitialPosition({ x: 0, y: 0 });
    }
  }, [buttonPosition]);
  
  const [formData, setFormData] = useState({
    recipient: '',
    amount: ''
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [transferResult, setTransferResult] = useState(null)

  const validateForm = () => {
    const errors = {}
    
    if (!formData.recipient.trim()) {
      errors.recipient = t('validation.required')
    } else if (formData.recipient.trim().length < 2) {
      errors.recipient = t('validation.minLength', { min: 2 })
    }
    
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
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    if (transferResult) {
      setTransferResult(null)
    }
  }

  const handleClickOutside = useCallback((e) => {
    if (overlayRef.current && formRef.current && 
        overlayRef.current.contains(e.target) && 
        !formRef.current.contains(e.target)) {
      handleClose()
    }
  }, [])

  const handleClose = useCallback(() => {
    if (isLoading) return
    
    setIsClosing(true)
    setIsOpen(false)
    
    setTimeout(() => {
      setIsClosing(false)
      if (onClose) {
        onClose()
      }
    }, 1000)
  }, [isLoading, onClose])

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
        
        setFormData({ recipient: '', amount: '' })
        
        if (onSuccess) {
          onSuccess(result)
        }
        
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
  
  // Update initial position when button position changes
  useEffect(() => {
    if (buttonPosition) {
      setInitialPosition({
        x: buttonPosition.x - window.innerWidth / 2,
        y: buttonPosition.y - window.innerHeight / 2
      });
    } else {
      setInitialPosition({ x: 0, y: 0 });
    }
  }, [buttonPosition]);
  
  // Handle visible prop changes
  useEffect(() => {
    if (visible && !shouldRender) {
      setShouldRender(true)
      setTimeout(() => {
        setIsOpen(true)
      }, 50)
    } else if (!visible && shouldRender && !isClosing) {
      handleClose()
    }
  }, [visible, shouldRender, isClosing, handleClose])
  
  // Cleanup after closing animation
  useEffect(() => {
    if (!isOpen && !shouldRender) {
      return
    }
    if (!isOpen && shouldRender && !visible) {
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, shouldRender, visible])
  
  // Add keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        handleClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isLoading, handleClose])

  console.log('TransferForm: rendering, isOpen:', isOpen, 'isClosing:', isClosing, 'shouldRender:', shouldRender);
  
  if (!shouldRender) {
    return null
  }
  
  return (
    <>
      <div 
        className={`transfer-form-overlay ${isOpen ? 'open' : ''} ${isClosing ? 'closing' : ''}`}
        ref={overlayRef}
        onClick={handleClickOutside}
        style={{ 
          display: 'flex',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div 
          className="transfer-form glass-modal"
          ref={formRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            opacity: isOpen ? 1 : 0,
            transform: isClosing 
              ? `translate(${initialPosition.x}px, ${initialPosition.y}px) scale(0)` 
              : isOpen 
                ? 'translate(0, 0) scale(1)' 
                : `translate(${initialPosition.x}px, ${initialPosition.y}px) scale(0)`,
            transition: 'transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
        <div className="transfer-form__header">
          <h2 className="transfer-form__title">{t('transfer.form')}</h2>
          <button 
            className="transfer-form__close"
            onClick={handleClose}
            type="button"
            aria-label="Close transfer form"
            disabled={isLoading || isClosing}
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
            {transferResult.success && transferResult.transaction && (
              <div className="transfer-form__transaction-details">
                <small>
                  {t('transfer.transactionId')}: {transferResult.transaction.id}
                </small>
              </div>
            )}
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
              autoComplete="off"
              spellCheck="false"
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
              autoComplete="off"
            />
            {validationErrors.amount && (
              <span className="form-error">{validationErrors.amount}</span>
            )}
          </div>

          <div className="transfer-form__actions">
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
    </>
  )
}

export default TransferForm