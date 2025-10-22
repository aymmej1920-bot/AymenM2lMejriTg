import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx'; // Import App directly
import './index.css';
import { SessionContextProvider } from './components/SessionContextProvider.tsx';
import ToastProvider from './components/ToastProvider.tsx';
import { BrowserRouter } from 'react-router-dom';
import { PermissionsProvider } from './hooks/usePermissions.tsx'; // Import direct
import { FleetDataProvider } from './components/FleetDataProvider.tsx'; // Import direct

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionContextProvider>
        <ToastProvider />
        <PermissionsProvider> {/* Déplacé ici */}
          <FleetDataProvider> {/* Déplacé ici */}
            <App />
          </FleetDataProvider>
        </PermissionsProvider>
      </SessionContextProvider>
    </BrowserRouter>
  </StrictMode>
);