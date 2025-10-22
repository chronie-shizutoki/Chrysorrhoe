import { walletAPI } from './api'
import i18n from '../i18n/config'

class WalletService {
  constructor(dispatch) {
    this.dispatch = dispatch
  }

  async createWallet(username, initialBalance) {
    try {
      this.dispatch({ type: 'SET_LOADING', payload: true })
      const result = await walletAPI.createWallet(username, initialBalance)
      
      if (result.success) {
        this.dispatch({ type: 'SET_WALLET', payload: result.wallet })
        localStorage.setItem('wallet', JSON.stringify(result.wallet))
        return result
      } else {
        throw new Error(i18n.t('messages.walletCreationFailed'))
      }
    } catch (error) {
      this.dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      this.dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  async loginWallet(username) {
    try {
      this.dispatch({ type: 'SET_LOADING', payload: true })
      const result = await walletAPI.getWalletByUsername(username)
      
      if (result.success) {
        this.dispatch({ type: 'SET_WALLET', payload: result.wallet })
        localStorage.setItem('wallet', JSON.stringify(result.wallet))
        return result
      } else {
        throw new Error(i18n.t('messages.walletNotFound'))
      }
    } catch (error) {
      this.dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      this.dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  async getWallet(walletId) {
    try {
      this.dispatch({ type: 'SET_LOADING', payload: true })
      const result = await walletAPI.getWallet(walletId)
      this.dispatch({ type: 'SET_WALLET', payload: result.wallet })
      return result
    } catch (error) {
      this.dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      this.dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  async transfer(fromWalletId, toWalletId, amount) {
    try {
      this.dispatch({ type: 'SET_LOADING', payload: true })
      const result = await walletAPI.transfer(fromWalletId, toWalletId, amount)
      
      if (result.success) {
        // Update wallet balance after successful transfer
        await this.getWallet(fromWalletId)
        return result
      } else {
        throw new Error(i18n.t('messages.transferFailed'))
      }
    } catch (error) {
      this.dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      this.dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  async transferByUsername(fromUsername, toUsername, amount) {
    try {
      this.dispatch({ type: 'SET_LOADING', payload: true })
      const result = await walletAPI.transferByUsername(fromUsername, toUsername, amount)
      
      if (result.success) {
        // Update wallet balance after successful transfer
        const currentWallet = JSON.parse(localStorage.getItem('wallet'))
        if (currentWallet) {
          await this.getWallet(currentWallet.id)
        }
        return result
      } else {
        throw new Error(result.error || i18n.t('messages.transferFailed'))
      }
    } catch (error) {
      this.dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      this.dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  async getTransactionHistory(walletId, page = 1, limit = 10 ) {
    try {
      this.dispatch({ type: 'SET_LOADING', payload: true })
      const result = await walletAPI.getTransactionHistory(walletId, page, limit)
      
      // Extract pagination information from API response
      const paginationData = result.pagination || {
        currentPage: result.page || page,
        totalPages: Math.ceil(result.total / limit),
        totalTransactions: result.total || 0,
        limit: limit,
        hasNextPage: result.hasNextPage || result.page < Math.ceil(result.total / limit),
        hasPreviousPage: result.hasPreviousPage || result.page > 1
      }
      
      this.dispatch({ type: 'SET_TRANSACTIONS', payload: result.transactions })
      this.dispatch({ 
        type: 'SET_PAGINATION', 
        payload: paginationData
      })
      
      return result
    } catch (error) {
      this.dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      this.dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  clearError() {
    this.dispatch({ type: 'CLEAR_ERROR' })
  }
}

export default WalletService