/**
 * useConnectionStatus Hook
 * Monitor backend connection status in React components
 */

import { useState, useEffect } from 'react';
import {
  subscribeToConnectionStatus,
  getConnectionStatus,
  ConnectionStatus,
} from '@/services/connectionService';

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(() => getConnectionStatus());

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = subscribeToConnectionStatus((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  return status;
}
