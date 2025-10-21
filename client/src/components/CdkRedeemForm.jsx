import { useState, useEffect } from 'react'
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
  
  // 组件挂载时触发动画
  useEffect(() => {
    setIsOpen(true)
  }, [])
  
  // 处理关闭逻辑，添加动画效果
  const handleClose = () => {
    if (isValidating || isRedeeming) return
    
    setIsClosing(true)
    setIsOpen(false)
    // 等待动画完成后调用父组件的关闭函数
    setTimeout(() => {
      if (onClose) {
        onClose()
      }
    }, 300)
  }
  
  // 添加键盘事件监听
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

  return (
    <div className={`cdk-redeem-form ${isOpen ? 'open' : ''}`}>
      <h2>
        {t('cdk.redeemTitle')}
        <button 
          type="button" 
          onClick={handleClose} 
          className="close-btn"
          disabled={isValidating || isRedeeming || isClosing}
          aria-label={t('common.close')}
        >
          ×
        </button>
      </h2>
      
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
      
      {/* 底部关闭按钮已替换为右上角X按钮 */}
      {!redeemResult && (
        <button 
          type="button" 
          onClick={handleClose} 
          className="btn-close"
          disabled={isValidating || isRedeeming || isClosing}
        >
          {t('common.close')}
        </button>
      )}
    </div>
  )
}

export default CdkRedeemForm