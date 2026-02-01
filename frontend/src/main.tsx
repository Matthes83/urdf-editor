import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global Error Boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

class GlobalErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Global Error:', error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack || '' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: 'white',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            padding: '2rem',
            backgroundColor: '#2a2a3e',
            borderRadius: '8px',
            border: '1px solid #ff4444'
          }}>
            <h1 style={{ color: '#ff4444', marginBottom: '1rem' }}>Anwendungsfehler</h1>
            <p style={{ marginBottom: '1rem' }}>
              {this.state.error?.message || 'Ein unbekannter Fehler ist aufgetreten.'}
            </p>
            <pre style={{
              backgroundColor: '#1a1a2e',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '12px',
              marginBottom: '1rem'
            }}>
              {this.state.errorInfo}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
