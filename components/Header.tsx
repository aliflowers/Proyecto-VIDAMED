import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Logo from './Logo';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { name: 'Inicio', path: '/' },
  { name: 'Catálogo de Estudios', path: '/estudios' },
  { name: 'Blog', path: '/blog' },
  { name: 'Quiénes Somos', path: '/quienes-somos' },
  { name: 'Contacto', path: '/contacto' },
];

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const activeLinkClass = 'text-primary font-semibold';
  const inactiveLinkClass = 'text-gray-600 hover:text-primary transition-colors';

  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <NavLink to="/">
            <Logo className="h-16" />
          </NavLink>
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) => (isActive ? activeLinkClass : inactiveLinkClass)}
              >
                {link.name}
              </NavLink>
            ))}
          </nav>
          <div className="hidden lg:flex items-center space-x-4">
            <NavLink
              to="/portal"
              className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-full hover:bg-primary/5 transition-colors"
            >
              Portal Pacientes
            </NavLink>
            <NavLink
              to="/agendar"
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary-dark transition-colors"
            >
              Agendar Cita
            </NavLink>
          </div>
          <div className="lg:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 hover:text-primary">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200">
          <nav className="flex flex-col items-center space-y-4 p-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `text-lg ${isActive ? activeLinkClass : inactiveLinkClass}`}
              >
                {link.name}
              </NavLink>
            ))}
            <div className="flex flex-col items-center space-y-4 pt-4 w-full">
              <NavLink
                to="/portal"
                onClick={() => setIsOpen(false)}
                className="w-full text-center px-6 py-2.5 text-md font-medium text-primary border border-primary rounded-full hover:bg-primary/5 transition-colors"
              >
                Portal Pacientes
              </NavLink>
              <NavLink
                to="/agendar"
                onClick={() => setIsOpen(false)}
                className="w-full text-center px-6 py-2.5 text-md font-medium text-white bg-primary rounded-full hover:bg-primary-dark transition-colors"
              >
                Agendar Cita
              </NavLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
