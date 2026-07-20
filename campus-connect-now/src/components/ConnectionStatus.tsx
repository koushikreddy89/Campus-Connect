/**
 * Connection Status Indicator Component
 * Shows backend connection status in the UI
 */

import React from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showDetails = false,
  position = 'top-right',
}) => {
  const status = useConnectionStatus();
  const lastConnected = React.useRef(status.isConnected);

  React.useEffect(() => {
    // Display connection status in the browser console in development mode only
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Connection Status] Connected: ${status.isConnected}, Latency: ${status.latency ? Math.round(status.latency) : 0}ms`);
    }

    if (lastConnected.current && !status.isConnected) {
      toast.error('Connection lost. Reconnecting...', {
        id: 'connection-status-toast',
        duration: Infinity,
      });
    } else if (!lastConnected.current && status.isConnected) {
      toast.success('Connection restored', {
        id: 'connection-status-toast',
        duration: 3000,
      });
    }

    lastConnected.current = status.isConnected;
  }, [status.isConnected, status.latency]);

  // Never render a permanent floating status badge in the UI
  return null;
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
