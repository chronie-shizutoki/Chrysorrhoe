import { createContext, useContext, useReducer, useEffect, useMemo } from 'react'
import WalletService from '../services/walletService'
import { languageStorage } from '../utils/languageStorage'

const WalletContext = createContext()

const initialState = {
  currentWallet: null,
  transactions: [],
  currentLanguage: languageStorage.getLanguage(),
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalTransactions: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 10
  }
}

function walletReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'SET_WALLET':
      return { ...state, currentWallet: action.payload, error: null }
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload }
    case 'SET_LANGUAGE':
      return { ...state, currentLanguage: action.payload }
    case 'SET_PAGINATION':
      return { ...state, pagination: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

export function WalletProvider({ children }) {
  const [state, dispatch] = useReducer(walletReducer, initialState)

  // Load wallet data from localStorage on app start
  useEffect(() => {
    const savedWallet = localStorage.getItem('wallet')
    const savedLanguage = languageStorage.getLanguage()
    
    if (savedWallet) {
      try {
        const wallet = JSON.parse(savedWallet)
        dispatch({ type: 'SET_WALLET', payload: wallet })
      } catch (error) {
        console.error('Error loading wallet from localStorage:', error)
        localStorage.removeItem('wallet')
      }
    }
    
    // Set language from storage or browser preference
    if (savedLanguage && languageStorage.isSupported(savedLanguage)) {
      dispatch({ type: 'SET_LANGUAGE', payload: savedLanguage })
    } else {
      const browserLanguage = languageStorage.getBrowserLanguage()
      dispatch({ type: 'SET_LANGUAGE', payload: browserLanguage })
      languageStorage.setLanguage(browserLanguage)
    }
  }, [])

  const walletService = useMemo(() => new WalletService(dispatch), [dispatch])

  const value = {
    ...state,
    dispatch,
    walletService
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

export default WalletProvider