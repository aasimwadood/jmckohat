import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  LayoutDashboard, TrendingUp, Users, DollarSign, Award,
  FileText, Bell, Activity, Download, Eye, AlertCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../../App';
import { fetchWithAuth } from '../../utils/api';

interface PrincipalDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function PrincipalDashboard({ user, onLogout }: PrincipalDashboardProps) {
  const [activeView, setActiveView] = useState('overview');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic States
  const [kpis, setKpis] = useState<any[]>([]);
  const [departmentPerformance, setDepartmentPerformance] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'Medium',
    department: '',
    isInstitutional: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAllPrincipalData();
  }, []);

  async function fetchAllPrincipalData() {
    setLoading(true);
    try {
      const [kpisRes, deptRes, examRes, healthRes, metricsRes, statsRes] = await Promise.all([
        fetchWithAuth(`/api/PrincipalDashboard/kpis?t=${Date.now()}`),
        fetchWithAuth(`/api/PrincipalDashboard/departments?t=${Date.now()}`),
        fetchWithAuth(`/api/PrincipalDashboard/exams?t=${Date.now()}`),
        fetchWithAuth(`/api/PrincipalDashboard/health?t=${Date.now()}`),
        fetchWithAuth(`/api/PrincipalDashboard/metrics?t=${Date.now()}`),
        fetchWithAuth(`/api/PrincipalDashboard/stats?t=${Date.now()}`)
      ]);

      if (kpisRes.ok) setKpis(await kpisRes.json());
      if (deptRes.ok) setDepartmentPerformance(await deptRes.json());
      if (examRes.ok) setExamResults(await examRes.json());
      if (healthRes.ok) setSystemHealth(await healthRes.json());
      if (metricsRes.ok) setSystemMetrics(await metricsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());

    } catch (error) {
      console.error('Error fetching principal data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const handlePublishAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.content) {
      toast.error('Title and Content are required');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetchWithAuth('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementForm)
      });
      if (response.ok) {
        toast.success('Announcement published successfully!');
        setAnnouncementForm({ title: '', content: '', priority: 'Medium', department: '', isInstitutional: true });
      } else {
        const err = await response.json();
        toast.error(err.message || 'Failed to publish announcement');
      }
    } catch (error) {
      toast.error('An error occurred while publishing');
    } finally {
      setSubmitting(false);
    }
  };

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, onClick: () => setActiveView('overview') },
    { name: 'Academic Performance', icon: TrendingUp, onClick: () => setActiveView('academic') },
    { name: 'Financial Reports', icon: DollarSign, onClick: () => setActiveView('financial') },
    { name: 'Departmental Reports', icon: FileText, onClick: () => setActiveView('departments') },
    { name: 'Exam Results', icon: Award, onClick: () => setActiveView('results') },
    { name: 'Announcements', icon: Bell, onClick: () => setActiveView('announcements') },
    { name: 'System Monitoring', icon: Activity, onClick: () => setActiveView('monitoring') },
  ];

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout} navigation={navigation}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const viewDepartmentReport = (dept: any) => {
    setSelectedReport(dept);
    setIsDialogOpen(true);
  };

  const getKPIIcon = (label: string) => {
    if (label.includes('Pass') || label.includes('Satisfaction')) return Award;
    if (label.includes('Attendance') || label.includes('Faculty')) return Users;
    if (label.includes('Fee') || label.includes('Financial')) return DollarSign;
    return Activity;
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} navigation={navigation}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Principal Dashboard</h1>
          <p className="text-gray-600">Institutional Performance Overview</p>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpis.map((kpi, index) => {
                const IconComponent = getKPIIcon(kpi.label);
                return (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-gray-600">{kpi.label}</p>
                          <p className="text-gray-900">{kpi.value}</p>
                          <p className="text-xs text-gray-500">Target: {kpi.target}</p>
                        </div>
                        <IconComponent className={`w-10 h-10 ${kpi.color || 'text-blue-600'}`} />
                      </div>
                      <Progress value={kpi.progress} className="h-2" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Department Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Pass Rate</TableHead>
                      <TableHead>Avg GPA</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentPerformance.map((dept, index) => (
                      <TableRow key={index}>
                        <TableCell>{dept.department}</TableCell>
                        <TableCell>{dept.students}</TableCell>
                        <TableCell className="text-green-600">{dept.passRate}%</TableCell>
                        <TableCell>{dept.avgGPA}</TableCell>
                        <TableCell>{dept.facultyCount}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewDepartmentReport(dept)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <Users className="w-10 h-10 text-blue-600 mb-4" />
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-gray-900 mb-2">{stats?.totalStudents || '0'}</p>
                  <p className="text-xs text-green-600">{stats?.studentsGrowth || ''}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <Users className="w-10 h-10 text-purple-600 mb-4" />
                  <p className="text-sm text-gray-600">Faculty Members</p>
                  <p className="text-gray-900 mb-2">{stats?.facultyMembers || '0'}</p>
                  <p className="text-xs text-green-600">{stats?.facultyGrowth || ''}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <Award className="w-10 h-10 text-orange-600 mb-4" />
                  <p className="text-sm text-gray-600">Programs Offered</p>
                  <p className="text-gray-900 mb-2">{stats?.programsOffered || '0'}</p>
                  <p className="text-xs text-gray-500">Across all departments</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeView === 'academic' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Academic Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentPerformance.slice(0, 3).map((dept, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-900">{dept.department} Pass Rate</span>
                        <span className="text-green-600">{dept.passRate}%</span>
                      </div>
                      <Progress value={dept.passRate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Semester-wise Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semester</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead>Pass Rate</TableHead>
                      <TableHead>Avg GPA</TableHead>
                      <TableHead>Distinction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examResults.map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{result.semester}</TableCell>
                        <TableCell>{result.totalStudents}</TableCell>
                        <TableCell>{result.passPercentage}%</TableCell>
                        <TableCell>{result.avgGPA}</TableCell>
                        <TableCell>{result.distinctionRate || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'financial' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <DollarSign className="w-10 h-10 text-green-600 mb-4" />
                  <p className="text-sm text-gray-600">Total Fee Collection</p>
                  <p className="text-gray-900">PKR {stats?.totalFeeCollection || '0'}M</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <DollarSign className="w-10 h-10 text-blue-600 mb-4" />
                  <p className="text-sm text-gray-600">Outstanding Fees</p>
                  <p className="text-gray-900">PKR {stats?.outstandingFees || '0'}M</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <DollarSign className="w-10 h-10 text-purple-600 mb-4" />
                  <p className="text-sm text-gray-600">Scholarship Distributed</p>
                  <p className="text-gray-900">PKR {stats?.scholarshipsDistributed || '0'}M</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Department-wise Fee Collection</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Downloading report...')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Collection %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentPerformance.map((dept, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{dept.department}</TableCell>
                        <TableCell>PKR {dept.expectedFees || '0'}M</TableCell>
                        <TableCell>PKR {dept.collectedFees || '0'}M</TableCell>
                        <TableCell>PKR {dept.outstandingFees || '0'}M</TableCell>
                        <TableCell className="text-green-600">{dept.collectionRate || '0'}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'departments' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Departmental Reports</CardTitle>
                <Button size="sm" variant="outline" onClick={() => toast.success('Downloading all departmental reports...')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Total Students</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Pass Rate</TableHead>
                    <TableHead>Avg GPA</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentPerformance.map((dept, index) => (
                    <TableRow key={index}>
                      <TableCell>{dept.department}</TableCell>
                      <TableCell>{dept.students}</TableCell>
                      <TableCell>{dept.facultyCount}</TableCell>
                      <TableCell>{dept.attendance}%</TableCell>
                      <TableCell>
                        <Badge variant={dept.passRate >= 90 ? 'default' : 'secondary'}>
                          {dept.passRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>{dept.avgGPA}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewDepartmentReport(dept)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toast.success(`Downloading ${dept.department} report...`)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === 'results' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Exam Results Summary</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Downloading consolidated results...')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {examResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-gray-900 mb-1">{result.department}</h3>
                          <p className="text-sm text-gray-600">{result.semester}</p>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          Pass Rate: {result.passPercentage}%
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="p-3 bg-blue-50 rounded">
                          <p className="text-xs text-gray-600">Total Students</p>
                          <p className="text-gray-900">{result.totalStudents}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <p className="text-xs text-gray-600">Appeared</p>
                          <p className="text-gray-900">{result.appeared}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <p className="text-xs text-gray-600">Passed</p>
                          <p className="text-green-600">{result.passed}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded">
                          <p className="text-xs text-gray-600">Failed</p>
                          <p className="text-red-600">{result.failed}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Average GPA</span>
                          <span className="text-gray-900">{result.avgGPA}</span>
                        </div>
                        <Progress value={(result.avgGPA / 4) * 100} className="h-2" />
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-2">Top Performers:</p>
                        <div className="flex flex-wrap gap-2">
                          {result.toppers?.map((topper: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="bg-yellow-50">
                              🏆 {topper}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'monitoring' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uptime</TableHead>
                      <TableHead>Response Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemHealth.map((service, index) => (
                      <TableRow key={index}>
                        <TableCell>{service.service}</TableCell>
                        <TableCell>
                          <Badge
                            variant={service.status === 'Healthy' ? 'default' : 'secondary'}
                            className={service.status === 'Healthy' ? 'bg-green-600' : 'bg-orange-500'}
                          >
                            {service.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{service.uptime}</TableCell>
                        <TableCell>{service.responseTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Metrics (Last 24 Hours)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemMetrics.map((metric, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <p className="text-sm text-gray-600">{metric.metric}</p>
                      <div className="flex items-baseline justify-between mt-2">
                        <p className="text-gray-900">{metric.value}</p>
                        <span className={`text-xs ${
                          metric.change?.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metric.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'announcements' && (
          <Card>
            <CardHeader>
              <CardTitle>Create Institution-wide Announcement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Announcement Title</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-md" 
                    placeholder="Enter title..."
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Message</label>
                  <textarea 
                    className="w-full p-2 border rounded-md" 
                    rows={6} 
                    placeholder="Enter message..."
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Priority</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={announcementForm.priority}
                    onChange={(e) => setAnnouncementForm({...announcementForm, priority: e.target.value})}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <Button onClick={handlePublishAnnouncement} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Publish Announcement
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Department Report Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedReport && (
              <>
                <DialogHeader>
                  <DialogTitle>Detailed Report - {selectedReport.department}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-xs text-gray-600">Total Students</p>
                      <p className="text-gray-900">{selectedReport.students}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded">
                      <p className="text-xs text-gray-600">Faculty Count</p>
                      <p className="text-gray-900">{selectedReport.facultyCount}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <p className="text-xs text-gray-600">Pass Rate</p>
                      <p className="text-green-600">{selectedReport.passRate}%</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded">
                      <p className="text-xs text-gray-600">Avg GPA</p>
                      <p className="text-gray-900">{selectedReport.avgGPA}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-gray-900 mb-3">Performance Metrics</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Attendance Rate</span>
                          <span className="text-gray-900">{selectedReport.attendance}%</span>
                        </div>
                        <Progress value={selectedReport.attendance} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Pass Rate</span>
                          <span className="text-gray-900">{selectedReport.passRate}%</span>
                        </div>
                        <Progress value={selectedReport.passRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">GPA Performance</span>
                          <span className="text-gray-900">{selectedReport.avgGPA}/4.0</span>
                        </div>
                        <Progress value={(selectedReport.avgGPA / 4) * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                  <Button onClick={() => toast.success(`Downloading ${selectedReport.department} report...`)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
