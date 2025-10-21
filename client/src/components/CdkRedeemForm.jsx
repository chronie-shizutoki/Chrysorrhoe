import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from '../context/WalletContext'
import { useFormatting } from '../hooks/useFormatting'
import Loading from './Loading'
import cdkService from '../services/cdkService'
import './CdkRedeemForm.css'

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
        
        // Auto-close after success
        setTimeout(() => {
          if (onClose) {
            onClose()
          }
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

  return (
    <div className="cdk-redeem-form">
      <h2>{t('cdk.redeemTitle')}</h2>
      
      {redeemResult ? (
        <div className={`result-message ${redeemResult.success ? 'success' : 'error'}`}>
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
          
          <div className="button-group">
            <button 
              type="button" 
              onClick={handleValidate}
              disabled={!cdkCode.trim() || isValidating || isRedeeming}
              className="btn-secondary"
            >
              {isValidating ? <Loading size="small" /> : t('cdk.statusValid')}
            </button>
            <button 
              type="submit" 
              disabled={!cdkCode.trim() || isValidating || isRedeeming}
              className="btn-primary"
            >
              {isRedeeming ? <Loading size="small" /> : t('cdk.redeem')}
            </button>
          </div>
          
          {cdkInfo && (
            <div className="cdk-info">
              <h4>{t('cdk.validCode')}</h4>
              <p>{t('cdk.valueInfo', { amount: formatCurrency(cdkInfo.amount, cdkInfo.currency) })}</p>
              <p>{t('cdk.expiresInfo', { date: new Date(cdkInfo.expiresAt).toLocaleDateString() })}</p>
            </div>
          )}
        </form>
      )}
      
      {!redeemResult && (
        <button 
          type="button" 
          onClick={onClose} 
          className="btn-close"
          disabled={isValidating || isRedeeming}
        >
          {t('common.close')}
        </button>
      )}
    </div>
  )
}

export default CdkRedeemForm