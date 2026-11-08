import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="page">
        <h1 className="page-title">Truquito</h1>
        <p role="alert" className="alert">
          Algo salió mal y la partida se cortó. Volvé al inicio para empezar otra.
        </p>
        <a className="btn btn-primary" href="/">
          Volver al inicio
        </a>
      </main>
    )
  }
}
