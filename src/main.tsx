import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SessionContextProvider } from './components/SessionContextProvider.tsx';
import ToastProvider from './components/ToastProvider.tsx';
import { ThemeProvider } from './components/ThemeProvider.tsx'; // Import ThemeProvider

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider> {/* Wrap the entire app with ThemeProvider */}
      <SessionContextProvider>
        <ToastProvider />
        <App />
      </SessionContextProvider>
    </ThemeProvider>
  </StrictMode>
);