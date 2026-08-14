import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { GraduationCap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';


// Map frontend role values to backend role names
const roleMapping: Record<string, string> = {
  student: 'Student',
  faculty: 'Faculty',
  admin: 'Admin', // assuming "Admin" is a role in your system
  department: 'HoDs', // as per your backend roles
  controller: 'Controller of Examination',
  coordinator: 'Coordinator',
  principal: 'Principal',
  administration: 'Administration Staff',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as keyof typeof roleMapping,
    phoneNumber: '',
    department: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if ((formData.role === 'student' || formData.role === 'faculty' || formData.role === 'department') && !formData.department) {
      errors.department = 'Department is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) return;

    setIsLoading(true);

    // Split full name into first and last (simple split on first space)
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || ''; // rest as last name

    // Prepare request body
    const requestBody = {
      email: formData.email,
      password: formData.password,
      firstName: firstName,
      lastName: lastName,
      role: roleMapping[formData.role],
      phoneNumber: formData.phoneNumber || null,
      department: formData.department || null,
    };

    try {
      const response = await fetch(`api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from server (if any)
        if (data.errors) {
          // Assuming server returns errors in a format like { "Email": ["..."] }
          const serverFieldErrors: Record<string, string> = {};
          Object.keys(data.errors).forEach(key => {
            serverFieldErrors[key.toLowerCase()] = data.errors[key][0];
          });
          setFieldErrors(serverFieldErrors);
        } else {
          setError(data.message || 'Registration failed. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // Success
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError('Network error. Please check your connection.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GraduationCap className="w-12 h-12 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">College Portal</h1>
          </div>
          <p className="text-gray-600">Create your account to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 text-green-900 border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Registration successful! Redirecting to login...
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    disabled={isLoading || success}
                    className={fieldErrors.name ? 'border-red-500' : ''}
                  />
                  {fieldErrors.name && (
                    <p className="text-sm text-red-500 mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your.email@college.edu.pk"
                    disabled={isLoading || success}
                    className={fieldErrors.email ? 'border-red-500' : ''}
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-red-500 mt-1">{fieldErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="At least 6 characters"
                    disabled={isLoading || success}
                    className={fieldErrors.password ? 'border-red-500' : ''}
                  />
                  {fieldErrors.password && (
                    <p className="text-sm text-red-500 mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    disabled={isLoading || success}
                    className={fieldErrors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Select Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: keyof typeof roleMapping) => setFormData({ ...formData, role: value })}
                    disabled={isLoading || success}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="department">Department Head (HoD)</SelectItem>
                      <SelectItem value="controller">Controller of Examination</SelectItem>
                      <SelectItem value="coordinator">Coordinator</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                      <SelectItem value="administration">Accountant/Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+92-XXX-XXXXXXX"
                    disabled={isLoading || success}
                  />
                </div>
              </div>

              {(formData.role === 'student' || formData.role === 'faculty'|| formData.role === 'department') && (
                <div>
                  <Label htmlFor="department">Department {formData.role === 'student' ? '*' : ''}</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                    disabled={isLoading || success}
                  >
                    <SelectTrigger id="department" className={fieldErrors.department ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="computer-science">Computer Science</SelectItem>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="urdu">Urdu</SelectItem>
                      <SelectItem value="economics">Economics</SelectItem>
                      <SelectItem value="commerce">Commerce</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.department && (
                    <p className="text-sm text-red-500 mt-1">{fieldErrors.department}</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || success}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : success ? (
                  'Redirecting...'
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/login')}>
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button variant="link" onClick={() => navigate('/')}>
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
