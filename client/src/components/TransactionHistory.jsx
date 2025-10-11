import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useFormatting } from '../hooks/useFormatting'
import Loading from './Loading'

const TransactionHistory = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWallet, transactions, pagination, walletService, isLoading, error } = useWallet()
  const { formatCurrency, formatDateTime } = useFormatting()
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (currentWallet) {
      loadTransactions(1)
    }
  }, [currentWallet])

  const loadTransactions = async (page = 1) => {
    if (!currentWallet) return

    try {
      if (page === 1) {
        // Loading first page
        await walletService.getTransactionHistory(currentWallet.id, page)
      } else {
        // Loading more pages
        setLoadingMore(true)
        await walletService.getTransactionHistory(currentWallet.id, page)
      }
      setCurrentPage(page)
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (currentPage < pagination.totalPages && !loadingMore) {
      loadTransactions(currentPage + 1)
    }
  }

  const getTransactionType = (transaction) => {
    if (transaction.transactionType === 'initial_deposit') {
      return t('transaction.initialDeposit')
    }
    
    if (transaction.direction === 'outgoing') {
      return t('transaction.sent')
    } else if (transaction.direction === 'incoming') {
      return t('transaction.received')
    }
    
    return t('transaction.transfer')
  }

  const getTransactionAmount = (transaction) => {
    if (transaction.transactionType === 'initial_deposit') {
      return `+${formatCurrency(transaction.amount)}`
    }
    
    if (transaction.direction === 'outgoing') {
      return `-${formatCurrency(transaction.amount)}`
    } else if (transaction.direction === 'incoming') {
      return `+${formatCurrency(transaction.amount)}`
    }
    
    return formatCurrency(transaction.amount)
  }

  const getTransactionAmountClass = (transaction) => {
    if (transaction.transactionType === 'initial_deposit' || 
        transaction.direction === 'incoming') {
      return 'transaction-amount-positive'
    } else if (transaction.direction === 'outgoing') {
      return 'transaction-amount-negative'
    }
    return 'transaction-amount-neutral'
  }

  const getOtherParty = (transaction) => {
    if (transaction.transactionType === 'initial_deposit') {
      return t('transaction.system')
    }
    
    if (transaction.otherWallet) {
      return transaction.otherWallet.username
    }
    
    // Handle third-party payment related transactions
    if (['third_party_payment', 'third_party_receipt'].includes(transaction.transactionType)) {
      return t('transaction.thirdParty')
    }
    
    // Handle interest related transactions
    if (['interest_credit', 'interest_debit'].includes(transaction.transactionType)) {
      return t('transaction.interest')
    }
    
    return t('transaction.unknown')
  }

  if (!currentWallet) {
    return (
      <div className="transaction-history">
        <div className="no-wallet-message glass-card">
          <p>{t('wallet.noWallet')}</p>
        </div>
      </div>
    )
  }

  if (isLoading && currentPage === 1) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="transaction-history">
        <div className="error-message glass-card">
          <p>{t('messages.error')}: {error}</p>
          <button 
            onClick={() => loadTransactions(1)}
            className="retry-button"
          >
            {t('common.refresh')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="transaction-history">
      <div className="transaction-history-header">
        <div className="transaction-history-title">
          <button 
            onClick={() => navigate('/')}
            className="back-button"
            aria-label={t('common.back')}
          >
            ← {t('common.back')}
          </button>
          <h2>{t('transaction.history')}</h2>
        </div>
        {pagination.totalTransactions > 0 && (
          <div className="pagination-info">
            {t('transaction.page', { 
              current: pagination.currentPage, 
              total: pagination.totalPages 
            })}
          </div>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="no-transactions glass-card">
          <p>{t('transaction.noTransactions')}</p>
        </div>
      ) : (
        <>
          <div className="transaction-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item glass-card">
                <div className="transaction-main">
                  <div className="transaction-info">
                    <div className="transaction-type">
                      {getTransactionType(transaction)}
                    </div>
                    <div className="transaction-party">
                      {getOtherParty(transaction)}
                    </div>
                    <div className="transaction-date">
                      {formatDateTime(transaction.createdAt)}
                    </div>
                  </div>
                  <div className={`transaction-amount ${getTransactionAmountClass(transaction)}`}>
                    {getTransactionAmount(transaction)}
                  </div>
                </div>
                {transaction.description && (
                  <div className="transaction-description">
                    {transaction.description}
                  </div>
                )}
              </div>
            ))}
          </div>

          {currentPage < pagination.totalPages && (
            <div className="load-more-container">
              <button 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="load-more-button"
              >
                {loadingMore ? t('messages.loading') : t('transaction.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TransactionHistory