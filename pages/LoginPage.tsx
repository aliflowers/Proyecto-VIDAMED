import React, { useState } from 'react';
import { supabase } from '../src/services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Loader } from 'lucide-react';
import Logo from '../components/Logo';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            navigate('/admin');
        }
        setIsLoading(false);
    };

    return (
        <div className="bg-light flex items-center justify-center min-h-screen">
            <div className="w-full max-w-sm p-8 space-y-8 bg-white rounded-xl shadow-lg m-4">
                <div className="text-center">
                    <Logo className="h-16 mx-auto mb-4"/>
                    <h1 className="text-2xl font-bold text-dark">Acceso de Administrador</h1>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
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
                    <div className="relative">
                        <label htmlFor="password" className="sr-only">Contraseña</label>
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            placeholder="Contraseña"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400">
                            {isLoading ? <Loader className="animate-spin mr-2" /> : <LogIn className="mr-2" />}
                            {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
