import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n/config'
import WalletProvider from './context/WalletContext'
import { WalletSetup, WalletDashboard, TransactionHistory, Layout, ErrorBoundary } from './components'
import './App.css'
import './styles/liquid-glass.css'

function App() {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <WalletProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <Layout>
              <Routes>
                <Route path="/" element={<WalletDashboard />} />
                <Route path="/setup" element={<WalletSetup />} />
                <Route path="/history" element={<TransactionHistory />} />
              </Routes>
            </Layout>
          </Router>
        </WalletProvider>
      </I18nextProvider>
    </ErrorBoundary>
  )
}

export default App