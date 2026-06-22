import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextProps {
  showNotification: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((type: NotificationType, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setNotifications((prev) => [...prev, { id, type, message }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500 shrink-0" />;
    }
  };

  const getCardStyle = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-white border-l-4 border-emerald-500 shadow-lg border-slate-100';
      case 'error':
        return 'bg-white border-l-4 border-rose-500 shadow-lg border-slate-100';
      case 'warning':
        return 'bg-white border-l-4 border-amber-500 shadow-lg border-slate-100';
      case 'info':
        return 'bg-white border-l-4 border-blue-500 shadow-lg border-slate-100';
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Toast container: top-right on desktop, top-center on mobile */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[9999] flex flex-col gap-3 max-w-full sm:max-w-md pointer-events-none">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${getCardStyle(
              notif.type
            )} transition duration-300 transform translate-x-0 animate-fade-in`}
            role="alert"
          >
            {getIcon(notif.type)}
            <div className="flex-1 text-slate-800 text-xs font-semibold leading-relaxed pt-0.5">
              {notif.message}
            </div>
            <button
              onClick={() => removeNotification(notif.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
