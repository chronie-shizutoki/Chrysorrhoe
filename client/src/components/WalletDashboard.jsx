import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useFormatting } from '../hooks/useFormatting'
import Loading from './Loading'
import TransferForm from './TransferForm'
import CdkRedeemForm from './CdkRedeemForm'
import '../styles/WalletDashboard.css'

function WalletDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWallet, isLoading, error } = useWallet()
  const { formatCurrency } = useFormatting()
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [transferSuccess, setTransferSuccess] = useState(false)
  const [showCdkForm, setShowCdkForm] = useState(false)
  const [cdkSuccess, setCdkSuccess] = useState(false)

  useEffect(() => {
    // If no wallet exists, redirect to setup
    if (!isLoading && !currentWallet) {
      navigate('/setup')
    }
  }, [currentWallet, isLoading, navigate])

  if (isLoading) {
    return <Loading />
  }

  if (!currentWallet) {
    return null // Will redirect to setup
  }

  const getBalanceStatusClass = (balance) => {
    if (balance <= 28) return 'balance--negative'
    if (balance < 840) return 'balance--low'
    return 'balance--positive'
  }

  const handleTransferClick = () => {
    setShowTransferForm(true)
  }

  const handleTransferClose = () => {
    setShowTransferForm(false)
  }

  const handleTransferSuccess = (result) => {
    // Transfer was successful, show success message
    setTransferSuccess(true)
    console.log('Transfer successful:', result)
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setTransferSuccess(false)
    }, 3000)
  }

  const handleCdkClick = () => {
    setShowCdkForm(true)
  }

  const handleCdkClose = () => {
    setShowCdkForm(false)
  }

  const handleCdkSuccess = (result) => {
    // CDK redemption was successful, show success message
    setCdkSuccess(true)
    console.log('CDK redeemed successfully:', result)
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setCdkSuccess(false)
    }, 3000)
  }

  const handleHistoryClick = () => {
    navigate('/history')
  }

  const handleLogout = () => {
    localStorage.removeItem('wallet')
    navigate('/setup')
  }

  return (
    <div className="wallet-dashboard">
      <div className="wallet-dashboard__container">
        <div className="wallet-dashboard__header">
          <p className="wallet-dashboard__username">
            {t('wallet.username')}: {currentWallet.username}
          </p>
        </div>
        
        {transferSuccess && (
          <div className="wallet-dashboard__success">
            {t('transfer.success')}
          </div>
        )}
        
        {cdkSuccess && (
          <div className="wallet-dashboard__success">
            {t('cdk.redeemSuccess')}
          </div>
        )}

        {error && (
          <div className="wallet-dashboard__error">
            {error}
          </div>
        )}

        <div className="wallet-dashboard__balance-card glass-card">
          <div className="balance-card__header">
            <h2 className="balance-card__title">{t('wallet.currentBalance')}</h2>
          </div>
          <div className="balance-card__content">
            <div className={`balance-card__amount ${getBalanceStatusClass(currentWallet.balance)}`}>
              {formatCurrency(currentWallet.balance)}
            </div>
            <div className="balance-card__status">
              {currentWallet.balance <= 28 && (
                <span className="balance-status balance-status--negative">
                  {t('messages.insufficient_funds')}
                </span>
              )}
              {currentWallet.balance > 28 && currentWallet.balance < 840 && (
                <span className="balance-status balance-status--low">
                  {t('wallet.balanceLow')}
                </span>
              )}
              {currentWallet.balance >= 840 && (
                <span className="balance-status balance-status--positive">
                  {t('wallet.balanceSufficient')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="wallet-dashboard__actions">
          <button 
            className="action-button action-button--primary"
            onClick={handleTransferClick}
          >
            {t('wallet.transfer')}
          </button>
          <button 
            className="action-button action-button-cdk"
            onClick={handleCdkClick}
          >
            {t('cdk.redeemTitle')}
          </button>
          <button 
            className="action-button action-button--secondary"
            onClick={handleHistoryClick}
          >
            {t('wallet.history')}
          </button>
          <button 
            className="action-button action-button--danger"
            onClick={handleLogout}
          >
            {t('wallet.logout')}
          </button>
        </div>

        <div className="wallet-dashboard__info glass-card">
          <div className="info-item">
            <span className="info-label">{t('wallet.createdAt')}:</span>
            <span className="info-value">
              {new Date(currentWallet.createdAt || Date.now()).toLocaleDateString()}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">{t('wallet.walletId')}:</span>
            <span className="info-value">{currentWallet.id}</span>
          </div>
        </div>
      </div>

      {showTransferForm && (
        <TransferForm 
          onClose={handleTransferClose}
          onSuccess={handleTransferSuccess}
        />
      )}
      
      {showCdkForm && (
        <CdkRedeemForm 
          onClose={handleCdkClose}
          onSuccess={handleCdkSuccess}
        />
      )}
    </div>
  )
}

export default WalletDashboard