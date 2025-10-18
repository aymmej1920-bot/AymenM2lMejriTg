import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SessionContextProvider } from './components/SessionContextProvider.tsx';
import ToastProvider from './components/ToastProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionContextProvider>
      <ToastProvider />
      <App />
    </SessionContextProvider>
  </StrictMode>
);