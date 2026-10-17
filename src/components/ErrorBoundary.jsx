import React from 'react';
import { logAuditEvent, AUDIT_CATEGORIES, AUDIT_SEVERITY } from '../utils/auditLogger';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught unhandled rendering error:', error, errorInfo);

    // Non-blocking attempt to log error event
    try {
      logAuditEvent({
        action: 'RUNTIME_ERROR_CAUGHT',
        category: AUDIT_CATEGORIES.SYSTEM,
        details: `UI Runtime Error: ${error?.message || 'Unknown error'}`,
        severity: AUDIT_SEVERITY.CRITICAL,
        metadata: {
          errorMessage: error?.message,
          errorStack: error?.stack?.slice(0, 1000),
          componentStack: errorInfo?.componentStack?.slice(0, 1000)
        }
      }).catch(() => {});
    } catch {
      // ignore
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleCopyError = () => {
    const errorDetails = `Error: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-boundary-icon-wrapper">
              <svg className="error-boundary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            
            <h2 className="error-boundary-title">Something unexpected happened</h2>
            <p className="error-boundary-message">
              The application encountered a runtime error while rendering this page. Your data remains safe and saved.
            </p>

            <div className="error-boundary-actions">
              <button 
                type="button" 
                className="btn-primary-error" 
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button 
                type="button" 
                className="btn-secondary-error" 
                onClick={this.handleReload}
              >
                Reload Application
              </button>
              <a 
                href="/dashboard" 
                className="btn-link-error"
              >
                Go to Dashboard
              </a>
            </div>

            {this.state.error && (
              <details className="error-boundary-details">
                <summary className="error-boundary-summary">
                  <span>View Technical Details</span>
                  <button 
                    type="button" 
                    className="btn-copy-error"
                    onClick={(e) => {
                      e.preventDefault();
                      this.handleCopyError();
                    }}
                  >
                    {this.state.copied ? 'Copied!' : 'Copy Error'}
                  </button>
                </summary>
                <div className="error-boundary-trace">
                  <p className="error-message-text"><strong>Error:</strong> {this.state.error.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="error-stack-pre">{this.state.errorInfo.componentStack}</pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
