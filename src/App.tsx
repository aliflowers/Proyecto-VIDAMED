
import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import StudiesPage from '@/pages/StudiesPage';
import SchedulingPage from '@/pages/SchedulingPage';
import PatientPortalPage from '@/pages/PatientPortalPage';
import BlogPage from '@/pages/BlogPage';
import PostPage from '@/pages/PostPage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import TermsOfServicePage from '@/pages/TermsOfServicePage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ChatWidget from '@/components/ChatWidget';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import NewPasswordPage from '@/pages/NewPasswordPage';
import AdminLayout from '@/components/admin/AdminLayout';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import DashboardPage from '@/pages/admin/DashboardPage';
import StudiesAdminPage from '@/pages/admin/StudiesAdminPage';
import PostsAdminPage from '@/pages/admin/PostsAdminPage';
import TestimonialsAdminPage from '@/pages/admin/TestimonialsAdminPage';
import AppointmentsAdminPage from '@/pages/admin/AppointmentsAdminPage';
import PatientsAdminPage from '@/pages/admin/PatientsAdminPage';
import PatientDetailPage from '@/pages/admin/PatientDetailPage';
import StatisticsPage from '@/pages/admin/StatisticsPage';
import SiteConfigPage from '@/pages/admin/SiteConfigPage';
import InventoryPage from '@/pages/admin/InventoryPage';
import ResultsPage from '@/pages/admin/ResultsPage';
import UsersManagementPage from '@/pages/admin/UsersManagementPage';

// Componente para renderizar el layout principal
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    if (isAdminRoute) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-light font-sans text-dark">
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
            <ChatWidget />
        </div>
    );
};

const App: React.FC = () => {
  return (
        <BrowserRouter>
            <MainLayout>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/estudios" element={<StudiesPage />} />
                    <Route path="/agendar" element={<SchedulingPage />} />
                    <Route path="/portal" element={<PatientPortalPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<PostPage />} />
                <Route path="/quienes-somos" element={<AboutPage />} />
                    <Route path="/contacto" element={<ContactPage />} />
                    <Route path="/terminos-de-servicio" element={<TermsOfServicePage />} />
                    <Route path="/politica-de-privacidad" element={<PrivacyPolicyPage />} />
                    <Route path="/recuperar-password" element={<ForgotPasswordPage />} />
                    <Route path="/nueva-password" element={<NewPasswordPage />} />
                    
                    {/* Admin Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<DashboardPage />} />
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="studies" element={<StudiesAdminPage />} />
                            <Route path="posts" element={<PostsAdminPage />} />
                            <Route path="testimonials" element={<TestimonialsAdminPage />} />
                            <Route path="appointments" element={<AppointmentsAdminPage />} />
                            <Route path="patients" element={<PatientsAdminPage />} />
                        <Route path="patients/:id" element={<PatientDetailPage />} />
                        <Route path="statistics" element={<StatisticsPage />} />
                        <Route path="gestion_usuarios" element={<UsersManagementPage />} />
                        <Route path="config" element={<SiteConfigPage />} />
                        <Route path="inventory" element={<InventoryPage />} />
                        <Route path="results" element={<ResultsPage />} />
                    </Route>
                </Route>

                    {/* Not Found */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </MainLayout>
        </BrowserRouter>
  );
};

export default App;
