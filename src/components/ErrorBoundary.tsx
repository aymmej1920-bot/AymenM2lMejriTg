import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  // Cette méthode est appelée après qu'une erreur a été générée par un composant enfant.
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Mettre à jour l'état pour que le prochain rendu affiche l'UI de secours.
    return { hasError: true, error, errorInfo: null };
  }

  // Cette méthode est appelée après qu'une erreur a été générée.
  // Elle est utilisée pour logger l'erreur.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
    // Vous pouvez également envoyer l'erreur à un service de journalisation ici
    // logErrorToMyService(error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Vous pouvez rendre n'importe quelle UI de secours personnalisée
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-red-100 to-orange-100 flex items-center justify-center p-4">
          <div className="glass rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scale-in">
            <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Oups ! Quelque chose s'est mal passé.</h2>
            <p className="text-gray-600 mb-6">
              Nous sommes désolés, une erreur inattendue est survenue.
              Veuillez essayer de recharger la page.
            </p>
            <Button onClick={this.handleReload} className="bg-gradient-danger text-white px-6 py-3 rounded-lg flex items-center justify-center mx-auto space-x-2 hover-lift">
              <RefreshCw className="w-5 h-5" />
              <span>Recharger la page</span>
            </Button>
            {/* Pour le débogage, vous pouvez afficher les détails de l'erreur */}
            {/* {this.state.error && (
              <details className="mt-4 text-sm text-gray-500 text-left p-4 bg-white/10 rounded-lg overflow-auto max-h-40">
                <summary className="font-semibold cursor-pointer">Détails de l'erreur</summary>
                <pre className="whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                  <br />
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )} */}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;