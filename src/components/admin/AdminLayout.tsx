import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { LayoutDashboard, FlaskConical, Newspaper, MessageSquare, Calendar, Users, BarChart2, Settings, LogOut, Package, Menu, FileText, UserCog, Banknote } from 'lucide-react';
import Logo from '@/components/Logo';
import { StatisticsProvider } from '@/context/StatisticsContext';
import { ToastContainer } from 'react-toastify';

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userName, setUserName] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('');
    const [userEmail, setUserEmail] = useState<string>('');

    // Cargar nombre completo y rol del usuario autenticado
    useEffect(() => {
        (async () => {
            try {
                const { data: auth } = await supabase.auth.getUser();
                const uid = auth?.user?.id || null;
                let rol: string | null = null;
                let nombre = '';
                let apellido = '';

                if (uid) {
                    const { data: profile, error } = await supabase
                        .from('user_profiles')
                        .select('nombre, apellido, rol')
                        .eq('user_id', uid)
                        .single();

                    if (!error && profile) {
                        nombre = (profile as any).nombre || '';
                        apellido = (profile as any).apellido || '';
                        rol = (profile as any).rol || null;
                    }
                }

                // Fallback a metadata si no hay nombre/apellido en profile
                const meta = (auth?.user?.user_metadata || {}) as Record<string, any>;
                if (!nombre) nombre = meta.nombre || meta.nombres || '';
                if (!apellido) apellido = meta.apellido || meta.apellidos || '';

                setUserName([nombre, apellido].filter(Boolean).join(' '));
                setUserRole(rol ? rol : (meta?.rol ? String(meta.rol) : ''));
                setUserEmail(auth?.user?.email || '');
            } catch (e) {
                setUserName('');
                setUserRole('');
                setUserEmail('');
            }
        })();
    }, []);

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
        { to: "/admin/results", icon: FileText, label: "Resultados" },
        { to: "/admin/statistics", icon: BarChart2, label: "Estadísticas" },
        // Enlace al módulo de Gestión de Usuarios (por encima de Configuración y debajo del panel de estadísticas)
        { to: "/admin/gestion_usuarios", icon: UserCog, label: "Gestión de Usuarios" },
        // Módulo de Control de Gastos (visible solo para la usuaria principal)
        ...(userEmail && userEmail.toLowerCase() === 'anamariaprieto@labvidamed.com' ? [
            { to: "/admin/expenses", icon: Banknote, label: "Control de Gastos" },
        ] : []),
        { to: "/admin/config", icon: Settings, label: "Configuración" },
    ];

    const sidebarContent = (
        <>
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
                                onClick={() => setSidebarOpen(false)}
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
        </>
    );

    return (
        <div className="flex h-screen bg-light">
            {/* Overlay móvil */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <>
                {/* Desktop */}
                <aside className="hidden lg:flex lg:w-64 xl:w-72 bg-dark text-white flex-col">
                    {sidebarContent}
                </aside>

                {/* Mobile */}
                <aside className={`lg:hidden fixed inset-y-0 left-0 z-30 w-64 bg-dark text-white flex flex-col transform ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } transition-transform duration-300 ease-in-out`}>
                    {sidebarContent}
                </aside>
            </>

            {/* Main Content */}
            <main className="flex-1 min-w-0 lg:pl-0 relative">
                {/* Header móvil con botón submenu */}
                <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-gray-600 hover:text-primary p-2"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex-1 flex justify-center">
                        <Logo className="h-10" />
                    </div>
                    <div className="w-10" />
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto bg-light min-h-screen lg:h-screen">
                    {/* Mensaje de bienvenida con nombre y rol */}
                    {(userName || userRole) && (
                        <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <p className="text-gray-800 font-semibold">Bienvenido(a) {userName || 'Usuario'}</p>
                                {userRole && (
                                    <p className="text-sm text-gray-600">Rol: {userRole}</p>
                                )}
                            </div>
                        </div>
                    )}
                    <StatisticsProvider>
                        <Outlet />
                    </StatisticsProvider>
                    {/* Contenedor de notificaciones para el panel admin */}
                    <ToastContainer position="top-right" autoClose={4000} newestOnTop closeOnClick pauseOnHover />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
