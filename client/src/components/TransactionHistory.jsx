import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { useFormatting } from '../hooks/useFormatting'
import Loading from './Loading'
import '../styles/TransactionHistory.css'

const TransactionHistory = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWallet, transactions, pagination, walletService, isLoading, error } = useWallet()
  const { formatCurrency, formatDateTime } = useFormatting()
  const [loadingMore, setLoadingMore] = useState(false)
  const [isTableView, setIsTableView] = useState(false)
  const resizeObserverRef = useRef(null)

  useEffect(() => {
    if (currentWallet) {
      loadTransactions(1)
    }
  }, [currentWallet])

  // listen for window resize events to toggle between card and table views
  useEffect(() => {
    const checkScreenSize = () => {
      setIsTableView(window.innerWidth >= 1024)
    }

    // check ScreenSize on component mount
    checkScreenSize()

    // add window resize event listener
    window.addEventListener('resize', checkScreenSize)

    return () => {
      window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

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
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    if (pagination.hasNextPage && !loadingMore) {
      loadTransactions(pagination.currentPage + 1)
    }
  }

  const getTransactionType = (transaction) => {
    if (transaction.transactionType === 'system') {
      return t('transaction.system')
    }
    
    if (transaction.direction === 'outgoing') {
      return t('transaction.sent')
    } else if (transaction.direction === 'incoming') {
      return t('transaction.received')
    }
    
    return t('transaction.transfer')
  }

  const getTransactionAmount = (transaction) => {
    if (transaction.transactionType === 'system') {
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
    if (transaction.transactionType === 'system' || 
        transaction.direction === 'incoming') {
      return 'transaction-amount-positive'
    } else if (transaction.direction === 'outgoing') {
      return 'transaction-amount-negative'
    }
    return 'transaction-amount-neutral'
  }

  const getOtherParty = (transaction) => {
    if (transaction.transactionType === 'system') {
      return t('transaction.system')
    }
    
    if (transaction.otherWallet) {
      return transaction.otherWallet.username
    }
    
    // Handle third-party payment related transactions
    if (transaction.transactionType === 'third_party_payment') {
      const thirdPartyName = transaction?.thirdPartyName || '';
      return thirdPartyName 
        ? t('transaction.thirdParty', { thirdPartyName: `${t('transaction.thirdPartyPayment')}${t('transaction.thirdPartyPaymentTo')} ${thirdPartyName}` })
        : t('transaction.thirdPartyPayment', { thirdPartyName: '' });
    }
    
    if (transaction.transactionType === 'third_party_receipt') {
      const thirdPartyName = transaction?.thirdPartyName || '';
      return thirdPartyName 
        ? t('transaction.thirdParty', { thirdPartyName: `${t('transaction.thirdPartyReceipt')}${t('transaction.thirdPartyReceiptFrom')} ${thirdPartyName}` })
        : t('transaction.thirdPartyReceipt', { thirdPartyName: '' });
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

  if (isLoading && pagination.currentPage === 1) {
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

          {/* large table view */}
          <div className="transaction-table-container">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>{t('transaction.type')}</th>
                  <th>{t('transaction.party')}</th>
                  <th>{t('transaction.date')}</th>
                  <th className="text-right">{t('transaction.amount')}</th>
                  <th>{t('transaction.description')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{getTransactionType(transaction)}</td>
                    <td>{getOtherParty(transaction)}</td>
                    <td>{formatDateTime(transaction.createdAt)}</td>
                    <td className={`text-right ${getTransactionAmountClass(transaction)}`}>
                      {getTransactionAmount(transaction)}
                    </td>
                    <td className="description-cell" data-description={transaction.description || ''}>
                      {transaction.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination-controls">
              <button
                onClick={() => loadTransactions(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage || loadingMore}
                className="pagination-button"
              >
                {t('common.previous')}
              </button>
              <div className="pagination-info">
                {t('transaction.page', { 
                  current: pagination.currentPage, 
                  total: pagination.totalPages 
                })}
              </div>
              <button 
                onClick={handleLoadMore}
                disabled={!pagination.hasNextPage || loadingMore}
                className="pagination-button load-more-button"
              >
                {loadingMore ? t('messages.loading') : t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TransactionHistory