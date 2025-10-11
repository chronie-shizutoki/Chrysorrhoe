import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useFormatting } from '../hooks/useFormatting'
import Loading from './Loading'
import TransferForm from './TransferForm'

function WalletDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWallet, isLoading, error } = useWallet()
  const { formatCurrency } = useFormatting()
  const [showTransferForm, setShowTransferForm] = useState(false)

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
    if (balance <= 2800) return 'balance--negative'
    if (balance < 84000) return 'balance--low'
    return 'balance--positive'
  }

  const handleTransferClick = () => {
    setShowTransferForm(true)
  }

  const handleTransferClose = () => {
    setShowTransferForm(false)
  }

  const handleTransferSuccess = (result) => {
    // Transfer was successful, form will close automatically
    // The wallet balance will be updated by the walletService
    console.log('Transfer successful:', result)
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
          <h1 className="wallet-dashboard__title">{t('wallet.dashboard')}</h1>
          <p className="wallet-dashboard__username">
            {t('wallet.username')}: {currentWallet.username}
          </p>
        </div>

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
              {currentWallet.balance <= 2800 && (
                <span className="balance-status balance-status--negative">
                  {t('messages.insufficient_funds')}
                </span>
              )}
              {currentWallet.balance > 2800 && currentWallet.balance < 84000 && (
                <span className="balance-status balance-status--low">
                  {t('wallet.balanceLow')}
                </span>
              )}
              {currentWallet.balance >= 84000 && (
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
    </div>
  )
}

export default WalletDashboard