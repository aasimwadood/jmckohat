import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import DownloadPage from './pages/DownloadPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DepartmentsPage from './pages/DepartmentsPage';
import ProgramsPage from './pages/ProgramsPage';
import FacultyPage from './pages/FacultyPage';
import HowToApplyPage from './pages/HowToApplyPage';
import RequirementsPage from './pages/RequirementsPage';
import FeeStructurePage from './pages/FeeStructurePage';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import FacultyDashboard from './pages/dashboards/FacultyDashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import DepartmentDashboard from './pages/dashboards/DepartmentDashboard';
import ControllerDashboard from './pages/dashboards/ControllerDashboard';
import CoordinatorDashboard from './pages/dashboards/CoordinatorDashboard';
import PrincipalDashboard from './pages/dashboards/PrincipalDashboard';
import AdministrationDashboard from './pages/dashboards/AdministrationDashboard';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'faculty' | 'student' | 'department' | 'controller' | 'coordinator' | 'principal' | 'administration';
  department?: string;
  currentSemester?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  };

  const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage user={user} onLogout={handleLogout} />} />
        <Route path="/about" element={<AboutPage user={user} onLogout={handleLogout} />} />
        <Route path="/contact" element={<ContactPage user={user} onLogout={handleLogout} />} />
        <Route path="/downloads" element={<DownloadPage user={user} onLogout={handleLogout} />} />
        <Route path="/departments" element={<DepartmentsPage user={user} onLogout={handleLogout} />} />
        <Route path="/programs" element={<ProgramsPage user={user} onLogout={handleLogout} />} />
        <Route path="/faculty" element={<FacultyPage user={user} onLogout={handleLogout} />} />
        <Route path="/how-to-apply" element={<HowToApplyPage user={user} onLogout={handleLogout} />} />
        <Route path="/requirements" element={<RequirementsPage user={user} onLogout={handleLogout} />} />
        <Route path="/fee-structure" element={<FeeStructurePage user={user} onLogout={handleLogout} />} />
        <Route path="/login" element={user ? <Navigate to={`/dashboard/${user.role}`} replace /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={user ? <Navigate to={`/dashboard/${user.role}`} replace /> : <RegisterPage />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard user={user!} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/faculty"
          element={
            <ProtectedRoute allowedRoles={['faculty']}>
              <FacultyDashboard user={user!} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard user={user!} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/department"
          element={
            <ProtectedRoute allowedRoles={['department']}>
              <DepartmentDashboard user={user!} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/controller"
          element={
            <ProtectedRoute allowedRoles={['controller']}>
              <ControllerDashboard user={user!} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/coordinator"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <CoordinatorDashboard user={user!} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/principal"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalDashboard user={user!} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/administration"
          element={
            <ProtectedRoute allowedRoles={['administration']}>
              <AdministrationDashboard user={user!} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
