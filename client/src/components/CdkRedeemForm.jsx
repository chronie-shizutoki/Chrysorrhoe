import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../context/WalletContext'
import { useFormatting } from '../hooks/useFormatting'
import Loading from './Loading'
import cdkService from '../services/cdkService'
import '../styles/CdkRedeemForm.css'

function CdkRedeemForm({ onClose, onSuccess }) {
  const { t } = useTranslation()
  const { currentWallet, updateWalletBalance } = useWallet()
  const { formatCurrency } = useFormatting()
  
  const [cdkCode, setCdkCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [cdkInfo, setCdkInfo] = useState(null)
  const [redeemResult, setRedeemResult] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  
  // Trigger animation effect when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 50)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Add animation effect when closing
  const handleClose = () => {
    if (isValidating || isRedeeming) return
    
    // Set closing state first to start animation
    setIsClosing(true)
    
    // Wait for animation to complete before setting isOpen to false and calling parent close function
    // 600ms matches the closing animation duration in CSS
    setTimeout(() => {
      setIsOpen(false)
      if (onClose) {
        onClose()
      }
    }, 600)
  }
  
  // Add keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isValidating && !isRedeeming) {
        handleClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isValidating, isRedeeming])

  // Validate CDK format
  const validateCodeFormat = () => {
    if (!cdkCode.trim()) {
      setValidationError(t('validation.required'))
      return false
    }
    
    if (!cdkService.validateCdkFormat(cdkCode.trim())) {
      setValidationError(t('cdk.invalidFormat'))
      return false
    }
    
    setValidationError('')
    return true
  }

  // Handle code input change
  const handleCodeChange = (e) => {
    const value = e.target.value
    setCdkCode(value)
    
    // Clear validation error when user types
    if (validationError) {
      setValidationError('')
    }
    
    // Clear previous results when user modifies input
    if (cdkInfo || redeemResult) {
      setCdkInfo(null)
      setRedeemResult(null)
    }
  }

  // Handle validate button click
  const handleValidate = async () => {
    if (!validateCodeFormat()) {
      return
    }

    setIsValidating(true)
    try {
      const result = await cdkService.validateCdk(cdkCode.trim())
      if (result.success) {
        setCdkInfo({
          amount: result.data.amount,
          currency: result.data.currency,
          expiresAt: result.data.expires_at
        })
      }
    } catch (error) {
      setValidationError(error.message)
      setCdkInfo(null)
    } finally {
      setIsValidating(false)
    }
  }

  // Handle redeem button click
  const handleRedeem = async () => {
    if (!validateCodeFormat() || !currentWallet) {
      return
    }

    setIsRedeeming(true)
    try {
      const result = await cdkService.redeemCdk(cdkCode.trim(), currentWallet.username)
      
      if (result.success) {
        setRedeemResult({
          success: true,
          message: result.message,
          amount: result.data.amount,
          currency: result.data.currency
        })
        
        // Update wallet balance
        if (updateWalletBalance) {
          updateWalletBalance()
        }
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result)
        }
        
        // Auto-close after success with animation
        setTimeout(() => {
          handleClose()
        }, 3000)
      }
    } catch (error) {
      setRedeemResult({
        success: false,
        message: error.message
      })
    } finally {
      setIsRedeeming(false)
    }
  }

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault()
    handleRedeem()
  }

  const formRef = useRef(null)
  
  const handleBackdropClick = (e) => {
    if (formRef.current && !formRef.current.contains(e.target)) {
      handleClose()
    }
  }
  
  return (
    <>
      <div 
        className={`cdk-redeem-overlay ${isOpen ? 'open' : ''} ${isClosing ? 'closing' : ''}`}
        onClick={handleBackdropClick}
        style={{ display: isClosing && !isOpen ? 'none' : 'flex' }}
      >
        <div 
          className={`cdk-redeem-form ${isOpen ? 'open' : ''} ${isClosing ? 'closing' : ''}`}
          onClick={(e) => e.stopPropagation()}
          ref={formRef}
        >
            <div className="cdk-redeem-form__header">
              <h2 className="cdk-redeem-form__title">
                {t('cdk.redeemTitle')}
              </h2>
              <button 
                className="cdk-redeem-form__close" 
                onClick={handleClose}
                disabled={isValidating || isRedeeming || isClosing}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>

            <div className="cdk-redeem-form__content">
              {redeemResult ? (
                <div className={`cdk-redeem-form__result cdk-redeem-form__result--${redeemResult.success ? 'success' : 'error'}`}>
                  <p>{redeemResult.message}</p>
                  {redeemResult.success && redeemResult.amount && (
                    <p className="redeem-amount">
                      {t('cdk.redeemAmount', {
                        amount: formatCurrency(redeemResult.amount, redeemResult.currency)
                      })}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="cdk-form-group">
                    <label htmlFor="cdkCode">{t('cdk.enterCdk')}</label>
                    <input
                      type="text"
                      id="cdkCode"
                      value={cdkCode}
                      onChange={handleCodeChange}
                      placeholder={t('cdk.cdkCode')}
                      className={validationError ? 'error' : ''}
                      disabled={isValidating || isRedeeming}
                    />
                    {validationError && (
                      <div className="error-message">{validationError}</div>
                    )}
                    <small className="format-hint">{t('cdk.formatHint')}</small>
                  </div>
                  
                  {cdkInfo && (
                    <div className="cdk-redeem-form__info">
                      <h4>{t('cdk.validCode')}</h4>
                      <p>{t('cdk.valueInfo', { amount: formatCurrency(cdkInfo.amount, cdkInfo.currency) })}</p>
                      <p>{t('cdk.expiresInfo', { date: new Date(cdkInfo.expiresAt).toLocaleDateString() })}</p>
                    </div>
                  )}
                </form>
              )}

              {(redeemResult || (!isValidating && !isRedeeming && !redeemResult)) && (
                <div className="cdk-redeem-form__actions">
                  {!redeemResult && (
                    <>
                      <button 
                        type="button" 
                        onClick={handleValidate}
                        disabled={!cdkCode.trim() || isValidating || isRedeeming}
                        className="cdk-redeem-form__validate"
                      >
                        {isValidating ? <Loading size="small" /> : t('cdk.statusValid')}
                      </button>
                      <button 
                        type="submit" 
                        disabled={!cdkCode.trim() || isValidating || isRedeeming}
                        className="cdk-redeem-form__submit"
                        onClick={handleRedeem}
                      >
                        {isRedeeming ? <Loading size="small" /> : t('cdk.redeem')}
                      </button>
                    </>
                  )}
                  {redeemResult && (
                    <button
                      type="button"
                      className="cdk-redeem-form__submit"
                      onClick={handleClose}
                      disabled={isValidating || isRedeeming || isClosing}
                    >
                      {t('common.close')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
    </>
  )
}

export default CdkRedeemForm