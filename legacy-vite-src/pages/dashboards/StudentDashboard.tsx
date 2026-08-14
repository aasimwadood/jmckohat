import { useState, useEffect } from 'react';
import TimetableManagement from '../../components/TimetableManagement';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import FYPManagement from '../../components/FYPManagement';
import { fetchWithAuth } from '../../utils/api';
import {
  LayoutDashboard, Calendar, BookOpen, FileText, DollarSign,
  Bell, User as UserIcon, CheckCircle, Clock, AlertCircle, TrendingUp, Download, Eye, Upload, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../../App';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function StudentDashboard({ user, onLogout }: StudentDashboardProps) {
  const [activeView, setActiveView] = useState('overview');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'attendance' | 'assignment' | 'payment' | 'material' | 'fyp-submit' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Add this new state for detailed attendance
  const [detailedAttendance, setDetailedAttendance] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Dynamic States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [courseMaterials, setCourseMaterials] = useState<any[]>([]);
  const [feesData, setFeesData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);

  useEffect(() => {
    fetchAllDashboardData();
  }, [user.id]);

  async function fetchAllDashboardData() {
    setLoading(true);
    try {
      // Parallel fetching for better performance
      const [
        notifRes,
        attendanceRes,
        assignmentsRes,
        resultsRes,
        materialsRes,
        feesRes,
        profileRes,
        timetableRes
      ] = await Promise.all([
        fetchWithAuth(`/api/StudentDashboard/notifications/${user.id}`),
        fetchWithAuth(`/api/StudentDashboard/attendance/${user.id}`),
        fetchWithAuth(`/api/StudentDashboard/assignments/${user.id}`),
        fetchWithAuth(`/api/StudentDashboard/results/${user.id}`),
        fetchWithAuth(`/api/Materials/student/${user.id}`),
        fetchWithAuth(`/api/StudentDashboard/fees/${user.id}`),
        fetchWithAuth(`/api/StudentDashboard/profile/${user.id}`),
        fetchWithAuth(`/api/StudentDashboard/timetable/${user.id}`)
      ]);

      if (notifRes.ok) setNotifications(await notifRes.json());
      if (attendanceRes.ok) setAttendanceData(await attendanceRes.json());
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
      if (resultsRes.ok) setResults(await resultsRes.json());
      if (materialsRes.ok) setCourseMaterials(await materialsRes.json());
      if (feesRes.ok) {
        const fees = await feesRes.json();
        console.log('Fees Data received:', fees);
        setFeesData(fees);
      }
      if (profileRes.ok) setProfileData(await profileRes.json());
      if (timetableRes.ok) setTimetable(await timetableRes.json());

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  }

  // Helper function to generate mock attendance details (remove once backend is ready)
  const generateMockAttendanceDetails = (course: any) => {
    const details = [];
    const currentDate = new Date();
    
    // Generate last 30 days of attendance records
    for (let i = 0; i < 30; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() - i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Random attendance status based on the course percentage
      const randomValue = Math.random() * 100;
      const status = randomValue < (course.percentage || 75) ? 'Present' : 'Absent';
      
      details.push({
        date: date.toISOString().split('T')[0],
        status: status
      });
    }
    
    return details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Helper function to convert attendance to CSV
  const convertAttendanceToCSV = (details: any[]) => {
    if (!details || details.length === 0) return '';
    
    const headers = ['Date', 'Status'];
    const rows = details.map(detail => [detail.date, detail.status]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  };

  // Replace the existing openDialog function with this:
  const openDialog = async (type: 'attendance' | 'assignment' | 'payment' | 'material' | 'fyp-submit', data?: any) => {
    setDialogType(type);
    setSelectedItem(data);
    
    // If it's attendance dialog, fetch detailed records
    if (type === 'attendance' && data) {
      setLoadingDetails(true);
      try {
        // Assuming your API endpoint for detailed attendance
        // You might need to adjust this endpoint based on your actual API
        const response = await fetchWithAuth(
          `/api/StudentDashboard/attendance/${user.id}/details?courseId=${data.courseId || data.courseCode}`
        );
        
        if (response.ok) {
          const details = await response.json();
          setDetailedAttendance(details);
          // Update selectedItem to include details
          setSelectedItem({
            ...data,
            details: details
          });
        } else {
          // If no dedicated endpoint, use mock data for demonstration
          // Remove this mock data once your backend is ready
          const mockDetails = generateMockAttendanceDetails(data);
          setSelectedItem({
            ...data,
            details: mockDetails
          });
        }
      } catch (error) {
        console.error('Error fetching attendance details:', error);
        toast.error('Failed to load attendance details');
        // Fallback to mock data
        const mockDetails = generateMockAttendanceDetails(data);
        setSelectedItem({
          ...data,
          details: mockDetails
        });
      } finally {
        setLoadingDetails(false);
      }
    }
    
    setIsDialogOpen(true);
  };

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, onClick: () => setActiveView('overview') },
    { name: 'My Timetable', icon: Calendar, onClick: () => setActiveView('timetable') },
    { name: 'Attendance', icon: CheckCircle, onClick: () => setActiveView('attendance') },
    { name: 'Assignments', icon: FileText, onClick: () => setActiveView('assignments') },
    { name: 'Results & Grades', icon: TrendingUp, onClick: () => setActiveView('results') },
    { name: 'Fee Payment', icon: DollarSign, onClick: () => setActiveView('fees') },
    { name: 'Course Materials', icon: BookOpen, onClick: () => setActiveView('materials') },
    { name: 'Final Year Project', icon: FileText, onClick: () => setActiveView('fyp') },
    { name: 'Profile', icon: UserIcon, onClick: () => setActiveView('profile') },
  ];

  const handlePayment = () => {
    toast.success('Redirecting to payment gateway...');
    setTimeout(() => {
      toast.success('Payment completed successfully!');
      setIsDialogOpen(false);
    }, 1500);
  };

  const handleDownloadReceipt = async (paymentId: number) => {
    try {
      const response = await fetchWithAuth(`api/fees/receipt/${paymentId}`);
      if (!response.ok) throw new Error('Failed to fetch receipt');
      
      const data = await response.json();
      
      // Create a simple text or HTML content for the receipt
      const receiptContent = `
        FEE PAYMENT RECEIPT
        -------------------
        Student: ${data.studentName}
        Amount: ${data.amount}
        Date: ${new Date(data.date).toLocaleDateString()}
        Method: ${data.method}
        Transaction ID: ${data.transactionId}
        Fee Type: ${data.feeType}
      `;
      
      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${paymentId}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download receipt');
      console.error(error);
    }
  };

  const handleSubmitAssignment = () => {
    toast.success('Assignment submitted successfully!');
    setIsDialogOpen(false);
  };

  const handleDownloadMaterial = (material: any) => {
    toast.success(`Downloading ${material.title}...`);
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = material.filePath;
    link.download = material.title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}!</p>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Recent Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div key={notif.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                          notif.type === 'urgent' ? 'text-red-500' :
                          notif.type === 'warning' ? 'text-orange-500' : 'text-blue-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-gray-900">{notif.message}</p>
                          <p className="text-sm text-gray-500">{notif.time}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent notifications</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Overall Attendance</p>
                      <p className="text-2xl font-bold text-gray-900">{profileData?.overallAttendance || '0'}%</p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <Progress value={profileData?.overallAttendance || 0} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Current CGPA</p>
                      <p className="text-2xl font-bold text-gray-900">{profileData?.cgpa || '0.00'}</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-blue-500" />
                  </div>
                  <p className="text-sm text-gray-500">Semester GPA: {profileData?.semesterGpa || '0.00'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Pending Assignments</p>
                      <p className="text-2xl font-bold text-gray-900">{assignments.filter(a => a.status === 'pending').length}</p>
                    </div>
                    <FileText className="w-10 h-10 text-orange-500" />
                  </div>
                  <p className="text-sm text-gray-500">Due this week</p>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendanceData.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-900">{item.course}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            item.percentage >= 75 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.present}/{item.total} ({item.percentage}%)
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog('attendance', item)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                      <Progress
                        value={item.percentage}
                        className={`h-2 ${item.percentage < 75 ? '[&>div]:bg-red-500' : ''}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'timetable' && (
          <TimetableManagement 
            studentId={user.id} 
            semester={profileData?.currentSemester}
            isEditable={false}
          />
        )}

        {activeView === 'attendance' && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.course}</TableCell>
                      <TableCell>{item.present}</TableCell>
                      <TableCell>{item.total}</TableCell>
                      <TableCell>
                        <Badge variant={item.percentage >= 75 ? 'default' : 'destructive'}>
                          {item.percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog('attendance', item)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === 'assignments' && (
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.course}</TableCell>
                      <TableCell>{assignment.title}</TableCell>
                      <TableCell>{assignment.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={assignment.status === 'submitted' ? 'default' : 'secondary'}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog('assignment', assignment)}
                        >
                          {assignment.status === 'submitted' ? (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-1" />
                              Submit
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === 'results' && (
  <Card>
    <CardHeader>
      <CardTitle>Results & Grades</CardTitle>
    </CardHeader>
    <CardContent>
      {results.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No results available yet. Results will appear here once they are finalized.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Quiz 1</TableHead>
              <TableHead>Quiz 2</TableHead>
              <TableHead>Midterm</TableHead>
              <TableHead>Assignments</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => {
              // Safe calculation with null checking
              const quiz1 = result.quiz1 || 0;
              const quiz2 = result.quiz2 || 0;
              const midterm = result.midterm || 0;
              const assignment = result.assignment || 0;
              const total = Math.round((quiz1 + quiz2 + midterm + assignment) / 4);
              
              return (
                <TableRow key={index}>
                  <TableCell className="font-medium">{result.course}</TableCell>
                  <TableCell>{quiz1}/100</TableCell>
                  <TableCell>{quiz2}/100</TableCell>
                  <TableCell>{midterm}/100</TableCell>
                  <TableCell>{assignment}/100</TableCell>
                  <TableCell>
                    <Badge variant={total >= 50 ? "default" : "destructive"}>
                      {total}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      result.grade === 'A' ? 'default' :
                      result.grade === 'B' ? 'secondary' :
                      result.grade === 'C' ? 'outline' :
                      'destructive'
                    }>
                      {result.grade || 'N/A'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
)}

        {activeView === 'fees' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fee Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feesData?.pendingFees?.map((fee: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">{fee.semester} Semester Fee</p>
                        <p className="text-sm text-gray-600">Due: {fee.dueDate}</p>
                        <p className="text-gray-900 mt-1">Amount: PKR {fee.amount?.toLocaleString()}</p>
                      </div>
                      <Button onClick={() => openDialog('payment', fee)}>
                        Pay Now
                      </Button>
                    </div>
                  ))}
                  {(!feesData?.pendingFees || feesData.pendingFees.length === 0) && (
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-green-800">All fees are currently up to date.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semester</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date Paid</TableHead>
                      <TableHead>Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feesData?.paymentHistory?.map((payment: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{payment.semester}</TableCell>
                        <TableCell>PKR {payment.amount?.toLocaleString()}</TableCell>
                        <TableCell>{payment.datePaid}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReceipt(payment.id)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'materials' && (
          <Card>
            <CardHeader>
              <CardTitle>Course Materials</CardTitle>
            </CardHeader>
            <CardContent>
              {courseMaterials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No materials available for your courses.
                </div>
              ) : (
                <Tabs defaultValue={courseMaterials[0]?.course?.toLowerCase().replace(/ /g, '-') || 'course-0'}>
                  <TabsList className="flex flex-wrap h-auto">
                    {courseMaterials.map((courseData, idx) => (
                      <TabsTrigger 
                        key={idx} 
                        value={courseData.course?.toLowerCase().replace(/ /g, '-') || `course-${idx}`}
                      >
                        {courseData.course}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {courseMaterials.map((courseData, idx) => (
                    <TabsContent
                      key={idx}
                      value={courseData.course?.toLowerCase().replace(/ /g, '-') || `course-${idx}`}
                      className="space-y-3 mt-4"
                    >
                      {courseData.materials && courseData.materials.length > 0 ? (
                        courseData.materials.map((material: any) => (
                          <div
                            key={material.id}
                            className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-blue-500" />
                                <div>
                                  <p className="font-semibold text-gray-900">{material.title}</p>
                                  <p className="text-sm text-gray-500">
                                    {material.type} • {material.size} • Uploaded: {material.uploadDate}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDialog('material', material)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadMaterial(material)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-gray-500 border rounded-lg bg-gray-50">
                          No materials uploaded for this course yet.
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}

        {activeView === 'fyp' && (
          <Card>
            <CardHeader>
              <CardTitle>Final Year Project</CardTitle>
            </CardHeader>
            <CardContent>
              <FYPManagement role="student" />
            </CardContent>
          </Card>
        )}

        {activeView === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Student Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Student ID</p>
                    <p className="font-semibold text-gray-900">{profileData?.studentId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{profileData?.fullName || user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{profileData?.email || user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-semibold text-gray-900">{profileData?.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Program</p>
                    <p className="font-semibold text-gray-900">{profileData?.program || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Semester</p>
                    <p className="font-semibold text-gray-900">{profileData?.currentSemester || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">CGPA</p>
                    <p className="font-semibold text-gray-900">{profileData?.cgpa || '0.00'}/4.00</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Enrollment Year</p>
                    <p className="font-semibold text-gray-900">{profileData?.enrollmentYear || 'N/A'}</p>
                  </div>
                </div>
                <div className="pt-4">
                  <Button>Edit Profile</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {dialogType === 'attendance' && selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle>Attendance Details - {selectedItem.course}</DialogTitle>
                  <DialogDescription>
                    Total: {selectedItem.present}/{selectedItem.total} ({selectedItem.percentage}%)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  ) : selectedItem.details && selectedItem.details.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItem.details.map((detail: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{detail.date}</TableCell>
                              <TableCell>
                                <Badge variant={detail.status === 'Present' ? 'default' : 'destructive'}>
                                  {detail.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No detailed attendance records found
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Close
                  </Button>
                  {selectedItem.details && selectedItem.details.length > 0 && (
                    <Button 
                      onClick={() => {
                        const csv = convertAttendanceToCSV(selectedItem.details);
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${selectedItem.course}_attendance.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Attendance report downloaded');
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}

            {dialogType === 'assignment' && selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedItem.title}</DialogTitle>
                  <DialogDescription>
                    {selectedItem.course} • Due: {selectedItem.dueDate}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Description</Label>
                    <p className="text-gray-700 mt-1">{selectedItem.description}</p>
                  </div>
                  <div>
                    <Label>Total Marks</Label>
                    <p className="text-gray-700 mt-1">{selectedItem.totalMarks}</p>
                  </div>

                  {selectedItem.status === 'submitted' ? (
                    <>
                      <div>
                        <Label>Submitted Date</Label>
                        <p className="text-gray-700 mt-1">{selectedItem.submittedDate}</p>
                      </div>
                      <div>
                        <Label>Grade</Label>
                        <p className="text-gray-700 mt-1">{selectedItem.grade}/{selectedItem.totalMarks}</p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label>Upload Assignment</Label>
                      <Input type="file" className="mt-2" />
                      <p className="text-xs text-gray-500 mt-1">Accepted formats: PDF, DOCX, ZIP (Max 10MB)</p>
                    </div>
                  )}
                </div>
                {selectedItem.status === 'pending' && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmitAssignment}>Submit Assignment</Button>
                  </DialogFooter>
                )}
              </>
            )}

            {dialogType === 'payment' && selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle>Fee Payment</DialogTitle>
                  <DialogDescription>
                    {selectedItem.semester} Semester Fee
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Amount to Pay</p>
                    <p className="text-2xl font-bold text-gray-900">PKR {selectedItem.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <select className="w-full p-2 border rounded-md mt-2">
                      <option>Credit/Debit Card</option>
                      <option>Bank Transfer</option>
                      <option>EasyPaisa</option>
                      <option>JazzCash</option>
                    </select>
                  </div>
                  <div>
                    <Label>Card Number</Label>
                    <Input type="text" placeholder="1234 5678 9012 3456" className="mt-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Expiry Date</Label>
                      <Input type="text" placeholder="MM/YY" className="mt-2" />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      <Input type="text" placeholder="123" className="mt-2" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handlePayment}>Pay Now</Button>
                </DialogFooter>
              </>
            )}

            {dialogType === 'material' && selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle>Material Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <p className="text-gray-700 mt-1">{selectedItem.title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <p className="text-gray-700 mt-1">{selectedItem.type}</p>
                    </div>
                    <div>
                      <Label>Size</Label>
                      <p className="text-gray-700 mt-1">{selectedItem.size}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Upload Date</Label>
                    <p className="text-gray-700 mt-1">{selectedItem.uploadDate}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed">
                    <p className="text-center text-gray-500">Preview not available</p>
                    <p className="text-center text-sm text-gray-400 mt-2">Download to view the document</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                  <Button onClick={() => handleDownloadMaterial(selectedItem)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </DialogFooter>
              </>
            )}

            {dialogType === 'fyp-submit' && (
              <>
                <DialogHeader>
                  <DialogTitle>Submit Final Year Project</DialogTitle>
                  <DialogDescription>
                    Upload your final year project report and any additional files.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Project Title</Label>
                    <p className="text-gray-700 mt-1">AI-Based Chatbot for Customer Support</p>
                  </div>
                  <div>
                    <Label>Upload Report</Label>
                    <Input type="file" className="mt-2" />
                    <p className="text-xs text-gray-500 mt-1">Accepted formats: PDF, DOCX (Max 10MB)</p>
                  </div>
                  <div>
                    <Label>Upload Additional Files</Label>
                    <Input type="file" className="mt-2" multiple />
                    <p className="text-xs text-gray-500 mt-1">Accepted formats: PDF, DOCX, ZIP (Max 10MB)</p>
                  </div>
                  <div>
                    <Label>Project Description</Label>
                    <Textarea className="mt-2" placeholder="Enter a brief description of your project." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmitAssignment}>Submit Project</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}