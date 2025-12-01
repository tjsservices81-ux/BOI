import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error; resetError: () => void}>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <div className="error-boundary p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Something went wrong
          </h2>
          <p className="text-red-600 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <pre className="text-xs text-red-500 mb-4 p-2 bg-red-50 rounded overflow-auto max-h-32" style={{ fontFamily: 'monospace' }}>
            {this.state.error?.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace available'}
          </pre>
          <button
            onClick={this.resetError}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            style={{ fontFamily: 'OpenSans, sans-serif' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;