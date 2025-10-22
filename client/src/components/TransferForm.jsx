import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../context/WalletContext'
import { useFormatting } from '../hooks/useFormatting'
import Loading from './Loading'
import '../styles/TransferForm.css';

function TransferForm({ onClose, onSuccess }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const { t } = useTranslation()
  const { currentWallet, walletService, isLoading, error } = useWallet()
  const { formatCurrency } = useFormatting()
  const formRef = useRef(null);
  const overlayRef = useRef(null);
  
  const [formData, setFormData] = useState({
    recipient: '',
    amount: ''
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [transferResult, setTransferResult] = useState(null)
  const [animationComplete, setAnimationComplete] = useState(false);

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
  }

  useEffect(() => {
    // Set focus trap when open
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isClosing) {
        handleClose();
      }
      
      // Focus trap logic
      if (e.key === 'Tab' && formRef.current) {
        const focusableElements = formRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus on first input when animation completes
    const timer = setTimeout(() => {
      setAnimationComplete(true);
      const firstInput = formRef.current?.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 400);

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [isClosing]);

  // Handle click outside to close (optional feature)
  const handleClickOutside = (e) => {
    if (overlayRef.current && formRef.current && 
        overlayRef.current.contains(e.target) && 
        !formRef.current.contains(e.target)) {
      handleClose();
    }
  };

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

  const handleClose = useCallback(() => {
    if (!isClosing) {
      setIsClosing(true);
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 400); // Match animation duration
    }
  }, [isClosing, onClose]);

  return (
    <div 
      className={`transfer-form-overlay ${isClosing ? 'closing' : ''}`}
      ref={overlayRef}
      onClick={handleClickOutside}
    >
      <div 
        className={`transfer-form glass-modal ${isClosing ? 'closing' : ''}`}
        ref={formRef}
      >
        <div className="transfer-form__header">
          <h2 className="transfer-form__title">{t('transfer.form')}</h2>
          <button 
            className="transfer-form__close"
            onClick={handleClose}
            type="button"
            aria-label="Close transfer form"
            disabled={isLoading}
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
  )
}

export default TransferForm