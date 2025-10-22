import { Component } from 'react'
import { useTranslation } from 'react-i18next'
import '../styles/ErrorBoundary.css'

// Create a wrapper for class components to use hooks
function ErrorBoundaryWithTranslation({ children }) {
  const { t } = useTranslation()
  return <ErrorBoundary t={t}>{children}</ErrorBoundary>
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-overlay">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">{this.props.t('error.title', 'Something Went Wrong')}</h2>
            <p className="error-boundary-message">{this.props.t('error.message', 'We encountered an unexpected error. Please try refreshing the page.')}</p>
            <div className="error-boundary-details">
              <details className="error-details">
                <summary>{this.props.t('error.details', 'Error Details')}</summary>
                <pre>
                  {String(this.state.error)}
                  {this.state.errorInfo?.componentStack && `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                </pre>
              </details>
            </div>
            <button 
              className="error-boundary-button"
              onClick={this.handleReload}
              aria-label="Reload Page"
            >
              {this.props.t('error.refreshButton', 'Reload Page')}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundaryWithTranslation