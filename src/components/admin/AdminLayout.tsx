import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { LayoutDashboard, FlaskConical, Newspaper, MessageSquare, Calendar, Users, BarChart2, Settings, LogOut, Package } from 'lucide-react';
import Logo from '@/components/Logo';
import { StatisticsProvider } from '@/context/StatisticsContext';

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navLinks = [
        { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/admin/studies", icon: FlaskConical, label: "Estudios" },
        { to: "/admin/posts", icon: Newspaper, label: "Blog" },
        { to: "/admin/testimonials", icon: MessageSquare, label: "Testimonios" },
        { to: "/admin/appointments", icon: Calendar, label: "Citas" },
        { to: "/admin/patients", icon: Users, label: "Pacientes" },
        { to: "/admin/inventory", icon: Package, label: "Inventario" },
        { to: "/admin/statistics", icon: BarChart2, label: "Estadísticas" },
        { to: "/admin/config", icon: Settings, label: "Configuración" },
    ];

    return (
        <div className="flex h-screen bg-light">
            {/* Sidebar */}
            <aside className="w-64 bg-dark text-white flex flex-col">
                <div className="p-6 text-center border-b border-gray-700">
                    <Logo className="h-12 mx-auto" />
                    <h2 className="mt-2 text-xl font-semibold">Admin Panel</h2>
                </div>
                <nav className="flex-grow p-4">
                    <ul>
                        {navLinks.map(link => (
                            <li key={link.to}>
                                <NavLink
                                    to={link.to}
                                    className={({ isActive }) =>
                                        `flex items-center px-4 py-2 my-1 rounded-md transition-colors ${
                                        isActive ? 'bg-primary text-white' : 'hover:bg-primary/20'
                                        }`
                                    }
                                >
                                    <link.icon className="mr-3" size={20} />
                                    {link.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="p-4 border-t border-gray-700">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                    >
                        <LogOut className="mr-3" size={20} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto bg-light">
                <StatisticsProvider>
                    <Outlet />
                </StatisticsProvider>
            </main>
        </div>
    );
};

export default AdminLayout;