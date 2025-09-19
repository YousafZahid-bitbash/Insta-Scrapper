'use client';

import { useEffect } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'ban' | 'unban' | 'warning' | 'danger';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type,
  isLoading = false
}: ConfirmationModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'ban':
        return {
          icon: '🚫',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          borderColor: 'border-red-200',
          titleColor: 'text-red-900'
        };
      case 'unban':
        return {
          icon: '✅',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          confirmBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          borderColor: 'border-green-200',
          titleColor: 'text-green-900'
        };
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          borderColor: 'border-yellow-200',
          titleColor: 'text-yellow-900'
        };
      case 'danger':
        return {
          icon: '🔥',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          confirmBg: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
          borderColor: 'border-orange-200',
          titleColor: 'text-orange-900'
        };
      default:
        return {
          icon: '❓',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          confirmBg: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
          borderColor: 'border-gray-200',
          titleColor: 'text-gray-900'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-out"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 ease-out scale-100 opacity-100 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className={`px-6 py-4 bg-gradient-to-r ${type === 'ban' ? 'from-red-50 to-red-100' : type === 'unban' ? 'from-green-50 to-green-100' : 'from-gray-50 to-gray-100'} border-b ${styles.borderColor}`}>
            <div className="flex items-center space-x-3">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center text-2xl`}>
                {styles.icon}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${styles.titleColor}`}>
                  {title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Please confirm your action
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            <p className="text-gray-700 leading-relaxed">
              {message}
            </p>
            
            {/* Additional info based on type */}
            {type === 'ban' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="text-red-500 text-sm">ℹ️</div>
                  <div className="text-sm text-red-700">
                    <p className="font-medium">This action will:</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• Immediately log out the user</li>
                      <li>• Prevent them from accessing the platform</li>
                      <li>• Send them a notification email</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {type === 'unban' && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="text-green-500 text-sm">ℹ️</div>
                  <div className="text-sm text-green-700">
                    <p className="font-medium">This action will:</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      <li>• Restore user access to the platform</li>
                      <li>• Allow them to log in again</li>
                      <li>• Send them a reactivation email</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBg}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
