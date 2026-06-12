/**
 * Connection Status Indicator Component
 * Shows backend connection status in the UI
 */

import React from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showDetails = false,
  position = 'top-right',
}) => {
  const status = useConnectionStatus();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (status.isConnected) {
    return (
      <div
        className={`fixed ${positionClasses[position]} z-50 flex items-center gap-2 bg-green-500/20 border border-green-500 text-green-600 px-4 py-2 rounded-lg transition-all`}
      >
        <CheckCircle size={16} className="text-green-500" />
        <span className="text-sm font-medium">Connected</span>
        {showDetails && status.latency && (
          <span className="text-xs text-green-500/70">({Math.round(status.latency)}ms)</span>
        )}
      </div>
    );
  }

  // Checking status (default)
  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex items-center gap-2 bg-yellow-500/20 border border-yellow-500 text-yellow-600 px-4 py-2 rounded-lg transition-all`}
    >
      <Loader2 size={16} className="text-yellow-500 animate-spin" />
      <span className="text-sm font-medium">Connecting...</span>
    </div>
  );
};

/**
 * Connection Error Alert Component
 * Shows error message when backend is unreachable
 */
interface ConnectionErrorAlertProps {
  onRetry?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const ConnectionErrorAlert: React.FC<ConnectionErrorAlertProps> = ({
  onRetry,
  dismissible = true,
  onDismiss,
}) => {
  const status = useConnectionStatus();
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (status.isConnected || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleRetry = () => {
    setIsDismissed(false);
    onRetry?.();
  };

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
      <div className="flex items-start">
        <AlertCircle className="text-red-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
        <div className="flex-1">
          <h3 className="text-red-800 font-semibold">Backend Connection Error</h3>
          <p className="text-red-700 text-sm mt-1">
            {status.error || 'Unable to connect to the backend server'}
          </p>
          <p className="text-red-600 text-xs mt-2">
            Please ensure the backend server is running on <code className="bg-red-100 px-1 rounded">http://localhost:5000</code>
          </p>
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={handleRetry}
                className="text-red-700 hover:text-red-800 font-medium text-sm underline"
              >
                Retry Connection
              </button>
            )}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="text-red-600 hover:text-red-700 text-sm ml-auto"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatusIndicator;
