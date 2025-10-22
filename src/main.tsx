import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx'; // Import App directly
import './index.css';
import { SessionContextProvider } from './components/SessionContextProvider.tsx';
import ToastProvider from './components/ToastProvider.tsx';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionContextProvider>
        <ToastProvider />
        <App />
      </SessionContextProvider>
    </BrowserRouter>
  </StrictMode>
);