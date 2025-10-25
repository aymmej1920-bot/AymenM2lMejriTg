import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx'; // Import App directly
import './index.css';
import { SessionContextProvider } from './components/SessionContextProvider.tsx';
import ToastProvider from './components/ToastProvider.tsx';
import { BrowserRouter } from 'react-router-dom';
import { PermissionsProvider } from './hooks/usePermissions.tsx'; // Import direct
import { FleetDataProvider } from './components/FleetDataProvider.tsx'; // Import direct
import ErrorBoundary from './components/ErrorBoundary.tsx'; // Import the new ErrorBoundary

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary> {/* Wrap the entire application with ErrorBoundary */}
      <BrowserRouter>
        <SessionContextProvider>
          <ToastProvider />
          <PermissionsProvider>
            <FleetDataProvider>
              <App />
            </FleetDataProvider>
          </PermissionsProvider>
        </SessionContextProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);