import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';

const Footer: React.FC = () => {
  const quickLinks = [
    { name: 'Catálogo de Estudios', path: '/estudios' },
    { name: 'Agendar Cita', path: '/agendar' },
    { name: 'Portal de Pacientes', path: '/portal' },
    { name: 'Blog de Salud', path: '/blog' },
  ];
  
  const companyLinks = [
    { name: 'Quiénes Somos', path: '/quienes-somos' },
    { name: 'Contacto', path: '/contacto' },
    { name: 'Términos de Servicio', path: '/terminos-de-servicio' },
    { name: 'Política de Privacidad', path: '/politica-de-privacidad' },
  ];

  return (
    <footer className="bg-dark text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Logo and About */}
          <div className="space-y-4">
            <Link to="/">
              <Logo className="h-14" />
            </Link>
            <p className="text-gray-300 text-sm">
              Resultados precisos, cuidado cercano. Tu salud en manos expertas.
            </p>
            <div className="flex space-x-4">
              <a href="https://instagram.com/labvidamed" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white"><Instagram /></a>
              <a href="#" className="text-gray-300 hover:text-white"><Facebook /></a>
              <a href="#" className="text-gray-300 hover:text-white"><Twitter /></a>
              <a href="#" className="text-gray-300 hover:text-white"><Linkedin /></a>
            </div>
          </div>
          
          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Accesos Rápidos</h3>
            <ul className="space-y-2">
              {quickLinks.map(link => (
                <li key={link.name}>
                  <Link to={link.path} className="text-gray-300 hover:text-white transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Compañía</h3>
            <ul className="space-y-2">
              {companyLinks.map(link => (
                <li key={link.name}>
                  <Link to={link.path} className="text-gray-300 hover:text-white transition-colors">{link.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Contacto</h3>
            <address className="not-italic text-gray-300 space-y-2">
              <p>Calle Principal, entre Calle 1 y Calle 2, Urb. Calicanto, Maracay, Edo. Aragua, Venezuela.</p>
              <p><strong>Teléfono:</strong> +58 (212) 555-1234</p>
              <p><strong>Email:</strong> contacto@vidamed.lab</p>
            </address>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Laboratorio Clínico VidaMed, C.A. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
