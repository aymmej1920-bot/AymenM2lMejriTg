"use client";

import { Toaster } from 'react-hot-toast';

const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Define default options
        className: 'glass', // Apply glass effect to toasts
        duration: 5000,
        style: {
          background: 'rgba(255, 255, 255, 0.25)', // Use glass background
          color: '#333', // Adjust text color for light glass background
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        },
        // Default options for specific types
        success: {
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)', // Use success gradient
            color: '#fff',
            border: 'none',
          }
        },
        error: {
          duration: 5000,
          style: {
            background: 'linear-gradient(135deg, #ef4444, #dc2626)', // Use danger gradient
            color: '#fff',
            border: 'none',
          }
        },
        loading: {
          style: {
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', // Use brand gradient for loading
            color: '#fff',
            border: 'none',
          }
        }
      }}
    />
  );
};

export default ToastProvider;