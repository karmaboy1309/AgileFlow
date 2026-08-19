import { useState, useEffect } from 'react';

export default function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="offline-banner" style={{ background: '#ef4444', color: '#ffffff', padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, position: 'sticky', top: 0, zIndex: 9999 }}>
      ⚠️ You are currently offline. AgileFlow is running in offline fallback mode. Changes will sync when network is restored.
    </div>
  );
}
