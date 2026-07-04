import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        // Define clean styling configurations for notification toasts
        style: {
          borderRadius: '12px',
          background: '#1E293B',
          color: '#F8FAFC',
          fontSize: '14px',
          padding: '12px 16px'
        },
        success: {
          duration: 3500,
          theme: {
            primary: '#10B981'
          }
        },
        error: {
          duration: 4000,
          theme: {
            primary: '#F43F5E'
          }
        }
      }}
    />
  </React.StrictMode>
);
