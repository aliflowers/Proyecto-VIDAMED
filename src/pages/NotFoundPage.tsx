
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const NotFoundPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center py-20 min-h-[70vh] bg-white">
            <AlertTriangle className="h-24 w-24 text-accent mb-4" />
            <h1 className="text-6xl font-bold text-dark">404</h1>
            <h2 className="text-3xl font-semibold text-dark mt-2">Página no encontrada</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-md">
                Lo sentimos, la página que estás buscando no existe o ha sido movida.
            </p>
            <Link
                to="/"
                className="mt-8 inline-block bg-primary text-white font-semibold px-8 py-3 rounded-full hover:bg-primary-dark transition-colors"
            >
                Volver al Inicio
            </Link>
        </div>
    );
};

export default NotFoundPage;
