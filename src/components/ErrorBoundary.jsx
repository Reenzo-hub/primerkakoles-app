import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Что-то сломалось</h1>
            <p style={{ color: '#a3a3a3', fontSize: 14, marginBottom: 16 }}>
              {String(this.state.error?.message || this.state.error)}
            </p>
            <button
              onClick={() => location.reload()}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                background: '#f97316',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Перезагрузить
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
