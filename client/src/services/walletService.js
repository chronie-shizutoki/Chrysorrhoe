import { walletAPI } from './api'

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
        throw new Error('Failed to create wallet')
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
        throw new Error('Wallet not found')
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
        throw new Error('Transfer failed')
      }
    } catch (error) {
      this.dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      this.dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  async getTransactionHistory(walletId, page = 1, limit = 20) {
    try {
      this.dispatch({ type: 'SET_LOADING', payload: true })
      const result = await walletAPI.getTransactionHistory(walletId, page, limit)
      
      this.dispatch({ type: 'SET_TRANSACTIONS', payload: result.transactions })
      this.dispatch({ 
        type: 'SET_PAGINATION', 
        payload: {
          currentPage: result.page,
          totalPages: Math.ceil(result.total / limit),
          totalTransactions: result.total
        }
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