import { createContext, useState, useContext, useCallback } from 'react';

export const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [{ id, message, type }, ...prev]);
    
    // Auto clear standard toasts after 5 seconds organically
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      {/* Global Toast Render Panel Overlay */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id} 
            role="alert"
            aria-live={n.type === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto p-4 rounded-2xl shadow-[var(--shadow-l3)] backdrop-blur-md border flex items-start gap-3 transition-all transform slide-up ${
            n.type === 'error' ? 'bg-danger/90 border-danger/50 text-white' : 
            n.type === 'success' ? 'bg-success/90 border-success/50 text-white' : 
            n.type === 'warning' ? 'bg-warning/90 border-warning/50 text-white' : 
            'bg-[var(--app-surface-elevated)]/90 border-[var(--app-border)]/50 text-[var(--app-text)]'
          }`}>
            <div className="shrink-0 mt-0.5">
              {n.type === 'error' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              {n.type === 'success' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              )}
              {n.type === 'warning' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              )}
              {n.type === 'info' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">{n.message}</p>
            </div>
            <button 
              onClick={() => removeNotification(n.id)} 
              className={`shrink-0 transition-colors ${n.type === 'info' ? 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]' : 'text-white/60 hover:text-white'}`}
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
