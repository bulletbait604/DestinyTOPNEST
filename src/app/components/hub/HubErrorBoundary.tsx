'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  label?: string
}

interface State {
  failed: boolean
}

export function HubSectionFallback() {
  return (
    <section className="gh-card" role="alert">
      <h2>This section hit a snag</h2>
      <p className="gh-muted">The rest of the hub is still available. Refresh the page to try this part again.</p>
    </section>
  )
}

/** Keeps one broken widget from replacing the whole hub with the Next.js error page. */
export default class HubErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[hub] ${this.props.label ?? 'section'} failed`, error, info.componentStack)
  }

  render() {
    if (this.state.failed) return <HubSectionFallback />
    return this.props.children
  }
}
