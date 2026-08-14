import { useState, useEffect } from 'react';
import TimetableManagement from '../../components/TimetableManagement';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import {
  LayoutDashboard, Users, Settings, FileText, Calendar,
  TrendingUp, Activity, Shield, Database, Plus, Edit, Trash2, Eye, Download, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../../utils/api';
import type { User } from '../../App';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeView, setActiveView] = useState('overview');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'user' | 'schedule' | 'report' | 'edit' | 'delete' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [targetAudience, setTargetAudience] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', role: 'student', department: '' });

  // Dynamic Data
  const [systemStats, setSystemStats] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [reportDefinitions, setReportDefinitions] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [allRolePermissions, setAllRolePermissions] = useState<any[]>([
    { roleName: 'student', permissions: [] },
    { roleName: 'faculty', permissions: [] },
    { roleName: 'admin', permissions: [] },
    { roleName: 'principal', permissions: [] },
    { roleName: 'controller', permissions: [] },
    { roleName: 'coordinator', permissions: [] },
    { roleName: 'hod', permissions: [] },
    { roleName: 'accountant', permissions: [] }
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, activitiesRes, reportsRes, logsRes, permissionsRes, reportDefinitionsRes] = await Promise.all([
        fetchWithAuth('/api/AdminDashboard/stats'),
        fetchWithAuth('/api/AdminDashboard/users'),
        fetchWithAuth('/api/AdminDashboard/activities'),
        fetchWithAuth('/api/AdminDashboard/reports'),
        fetchWithAuth('/api/AdminDashboard/logs'),
        fetchWithAuth('/api/RolePermissions/all'),
        fetchWithAuth('/api/AdminDashboard/report-definitions')
      ]);

      if (statsRes.ok) setSystemStats(await statsRes.json());
      if (usersRes.ok) setUsersData(await usersRes.json());
      if (activitiesRes.ok) setRecentActivities(await activitiesRes.json());
      if (reportsRes.ok) setReportData(await reportsRes.json());
      if (logsRes.ok) setSystemLogs(await logsRes.json());
      if (reportDefinitionsRes.ok) setReportDefinitions(await reportDefinitionsRes.json());
      
      if (permissionsRes.ok) {
        const permissions = await permissionsRes.json();
        if (permissions && permissions.length > 0) {
          setAllRolePermissions(prev => {
            const newState = [...prev];
            permissions.forEach((p: any) => {
              const idx = newState.findIndex(rp => rp.roleName.toLowerCase() === p.roleName.toLowerCase());
              if (idx !== -1) newState[idx] = p;
              else newState.push(p);
            });
            return newState;
          });
        }
      }

    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (roleName: string, permission: string) => {
    setAllRolePermissions(prev => {
      const roleExists = prev.some(rp => rp.roleName.toLowerCase() === roleName.toLowerCase());
      if (!roleExists) {
        return [...prev, { roleName, permissions: [permission] }];
      }
      return prev.map(rp => {
        if (rp.roleName.toLowerCase() === roleName.toLowerCase()) {
          const hasPermission = rp.permissions.includes(permission);
          return {
            ...rp,
            permissions: hasPermission 
              ? rp.permissions.filter((p: string) => p !== permission)
              : [...rp.permissions, permission]
          };
        }
        return rp;
      });
    });
  };

  const handleUpdatePermissions = async (roleName: string) => {
    const roleData = allRolePermissions.find(rp => rp.roleName.toLowerCase() === roleName.toLowerCase());
    if (!roleData) return;

    try {
      const response = await fetchWithAuth(`/api/RolePermissions/${roleName}`, {
        method: 'POST',
        body: JSON.stringify(roleData.permissions)
      });

      if (response.ok) {
        toast.success(`Permissions updated for ${roleName}`);
      } else {
        toast.error('Failed to update permissions');
      }
    } catch (error) {
      toast.error('Error updating permissions');
    }
  };

  const isPermissionChecked = (roleName: string, permission: string) => {
    const roleData = allRolePermissions.find(rp => rp.roleName.toLowerCase() === roleName.toLowerCase());
    return roleData?.permissions.includes(permission) || false;
  };

  const [announcementFormData, setAnnouncementFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'all',
    department: '',
    priority: 'Medium'
  });

  const handlePublishAnnouncement = async () => {
    if (!announcementFormData.title || !announcementFormData.content) {
      toast.error('Please fill in both title and content');
      return;
    }

    try {
      const response = await fetchWithAuth('/api/AdminDashboard/announcements', {
        method: 'POST',
        body: JSON.stringify(announcementFormData)
      });

      if (response.ok) {
        toast.success('Announcement published successfully!');
        setAnnouncementFormData({
          title: '',
          content: '',
          targetAudience: 'all',
          department: '',
          priority: 'Medium'
        });
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to publish announcement');
      }
    } catch (error) {
      console.error('Error publishing announcement:', error);
      toast.error('An error occurred while publishing the announcement');
    }
  };

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, onClick: () => setActiveView('overview') },
    { name: 'User Management', icon: Users, onClick: () => setActiveView('users') },
    { name: 'Role Management', icon: Shield, onClick: () => setActiveView('roles') },
    { name: 'Timetable', icon: Calendar, onClick: () => setActiveView('timetable') },
    { name: 'Announcements', icon: FileText, onClick: () => setActiveView('announcements') },
    { name: 'Reports', icon: TrendingUp, onClick: () => setActiveView('reports') },
    { name: 'System Settings', icon: Settings, onClick: () => setActiveView('settings') },
    { name: 'System Logs', icon: Activity, onClick: () => setActiveView('logs') },
  ];

  const openDialog = (type: 'user' | 'schedule' | 'report' | 'edit' | 'delete', data?: any) => {
    setDialogType(type);
    setSelectedItem(data);
    if (type === 'edit' && data) {
      setUserFormData({
        name: data.name,
        email: data.email,
        role: data.role,
        department: data.department
      });
    }
    setIsDialogOpen(true);
  };

  const handleCreateUser = () => {
    if (!userFormData.name || !userFormData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('User created successfully!');
    setIsDialogOpen(false);
    setUserFormData({ name: '', email: '', role: 'student', department: '' });
  };

  const handleEditUser = () => {
    if (!selectedItem) return;
    toast.success('User updated successfully!');
    setIsDialogOpen(false);
  };

  const handleDeleteUser = () => {
    if (!selectedItem) return;
    toast.success('User deleted successfully!');
    setIsDialogOpen(false);
  };

  const handleGenerateReport = (reportType: string) => {
    toast.success(`Generating ${reportType} report...`);
    setTimeout(() => {
      openDialog('report', { type: reportType });
    }, 500);
  };

  const getStatIcon = (label: string) => {
    switch (label) {
      case 'Total Users': return Users;
      case 'Active Students': return Users;
      case 'Faculty Members': return Users;
      case 'System Uptime': return Activity;
      default: return Activity;
    }
  };

  const getReportIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return Users;
      case 'TrendingUp': return TrendingUp;
      case 'FileText': return FileText;
      case 'Database': return Database;
      case 'Activity': return Activity;
      default: return FileText;
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout} navigation={navigation}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} navigation={navigation}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Complete system overview and management</p>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* System Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {systemStats.map((stat, index) => {
                const Icon = getStatIcon(stat.label);
                return (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-gray-600">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                        <Icon className={`w-10 h-10 ${stat.color || 'text-blue-600'}`} />
                      </div>
                      <Badge variant="secondary" className="text-xs">{stat.change}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>


            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent System Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-600">By {activity.user} • {activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('users')}>
                <CardContent className="pt-6 text-center">
                  <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
                  <p className="text-sm text-gray-600">Create and manage user accounts</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('timetable')}>
                <CardContent className="pt-6 text-center">
                  <Calendar className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Timetable</h3>
                  <p className="text-sm text-gray-600">Schedule classes and events</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('reports')}>
                <CardContent className="pt-6 text-center">
                  <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">View Reports</h3>
                  <p className="text-sm text-gray-600">Generate system reports</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeView === 'users' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>User Management</CardTitle>
                <Button onClick={() => openDialog('user')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input placeholder="Search users..." className="max-w-md" />
              </div>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All Users</TabsTrigger>
                  <TabsTrigger value="student">Students</TabsTrigger>
                  <TabsTrigger value="faculty">Faculty</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                  <TabsTrigger value="other">Other Roles</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>
                            <Badge variant="default">{user.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openDialog('edit', user)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openDialog('delete', user)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="student" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData.filter(u => u.role === 'student').map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>
                            <Badge variant="default">{user.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openDialog('edit', user)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openDialog('delete', user)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="faculty" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData.filter(u => u.role === 'faculty').map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>
                            <Badge variant="default">{user.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openDialog('edit', user)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openDialog('delete', user)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="admin" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData.filter(u => u.role === 'admin').map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>
                            <Badge variant="default">{user.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openDialog('edit', user)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openDialog('delete', user)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="other" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData.filter(u => !['student', 'faculty', 'admin'].includes(u.role)).map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>
                            <Badge variant="default">{user.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openDialog('edit', user)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openDialog('delete', user)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {activeView === 'roles' && (
          <Card>
            <CardHeader>
              <CardTitle>Role-Based Access Control</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="student">
                <TabsList className="grid grid-cols-4 lg:grid-cols-8">
                  <TabsTrigger value="student">Student</TabsTrigger>
                  <TabsTrigger value="faculty">Faculty</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                  <TabsTrigger value="principal">Principal</TabsTrigger>
                  <TabsTrigger value="controller">Controller</TabsTrigger>
                  <TabsTrigger value="coordinator">Coordinator</TabsTrigger>
                  <TabsTrigger value="department">HoD</TabsTrigger>
                  <TabsTrigger value="administration">Accountant</TabsTrigger>
                </TabsList>
                <TabsContent value="student" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Student Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'View attendance',
                        'View grades',
                        'Submit assignments',
                        'View timetable',
                        'Pay fees online',
                        'Download course materials',
                        'View announcements',
                        'Update profile'
                      ].map((permission, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={isPermissionChecked('student', permission)}
                            onChange={() => handleTogglePermission('student', permission)}
                            className="w-4 h-4" 
                          />
                          <span className="text-gray-700">{permission}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => handleUpdatePermissions('student')}>Update Permissions</Button>
                  </div>
                </TabsContent>
                <TabsContent value="faculty" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Faculty Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Mark attendance',
                        'Upload grades',
                        'Create assignments',
                        'Upload course materials',
                        'View student records',
                        'Post announcements',
                        'Generate reports',
                        'Manage courses'
                      ].map((permission, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={isPermissionChecked('faculty', permission)}
                            onChange={() => handleTogglePermission('faculty', permission)}
                            className="w-4 h-4" 
                          />
                          <span className="text-gray-700">{permission}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => handleUpdatePermissions('faculty')}>Update Permissions</Button>
                  </div>
                </TabsContent>
                <TabsContent value="admin" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Admin Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Create users',
                        'Edit users',
                        'Delete users',
                        'Manage roles',
                        'System settings',
                        'View all reports',
                        'Manage timetables',
                        'Full system access'
                      ].map((permission, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={isPermissionChecked('admin', permission)}
                            onChange={() => handleTogglePermission('admin', permission)}
                            className="w-4 h-4" 
                          />
                          <span className="text-gray-700">{permission}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => handleUpdatePermissions('admin')}>Update Permissions</Button>
                  </div>
                </TabsContent>
                <TabsContent value="principal" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Principal Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'View all reports',
                        'Approve budgets',
                        'Manage departments',
                        'Strategic decisions',
                        'Faculty evaluation',
                        'Policy making',
                        'System oversight',
                        'Institutional planning'
                      ].map((permission, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={isPermissionChecked('principal', permission)}
                            onChange={() => handleTogglePermission('principal', permission)}
                            className="w-4 h-4" 
                          />
                          <span className="text-gray-700">{permission}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => handleUpdatePermissions('principal')}>Update Permissions</Button>
                  </div>
                </TabsContent>
                <TabsContent value="controller" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Controller Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Manage examinations',
                        'Schedule exams',
                        'Publish results',
                        'Generate transcripts',
                        'Grade verification',
                        'Exam committee access',
                        'Result compilation',
                        'Academic records'
                      ].map((permission, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={isPermissionChecked('controller', permission)}
                            onChange={() => handleTogglePermission('controller', permission)}
                            className="w-4 h-4" 
                          />
                          <span className="text-gray-700">{permission}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => handleUpdatePermissions('controller')}>Update Permissions</Button>
                  </div>
                </TabsContent>
                <TabsContent value="coordinator" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Coordinator Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Manage timetables',
                        'Course scheduling',
                        'Room allocation',
                        'Faculty coordination',
                        'Student registration',
                        'Academic planning',
                        'Semester planning',
                        'Event coordination'
                      ].map((permission, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={isPermissionChecked('coordinator', permission)}
                            onChange={() => handleTogglePermission('coordinator', permission)}
                            className="w-4 h-4" 
                          />
                          <span className="text-gray-700">{permission}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => handleUpdatePermissions('coordinator')}>Update Permissions</Button>
                  </div>
                </TabsContent>
                <TabsContent value="department" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Head of Department Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Department management',
                        'Faculty supervision',
                        'Course approval',
                        'Budget planning',
                        'Department reports',
                        'Curriculum development',
                        'Faculty hiring',
                        'Resource allocation'
                      ].map((permission, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={isPermissionChecked('hod', permission)}
                            onChange={() => handleTogglePermission('hod', permission)}
                            className="w-4 h-4" 
                          />
                          <span className="text-gray-700">{permission}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => handleUpdatePermissions('hod')}>Update Permissions</Button>
                  </div>
                </TabsContent>
                <TabsContent value="administration" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Accountant/Administration Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Fee management',
                        'Payment processing',
                        'Financial reports',
                        'Budget tracking',
                        'Invoice generation',
                        'Payment verification',
                        'Account reconciliation',
                        'Expense management'
                      ].map((permission, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <input 
                            type="checkbox" 
                            checked={isPermissionChecked('accountant', permission)}
                            onChange={() => handleTogglePermission('accountant', permission)}
                            className="w-4 h-4" 
                          />
                          <span className="text-gray-700">{permission}</span>
                        </div>
                      ))}
                    </div>
                    <Button onClick={() => handleUpdatePermissions('accountant')}>Update Permissions</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

      {activeView === 'timetable' && (
  <TimetableManagement isEditable={true} />
)}

        {activeView === 'announcements' && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input 
                    placeholder="Announcement title" 
                    value={announcementFormData.title}
                    onChange={(e) => setAnnouncementFormData({ ...announcementFormData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={announcementFormData.targetAudience}
                    onChange={(e) => setAnnouncementFormData({ ...announcementFormData, targetAudience: e.target.value })}
                  >
                    <option value="all">All Users</option>
                    <option value="students">Students Only</option>
                    <option value="faculty">Faculty Only</option>
                    <option value="department">Specific Department</option>
                  </select>
                </div>
                {announcementFormData.targetAudience === 'department' && (
                  <div>
                    <Label>Select Department</Label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={announcementFormData.department}
                      onChange={(e) => setAnnouncementFormData({ ...announcementFormData, department: e.target.value })}
                    >
                      <option value="">Select Department</option>
                      <option>Computer Science</option>
                      <option>Mathematics</option>
                      <option>Physics</option>
                      <option>Chemistry</option>
                      <option>English</option>
                      <option>Urdu</option>
                      <option>Economics</option>
                      <option>Commerce</option>
                    </select>
                  </div>
                )}
                <div>
                  <Label>Message</Label>
                  <textarea 
                    className="w-full p-2 border rounded-md" 
                    rows={6} 
                    placeholder="Enter announcement message..." 
                    value={announcementFormData.content}
                    onChange={(e) => setAnnouncementFormData({ ...announcementFormData, content: e.target.value })}
                  />
                </div>
                <div className="flex gap-4">
                  <Button onClick={handlePublishAnnouncement}>Publish Now</Button>
                  <Button variant="outline" onClick={() => toast.success('Saved as draft!')}>Save as Draft</Button>
                  <Button variant="outline" onClick={() => toast.success('Scheduled for later!')}>Schedule for Later</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === 'reports' && (
          <Card>
            <CardHeader>
              <CardTitle>Generate Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportDefinitions.map((report, i) => {
                  const Icon = getReportIcon(report.icon);
                  return (
                    <Card key={report.id || i} className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <Icon className="w-10 h-10 text-blue-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.description}</h3>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleGenerateReport(report.description)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Generate
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
                {reportDefinitions.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading report definitions...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Institution Name</Label>
                      <Input defaultValue="Government Postgraduate College Kohat" />
                    </div>
                    <div>
                      <Label>Academic Year</Label>
                      <Input defaultValue="2024-2025" />
                    </div>
                    <div>
                      <Label>Current Semester</Label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Fall 2024</option>
                        <option>Spring 2025</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
                  <div className="space-y-2">
                    {[
                      'Send attendance alerts',
                      'Send fee payment reminders',
                      'Send exam schedule notifications',
                      'Send grade upload notifications',
                    ].map((setting, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                        <span className="text-gray-700">{setting}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={() => toast.success('Settings saved successfully!')}>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === 'logs' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>System Activity Logs</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchDashboardData}>
                  <Activity className="w-4 h-4 mr-2" />
                  Refresh Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Reason / Details</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemLogs.length > 0 ? (
                    systemLogs.map((log, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap">{log.time}</TableCell>
                        <TableCell className="font-medium">{log.user}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell className="text-gray-600 italic">{log.reason || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'Error' ? 'destructive' : 'default'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p>Loading system logs...</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {dialogType === 'user' && (
              <>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={userFormData.name}
                      onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      placeholder="email@college.edu.pk"
                    />
                  </div>
                  <div>
                    <Label>Role *</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                      <option value="principal">Principal</option>
                      <option value="controller">Controller</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="department">Head of Department</option>
                      <option value="administration">Accountant/Administration</option>
                    </select>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={userFormData.department}
                      onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                      placeholder="Enter department"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateUser}>Create User</Button>
                </DialogFooter>
              </>
            )}
            {dialogType === 'edit' && selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle>Edit User - {selectedItem.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={userFormData.name}
                      onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Role *</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={userFormData.role}
                      onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                      <option value="principal">Principal</option>
                      <option value="controller">Controller</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="department">Head of Department</option>
                      <option value="administration">Accountant/Administration</option>
                    </select>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={userFormData.department}
                      onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleEditUser}>Update User</Button>
                </DialogFooter>
              </>
            )}
            {dialogType === 'delete' && selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle>Delete User</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this user? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="font-medium text-gray-900">User: {selectedItem.name}</p>
                    <p className="text-sm text-gray-600">Email: {selectedItem.email}</p>
                    <p className="text-sm text-gray-600">Role: {selectedItem.role}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDeleteUser}>Delete User</Button>
                </DialogFooter>
              </>
            )}
            {dialogType === 'report' && selectedItem && reportData && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedItem.type}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedItem.type === 'Attendance Report' && reportData.attendance && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Total Students</TableHead>
                          <TableHead>Avg Attendance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.attendance.map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{row.department}</TableCell>
                            <TableCell>{row.totalStudents}</TableCell>
                            <TableCell>{row.avgAttendance}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {selectedItem.type === 'Fee Collection Report' && reportData.fees && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Semester</TableHead>
                          <TableHead>Collected</TableHead>
                          <TableHead>Pending</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.fees.map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{row.semester}</TableCell>
                            <TableCell>PKR {(row.collected / 1000000).toFixed(1)}M</TableCell>
                            <TableCell>PKR {(row.pending / 1000000).toFixed(1)}M</TableCell>
                            <TableCell>PKR {(row.total / 1000000).toFixed(1)}M</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {selectedItem.type === 'Academic Performance' && reportData.performance && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Avg GPA</TableHead>
                          <TableHead>Pass Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.performance.map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{row.department}</TableCell>
                            <TableCell>{row.avgGPA}</TableCell>
                            <TableCell>{row.passRate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {selectedItem.type === 'Department Statistics' && reportData.departmentStats && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Programs</TableHead>
                          <TableHead>Faculty Members</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.departmentStats.map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.totalPrograms}</TableCell>
                            <TableCell>{row.totalFaculty}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {selectedItem.type === 'Exam Results Summary' && reportData.examSummary && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course</TableHead>
                          <TableHead>Total Exams</TableHead>
                          <TableHead>Upcoming</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.examSummary.map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{row.course}</TableCell>
                            <TableCell>{row.totalExams}</TableCell>
                            <TableCell>{row.upcoming}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {selectedItem.type === 'System Usage Report' && reportData.usage && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.usage.map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{row.category}</TableCell>
                            <TableCell>{row.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {!['Attendance Report', 'Fee Collection Report', 'Academic Performance', 'Department Statistics', 'Exam Results Summary', 'System Usage Report'].includes(selectedItem.type) && (
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-600">Report data will be displayed here</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                  <Button onClick={() => toast.success('Downloading report...')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </DialogFooter>
              </>
            )}
            {dialogType === 'report' && selectedItem && !reportData && (
                <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading report data...</p>
                </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 