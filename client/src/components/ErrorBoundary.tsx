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
    console.warn('ErrorBoundary caught an error:', error, errorInfo);
    
    // Handle specific errors silently
    if (error.message?.includes('showAdminLogin') || 
        error.message?.includes('OfflineManager') ||
        error.message?.includes('Can\'t find variable')) {
      // These are non-critical errors, continue silently
      this.resetError();
    }
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
        <div className="error-boundary">
          <h2 className="text-lg font-semibold text-red-800 mb-2" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            Something went wrong
          </h2>
          <p className="text-red-600 mb-4" style={{ fontFamily: 'OpenSans, sans-serif' }}>
            An unexpected error occurred. Please try again.
          </p>
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