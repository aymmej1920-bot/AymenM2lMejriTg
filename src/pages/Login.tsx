import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';
import { Truck } from 'lucide-react';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Fleet Manager Pro</h2>
          <p className="text-gray-600 mt-2">Connectez-vous ou créez un compte</p>
        </div>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(240 5.9% 10%)', // A dark gray for brand color
                  brandAccent: 'hsl(240 5.9% 10%)', // Accent color
                },
              },
            },
          }}
          theme="light"
          redirectTo={window.location.origin} // Redirect to the app's root after auth
        />
      </div>
    </div>
  );
};

export default Login;