import React, { useState } from 'react';
import { Mail, Send, Loader } from 'lucide-react';
import { supabasePublic } from '@/services/supabaseClient';
import { getPublicUrl } from '@/utils/env';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Flujo nativo: se envía un enlace de recuperación y Supabase
  // redirige al usuario a "/nueva-password" con una sesión de recuperación.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const baseUrl = getPublicUrl();
      const redirectTo = baseUrl ? new URL('/nueva-password', baseUrl).toString() : '/nueva-password';
      const { error } = await supabasePublic.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setSuccess('Enlace de recuperación enviado. Revisa tu correo.');
    } catch (e: any) {
      setError(e?.message || 'Error al solicitar la recuperación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-light flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg m-4">
        <h1 className="text-2xl font-bold text-dark text-center">Recuperar contraseña</h1>
        <p className="text-sm text-gray-600 text-center">Ingresa tu correo registrado para recibir un enlace de recuperación.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label htmlFor="email" className="sr-only">Correo electrónico</label>
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Correo electrónico"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-600 text-sm text-center">{success}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400"
          >
            {isLoading ? <Loader className="animate-spin mr-2" /> : <Send className="mr-2" />}
            {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;