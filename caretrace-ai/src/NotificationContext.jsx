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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map(n => (
          <div key={n.id} className={`p-4 rounded-lg shadow-lg text-white text-sm font-medium transition-all transform slide-up flex items-center justify-between min-w-[300px] ${
            n.type === 'error' ? 'bg-red-600' : 
            n.type === 'success' ? 'bg-green-600' : 
            n.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-600'
          }`}>
            <span>{n.message}</span>
            <button onClick={() => removeNotification(n.id)} className="ml-4 text-white/80 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
