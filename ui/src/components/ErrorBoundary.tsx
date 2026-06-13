import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Short label for the fallback box, e.g. the panel name. */
  label?: string
  /** Custom fallback; overrides the default error box when provided. */
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render/commit-phase exceptions in its subtree and shows a compact
 * fallback instead of letting React unmount the whole app to a blank page.
 *
 * Why this exists: the app shipped for a long time with zero error boundaries,
 * so a single panel throwing (e.g. lightweight-charts asserting on a null-close
 * bar from a thin TWSE name) blanked the entire screen to the dark body
 * background — indistinguishable from a crash. Wrap each independently-failing
 * surface so one bad panel degrades to a small error box, not a dead app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the stack in the console so the underlying bug is still diagnosable
    // even though the user only sees the compact fallback.
    console.error('[ErrorBoundary]', this.props.label ?? '', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback
      return (
        <div className="flex h-full min-h-[64px] flex-col items-center justify-center gap-1 rounded border border-red/30 bg-red/5 p-3 text-center text-[12px] text-red">
          <span>{this.props.label ? `${this.props.label} failed to render` : 'This panel failed to render'}</span>
          <span className="text-text-muted/70">{this.state.error.message}</span>
        </div>
      )
    }
    return this.props.children
  }
}
