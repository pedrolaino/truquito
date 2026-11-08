import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main>
        <h1>Truquito</h1>
        <p role="alert">Algo salió mal.</p>
        <a href="/">Volver al inicio</a>
      </main>
    )
  }
}
