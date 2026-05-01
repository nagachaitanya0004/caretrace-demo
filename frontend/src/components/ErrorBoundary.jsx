import { Component } from 'react';
import Button from './Button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In production, send to error monitoring (Sentry, etc.)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px] gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--app-surface-soft)] border border-[var(--app-border)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--app-text-disabled)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--app-text)] mb-1">
              {this.props.title || 'Something went wrong'}
            </p>
            <p className="text-xs text-[var(--app-text-muted)] max-w-[240px] mx-auto leading-relaxed">
              {this.props.subtitle || 'This section failed to load.'}
            </p>
          </div>
          {this.props.onRetry && (
            <Button
              intent="ghost"
              size="sm"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onRetry?.();
              }}
            >
              Try again
            </Button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
