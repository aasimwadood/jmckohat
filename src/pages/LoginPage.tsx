import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { GraduationCap, AlertCircle, Loader2 } from 'lucide-react';
import type { User } from '../App';


interface LoginPageProps {
  onLogin: (user: User, token: string) => void;
}

// Expected response from the backend login endpoint
interface LoginResponse {
  userId: string;
  token: string;
  refreshToken?: string;
  expiration: string;
  roles: string[];
  redirectUrl?: string;
  department?: string;
  currentSemester?: string;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Demo accounts for quick filling (optional)
  const demoAccounts = {
    admin: { email: 'admin@college.edu.pk', password: 'admin123' },
    faculty: { email: 'faculty@college.edu.pk', password: 'faculty123' },
    student: { email: 'student@college.edu.pk', password: 'student123' },
    department: { email: 'dept@college.edu.pk', password: 'dept123' },
    controller: { email: 'controller@college.edu.pk', password: 'controller123' },
    coordinator: { email: 'coordinator@college.edu.pk', password: 'coordinator123' },
    principal: { email: 'principal@college.edu.pk', password: 'principal123' },
    administration: { email: 'admin-staff@college.edu.pk', password: 'admin123' },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      // data is of type LoginResponse
      const loginData = data as LoginResponse;

      // Store token (e.g., in localStorage)
      localStorage.setItem('token', loginData.token);

      // Map backend role (e.g. "Controller of Examination") to frontend role (e.g. "controller")
      const mapRole = (backendRole: string): User['role'] => {
        const role = backendRole.toLowerCase();
        if (role === 'administration staff') return 'administration';
        if (role === 'controller of examination') return 'controller';
        if (role === 'hods') return 'department';
        return role as User['role'];
      };

      const user: User = {
        id: loginData.userId,
        name: email.split('@')[0], 
        email: email,
        role: mapRole(loginData.roles[0]),
        department: loginData.department,
        currentSemester: loginData.currentSemester
      };

      // Call the parent's onLogin (to update auth state)
      onLogin(user, loginData.token);

      // Redirect based on the backend's suggestion, or fallback to role-based route
      const redirectUrl = loginData.redirectUrl || `/dashboard/${user.role}`;
      navigate(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fill demo credentials without logging in
  const fillDemo = (role: keyof typeof demoAccounts) => {
    setEmail(demoAccounts[role].email);
    setPassword(demoAccounts[role].password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GraduationCap className="w-12 h-12 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">College Portal</h1>
          </div>
          <p className="text-gray-600">Sign in to access your dashboard</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Demo quick-fill buttons (optional) */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600 mb-3">Quick fill (demo):</p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('student')}>
                  Student
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('faculty')}>
                  Faculty
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('admin')}>
                  Admin
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('principal')}>
                  Principal
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('controller')}>
                  Controller
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('coordinator')}>
                  Coordinator
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('department')}>
                  HoD
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => fillDemo('administration')}>
                  Admin Staff
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 mb-2">
            Don't have an account?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/register')}>
              Register here
            </Button>
          </p>
          <Button variant="link" onClick={() => navigate('/')}>
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
