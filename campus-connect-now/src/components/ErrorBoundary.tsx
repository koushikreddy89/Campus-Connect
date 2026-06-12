import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[ErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log full error details for debugging
    console.error('[ErrorBoundary] Component Stack:', info.componentStack);
    console.error('[ErrorBoundary] Error Details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Specific handling for lazy loading errors
    if (error.message?.includes('Failed to fetch dynamically imported module')) {
      console.error('[ErrorBoundary] Lazy Loading Error - Module failed to load. This may be due to:');
      console.error('  - Circular dependency in imports');
      console.error('  - Syntax error in the imported module');
      console.error('  - Network error while fetching the module');
      console.error('  - Vite cache issue');
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleRefresh = () => {
    // Clear Vite cache by reloading
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 p-3 rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground text-sm mb-2">
            Unable to load the page you requested.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-muted-foreground/70 mb-6 font-mono break-words max-w-sm">
              Error: {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              onClick={this.handleRefresh}
              variant="outline"
              className="rounded-xl h-10 px-4 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
            <Button
              onClick={() => { this.resetError(); window.location.href = '/home'; }}
              className="gradient-primary rounded-xl h-10 px-4"
            >
              Go Home
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
