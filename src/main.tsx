import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppContent } from './App.tsx'; // Import AppContent directly
import './index.css';
import { SessionContextProvider } from './components/SessionContextProvider.tsx';
import ToastProvider from './components/ToastProvider.tsx';
import { BrowserRouter } from 'react-router-dom';
import { PermissionsProvider } from './hooks/usePermissions'; // Import PermissionsProvider
import { FleetDataProvider } from './components/FleetDataProvider'; // Import FleetDataProvider

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionContextProvider>
        <ToastProvider />
        <PermissionsProvider> {/* Moved PermissionsProvider here */}
          <FleetDataProvider> {/* Moved FleetDataProvider here */}
            <AppContent />
          </FleetDataProvider>
        </PermissionsProvider>
      </SessionContextProvider>
    </BrowserRouter>
  </StrictMode>
);