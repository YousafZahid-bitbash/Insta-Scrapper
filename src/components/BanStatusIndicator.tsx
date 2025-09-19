'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function BanStatusIndicator() {
  const { isAuthenticated, isAdmin, checkBanStatus } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    if (!isAuthenticated || isAdmin) return;

    const checkStatus = async () => {
      setIsChecking(true);
      try {
        await checkBanStatus();
        setLastCheck(new Date());
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately on mount
    checkStatus();

    // Then check every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isAdmin, checkBanStatus]);

  // Don't show anything if not authenticated or if admin
  if (!isAuthenticated || isAdmin) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isChecking ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
        <span className="text-xs text-gray-600">
          {isChecking ? 'Checking status...' : 'Account active'}
        </span>
        {lastCheck && (
          <span className="text-xs text-gray-400">
            ({lastCheck.toLocaleTimeString()})
          </span>
        )}
      </div>
    </div>
  );
}
