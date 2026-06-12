/**
 * FCM Setup Component Example
 * 
 * Usage in your main App component or onboarding:
 * 
 * import { FCMSetup } from '@/components/FCMSetup';
 * 
 * <FCMSetup userId={currentUser?.id} />
 */

import { useEffect, useState } from 'react';
import { useFCM } from '@/hooks/useFCM';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Bell, CheckCircle, Clock } from 'lucide-react';

interface FCMSetupProps {
  userId?: string;
  backendUrl?: string;
  onSetupComplete?: (token: string | null) => void;
  autoSetup?: boolean;
}

/**
 * Component to set up Firebase Cloud Messaging
 * Handles permission request and token generation
 */
export const FCMSetup = ({
  userId,
  backendUrl = 'http://localhost:5000',
  onSetupComplete,
  autoSetup = true
}: FCMSetupProps) => {
  const { permission, token, loading, error, retrySetup } = useFCM({
    userId,
    backendUrl,
    autoSetup
  });

  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  // Call callback when setup is complete
  useEffect(() => {
    if (!loading && onSetupComplete) {
      onSetupComplete(token);
    }
  }, [loading, token, onSetupComplete]);

  // Show prompt if permission is not granted
  useEffect(() => {
    if (permission === 'denied' || (permission === 'default' && !autoSetup)) {
      setShowPermissionPrompt(true);
    } else {
      setShowPermissionPrompt(false);
    }
  }, [permission, autoSetup]);

  const getStatusIcon = () => {
    if (loading) return <Clock className="h-5 w-5 animate-spin text-blue-500" />;
    if (permission === 'granted' && token) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (permission === 'denied') return <AlertCircle className="h-5 w-5 text-red-500" />;
    return <Bell className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (loading) return 'Setting up notifications...';
    if (permission === 'granted' && token) return 'Notifications enabled';
    if (permission === 'denied') return 'Notifications blocked';
    if (error) return `Error: ${error}`;
    return 'Permission pending';
  };

  const getStatusColor = () => {
    if (loading) return 'bg-blue-50 border-blue-200';
    if (permission === 'granted' && token) return 'bg-green-50 border-green-200';
    if (permission === 'denied') return 'bg-red-50 border-red-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  return (
    <Card className={`border border-2 ${getStatusColor()}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div className="flex-1">
            <CardTitle className="text-base">Push Notifications</CardTitle>
            <CardDescription className="text-sm">{getStatusText()}</CardDescription>
          </div>
        </div>
      </CardHeader>

      {showPermissionPrompt && (
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Enable notifications to receive instant updates about new messages and events.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={retrySetup}
              disabled={loading}
              className="flex-1"
              variant="default"
            >
              {loading ? 'Setting up...' : 'Enable Notifications'}
            </Button>

            <Button
              onClick={() => setShowPermissionPrompt(false)}
              variant="outline"
              className="flex-1"
            >
              Skip
            </Button>
          </div>
        </CardContent>
      )}

      {token && (
        <CardContent className="space-y-2 text-xs text-gray-600">
          <p>
            <strong>Token stored:</strong> {token.substring(0, 20)}...
          </p>
          <p className="text-gray-500">
            You'll receive push notifications even when the app is closed.
          </p>
        </CardContent>
      )}

      {error && (
        <CardContent>
          <p className="text-sm text-red-600">
            <strong>Setup failed:</strong> {error}
          </p>
          <Button
            onClick={retrySetup}
            disabled={loading}
            size="sm"
            variant="outline"
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

/**
 * Minimal notification badge component
 * Use to show notification status in UI
 */
export const NotificationBadge = () => {
  const { permission, token } = useFCM({ autoSetup: false });

  if (permission === 'granted' && token) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
        <Bell className="h-3 w-3" />
        <span>Notifications On</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
        <AlertCircle className="h-3 w-3" />
        <span>Notifications Off</span>
      </div>
    );
  }

  return null;
};

/**
 * Quick enable notification button
 * Use to add notification setup to any page
 */
export const QuickNotificationSetup = ({ userId }: { userId?: string }) => {
  const { permission, loading, retrySetup } = useFCM({ userId, autoSetup: false });

  if (permission === 'granted') {
    return null; // Already enabled
  }

  return (
    <Button
      onClick={retrySetup}
      disabled={loading}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      {loading ? 'Enabling...' : 'Enable Notifications'}
    </Button>
  );
};
