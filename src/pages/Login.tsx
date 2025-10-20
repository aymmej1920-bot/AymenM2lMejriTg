import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';
import { Truck } from 'lucide-react';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
        <div className="text-center mb-8">
          <div className="bg-gradient-brand w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Fleet Manager Pro</h2>
          <p className="text-gray-600 mt-2">Connectez-vous ou créez un compte</p>
          <p className="text-gray-500 text-sm font-semibold mt-1">TG&M2L</p>
        </div>
        <div className="supabase-auth-glass-theme">
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(262 83% 58%)', // Un violet vibrant, similaire à purple-600
                    brandAccent: 'hsl(221 83% 53%)', // Un bleu vibrant, similaire à blue-600
                  },
                },
              },
            }}
            theme="light"
            redirectTo={window.location.origin} // Redirige vers la racine de l'application après l'authentification
          />
        </div>
      </div>
    </div>
  );
};

export default Login;