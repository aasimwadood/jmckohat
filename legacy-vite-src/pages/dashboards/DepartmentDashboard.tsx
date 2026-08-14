import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { LayoutDashboard, Calendar, FileCheck, BookOpen, TrendingUp, Bell, UserPlus, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../../App';
import { AdmissionManagement } from '../../components/AdmissionManagement';
import { PromotionManagement } from '../../components/PromotionManagement';
import { fetchWithAuth } from '../../utils/api';

interface DepartmentDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function DepartmentDashboard({ user, onLogout }: DepartmentDashboardProps) {
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Dynamic States
  const [stats, setStats] = useState<any>(null);
  const [pendingMarks, setPendingMarks] = useState<any[]>([]);
  const [examSchedules, setExamSchedules] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [deptStudents, setDeptStudents] = useState<any[]>([]);
  const [deptCourses, setDeptCourses] = useState<any[]>([]);

  useEffect(() => {
    fetchAllDeptData();
    fetchDeptContextData();
  }, []);

  async function fetchAllDeptData() {
    setLoading(true);
    try {
      const [statsRes, marksRes, examsRes, announcementsRes] = await Promise.all([
        fetchWithAuth(`/api/DepartmentDashboard/stats/${user.id}`),
        fetchWithAuth(`/api/DepartmentDashboard/pending-marks/${user.id}`),
        fetchWithAuth(`/api/DepartmentDashboard/exam-schedules/${user.id}`),
        fetchWithAuth(`/api/DepartmentDashboard/announcements/${user.id}`)
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (marksRes.ok) setPendingMarks(await marksRes.json());
      if (examsRes.ok) setExamSchedules(await examsRes.json());
      if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());

    } catch (error) {
      console.error('Error fetching department data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function fetchDeptContextData() {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        fetchWithAuth(`/api/DepartmentDashboard/students/${user.id}`),
        fetchWithAuth(`/api/DepartmentDashboard/courses/${user.id}`)
      ]);
      if (studentsRes.ok) setDeptStudents(await studentsRes.json());
      if (coursesRes.ok) setDeptCourses(await coursesRes.json());
    } catch (error) {
      console.error('Error fetching context data:', error);
    }
  }

  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [viewMarksDialog, setViewMarksDialog] = useState(false);
  const [approveMarksDialog, setApproveMarksDialog] = useState(false);
  const [viewCurriculumDialog, setViewCurriculumDialog] = useState(false);
  const [updateSyllabusDialog, setUpdateSyllabusDialog] = useState(false);
  const [announcementDialog, setAnnouncementDialog] = useState(false);
  const [editAnnouncementDialog, setEditAnnouncementDialog] = useState(false);
  const [deleteAnnouncementDialog, setDeleteAnnouncementDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);

  const [syllabusForm, setSyllabusForm] = useState({
    studentId: '',
    courseId: 0,
    courseName: '',
    objectives: '',
    courseContent: '',
    learningOutcomes: '',
    recommendedBooks: '',
    assignmentPercentage: 0,
    midtermPercentage: 0,
    finalPercentage: 0
  });

  async function handleSaveSyllabus() {
    if (!syllabusForm.courseId) {
      toast.error('Please select a course');
      return;
    }
    try {
      const res = await fetchWithAuth('/api/DepartmentDashboard/update-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syllabusForm)
      });

      if (res.ok) {
        toast.success('Syllabus updated successfully');
        setUpdateSyllabusDialog(false);
        setSyllabusForm({
          studentId: '',
          courseId: 0,
          courseName: '',
          objectives: '',
          courseContent: '',
          learningOutcomes: '',
          recommendedBooks: '',
          assignmentPercentage: 0,
          midtermPercentage: 0,
          finalPercentage: 0
        });
      } else {
        toast.error('Failed to update syllabus');
      }
    } catch (error) {
      console.error('Error saving syllabus:', error);
      toast.error('An error occurred');
    }
  }

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'Medium',
    targetAudience: 'All',
    validUntil: ''
  });

  async function handlePublishAnnouncement() {
    if (!announcementForm.title || !announcementForm.content) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      // Convert empty string to null for the date
      const validUntil = announcementForm.validUntil === '' ? null : announcementForm.validUntil;

      const payload = {
        title: announcementForm.title,
        content: announcementForm.content,
        priority: announcementForm.priority,
        targetAudience: announcementForm.targetAudience,
        validUntil: validUntil,
        department: stats?.departmentName || user.department,
        isInstitutional: false,
        createdById: user.id
      };

      if (!payload.createdById) {
        toast.error('User session error: CreatedById missing');
        return;
      }

      const res = await fetchWithAuth('/api/DepartmentDashboard/create-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Announcement published successfully');
        setAnnouncementDialog(false);
        setAnnouncementForm({
          title: '',
          content: '',
          priority: 'Medium',
          targetAudience: 'All',
          validUntil: ''
        });
        fetchAllDeptData(); // Refresh list
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.details || errorData.message || 'Unknown error';
        toast.error(`Failed: ${errorMessage}`, { duration: 5000 });
        console.error('Publish error:', errorData);
      }
    } catch (error) {
      console.error('Error publishing announcement:', error);
      toast.error('An error occurred');
    }
  }

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, onClick: () => setActiveView('overview') },
    { name: 'Admissions', icon: UserPlus, onClick: () => setActiveView('admissions') },
    { name: 'Promotions', icon: Users, onClick: () => setActiveView('promotions') },
    { name: 'Exam Scheduling', icon: Calendar, onClick: () => setActiveView('exams') },
    { name: 'Marks Approval', icon: FileCheck, onClick: () => setActiveView('marks') },
    { name: 'Curriculum Management', icon: BookOpen, onClick: () => setActiveView('curriculum') },
    { name: 'Reports', icon: TrendingUp, onClick: () => setActiveView('reports') },
    { name: 'Announcements', icon: Bell, onClick: () => setActiveView('announcements') },
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

  return (
    <DashboardLayout user={user} onLogout={onLogout} navigation={navigation}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Department Academic Dashboard</h1>
          <p className="text-gray-600">{stats?.departmentName || 'Department'}</p>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-gray-900">{stats?.totalStudents || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">Active Courses</p>
                  <p className="text-gray-900">{stats?.activeCourses || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">Faculty Members</p>
                  <p className="text-gray-900">{stats?.facultyMembers || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">Avg GPA</p>
                  <p className="text-gray-900">{stats?.avgGpa || '0.00'}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pending Marks Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Exam Type</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMarks.length > 0 ? (
                      pendingMarks.map((marks, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{marks.course}</TableCell>
                          <TableCell>{marks.examType}</TableCell>
                          <TableCell>{marks.submittedBy}</TableCell>
                          <TableCell>{marks.date}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => {
                              setSelectedCourse(marks);
                              setViewMarksDialog(true);
                            }}>Review</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                          No pending marks for approval
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'admissions' && (
          <Card>
            <CardHeader>
              <CardTitle>Admissions Management</CardTitle>
            </CardHeader>
            <CardContent>
              <AdmissionManagement 
                role="hod" 
                userId={user.id} 
                userName={user.name} 
                department={stats?.departmentName} 
              />
            </CardContent>
          </Card>
        )}
        {activeView === 'promotions' && (
          <PromotionManagement 
            role="hod" 
            userId={user.id} 
            userName={user.name} 
            department={stats?.departmentName} 
          />
        )}
        {activeView === 'exams' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Exam Schedule Management</CardTitle>
                <Button onClick={() => setScheduleDialog(true)}>Create New Schedule</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Exam Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examSchedules.length > 0 ? (
                    examSchedules.map((exam, idx) => (
                      <TableRow key={exam.id || idx}>
                        <TableCell className="font-medium">{exam.courseCode || 'N/A'}</TableCell>
                        <TableCell>{exam.title}</TableCell>
                        <TableCell>{new Date(exam.startTime).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell>{exam.location}</TableCell>
                        <TableCell>
                          <Badge variant={exam.isScheduled ? "default" : "secondary"}>
                            {exam.isScheduled ? "Scheduled" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        No exam schedules found for your department.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === 'marks' && (
          <Card>
            <CardHeader>
              <CardTitle>Approve Examination Marks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Exam Type</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMarks.length > 0 ? (
                    pendingMarks.map((marks, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{marks.course}</TableCell>
                        <TableCell>{marks.submittedBy}</TableCell>
                        <TableCell>{marks.examType}</TableCell>
                        <TableCell>{marks.students || 'N/A'}</TableCell>
                        <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedCourse(marks);
                              setViewMarksDialog(true);
                            }}>View</Button>
                            <Button size="sm" onClick={() => {
                              setSelectedCourse(marks);
                              setApproveMarksDialog(true);
                            }}>Approve</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        No pending marks for approval.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === 'curriculum' && (
          <Card>
            <CardHeader>
              <CardTitle>Curriculum & Syllabus Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['BS Computer Science', 'BS Software Engineering', 'BS AI'].map((program, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <h3 className="text-gray-900 mb-2">{program}</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProgram(program);
                          setViewCurriculumDialog(true);
                        }}
                      >
                        View Curriculum
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProgram(program);
                          setUpdateSyllabusDialog(true);
                        }}
                      >
                        Update Syllabus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {activeView === 'reports' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Student Performance Report', description: 'Semester-wise academic performance analysis' },
                    { title: 'Faculty Teaching Load', description: 'Credit hours and course allocation report' },
                    { title: 'Course Completion Report', description: 'Course completion rates and outcomes' },
                    { title: 'Attendance Summary', description: 'Department-wide attendance statistics' },
                    { title: 'Examination Analysis', description: 'Pass rates and grade distribution' },
                    { title: 'Resource Utilization', description: 'Lab and classroom usage report' },
                  ].map((report, i) => (
                    <div key={i} className="p-4 border rounded-lg hover:border-blue-500 transition-colors">
                      <h3 className="text-gray-900 mb-1">{report.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">View Report</Button>
                        <Button size="sm" variant="outline">Download PDF</Button>
                      </div>
                    </div>
                  ))}
                  </div>
              </CardContent>
            </Card>
          </div>
        )}
        {activeView === 'announcements' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Department Announcements</CardTitle>
                  <Button onClick={() => setAnnouncementDialog(true)}>Create Announcement</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {announcements.length > 0 ? (
                    announcements.map((announcement, i) => (
                      <div key={announcement.id || i} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-gray-900">{announcement.title}</h3>
                          <Badge variant={
                            announcement.priority === 'High' ? 'destructive' :
                            announcement.priority === 'Medium' ? 'default' : 'secondary'
                          }>
                            {announcement.priority || 'Medium'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                        <p className="text-xs text-gray-500">
                          {announcement.date || (announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString() : 'No date')}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedAnnouncement(announcement);
                            setEditAnnouncementDialog(true);
                          }}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedAnnouncement(announcement);
                            setDeleteAnnouncementDialog(true);
                          }}>Delete</Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No department announcements found.
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
      {/* Create Schedule Dialog */}
      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Exam Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cs201">CS-201 Data Structures</SelectItem>
                    <SelectItem value="cs301">CS-301 Database Systems</SelectItem>
                    <SelectItem value="cs401">CS-401 Software Engineering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midterm">Midterm</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room</Label>
                <Input placeholder="e.g., Room 301" />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" placeholder="e.g., 120" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Invigilators</Label>
              <Input placeholder="Enter faculty names" />
            </div>
            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea placeholder="Any special instructions..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success('Exam schedule created successfully');
              setScheduleDialog(false);
            }}>Create Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View Marks Dialog */}
      <Dialog open={viewMarksDialog} onOpenChange={setViewMarksDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>View Examination Marks - {selectedCourse?.course}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Faculty</p>
                <p className="text-gray-900">{selectedCourse?.faculty}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Exam Type</p>
                <p className="text-gray-900">{selectedCourse?.examType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-gray-900">{selectedCourse?.students}</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Marks Obtained</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>CS-2023-{String(i + 1).padStart(3, '0')}</TableCell>
                    <TableCell>Student {i + 1}</TableCell>
                    <TableCell>{75 + i * 5}</TableCell>
                    <TableCell>100</TableCell>
                    <TableCell>{75 + i * 5}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMarksDialog(false)}>Close</Button>
            <Button onClick={() => {
              setViewMarksDialog(false);
              setApproveMarksDialog(true);
            }}>Approve These Marks</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Approve Marks Confirmation Dialog */}
      <Dialog open={approveMarksDialog} onOpenChange={setApproveMarksDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Marks Approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to approve the marks for <strong>{selectedCourse?.course}</strong>?
              This action will make the marks visible to students and cannot be undone.
            </p>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Please verify all marks are correctly entered before approval.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveMarksDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success('Marks approved successfully');
              setApproveMarksDialog(false);
            }}>Confirm Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View Curriculum Dialog */}
      <Dialog open={viewCurriculumDialog} onOpenChange={setViewCurriculumDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProgram} - Curriculum</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="semester1">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="semester1">Semester 1</TabsTrigger>
              <TabsTrigger value="semester2">Semester 2</TabsTrigger>
              <TabsTrigger value="semester3">Semester 3</TabsTrigger>
              <TabsTrigger value="semester4">Semester 4</TabsTrigger>
            </TabsList>
            <TabsContent value="semester1" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Code</TableHead>
                    <TableHead>Course Title</TableHead>
                    <TableHead>Credit Hours</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { code: 'CS-101', title: 'Introduction to Programming', credit: 3, type: 'Core' },
                    { code: 'CS-102', title: 'Discrete Mathematics', credit: 3, type: 'Core' },
                    { code: 'ENG-101', title: 'English Composition', credit: 3, type: 'General' },
                    { code: 'MATH-101', title: 'Calculus I', credit: 3, type: 'Core' },
                  ].map((course, i) => (
                    <TableRow key={i}>
                      <TableCell>{course.code}</TableCell>
                      <TableCell>{course.title}</TableCell>
                      <TableCell>{course.credit}</TableCell>
                      <TableCell><Badge variant="secondary">{course.type}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="semester2">
              <p className="text-gray-600">Semester 2 curriculum details...</p>
            </TabsContent>
            <TabsContent value="semester3">
              <p className="text-gray-600">Semester 3 curriculum details...</p>
            </TabsContent>
            <TabsContent value="semester4">
              <p className="text-gray-600">Semester 4 curriculum details...</p>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewCurriculumDialog(false)}>Close</Button>
            <Button variant="outline">Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Update Syllabus Dialog */}
      <Dialog open={updateSyllabusDialog} onOpenChange={setUpdateSyllabusDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Syllabus - {selectedProgram}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Course</Label>
                <Select onValueChange={(val) => {
                  const course = deptCourses.find(c => c.id.toString() === val);
                  setSyllabusForm(prev => ({ 
                    ...prev, 
                    courseId: parseInt(val), 
                    courseName: course ? `${course.code} - ${course.title}` : '' 
                  }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {deptCourses.map(course => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.code} - {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Apply to Student (Optional)</Label>
                <Select onValueChange={(val) => setSyllabusForm(prev => ({ ...prev, studentId: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {deptStudents.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.firstName} {student.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Course Objectives</Label>
              <Textarea 
                placeholder="Enter course objectives..." 
                rows={3} 
                value={syllabusForm.objectives}
                onChange={(e) => setSyllabusForm(prev => ({ ...prev, objectives: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Course Content/Topics</Label>
              <Textarea 
                placeholder="Enter course topics and content..." 
                rows={5} 
                value={syllabusForm.courseContent}
                onChange={(e) => setSyllabusForm(prev => ({ ...prev, courseContent: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Learning Outcomes</Label>
              <Textarea 
                placeholder="Enter expected learning outcomes..." 
                rows={3} 
                value={syllabusForm.learningOutcomes}
                onChange={(e) => setSyllabusForm(prev => ({ ...prev, learningOutcomes: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Recommended Books</Label>
              <Textarea 
                placeholder="Enter recommended textbooks and references..." 
                rows={3} 
                value={syllabusForm.recommendedBooks}
                onChange={(e) => setSyllabusForm(prev => ({ ...prev, recommendedBooks: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Assessment Scheme</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Assignments %</Label>
                  <Input 
                    type="number" 
                    placeholder="Assignments %" 
                    value={syllabusForm.assignmentPercentage}
                    onChange={(e) => setSyllabusForm(prev => ({ ...prev, assignmentPercentage: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Midterm %</Label>
                  <Input 
                    type="number" 
                    placeholder="Midterm %" 
                    value={syllabusForm.midtermPercentage}
                    onChange={(e) => setSyllabusForm(prev => ({ ...prev, midtermPercentage: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Final %</Label>
                  <Input 
                    type="number" 
                    placeholder="Final %" 
                    value={syllabusForm.finalPercentage}
                    onChange={(e) => setSyllabusForm(prev => ({ ...prev, finalPercentage: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateSyllabusDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSyllabus}>Update Syllabus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Create Announcement Dialog */}
      <Dialog open={announcementDialog} onOpenChange={setAnnouncementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Department Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Announcement Title</Label>
              <Input 
                placeholder="Enter announcement title" 
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select onValueChange={(val) => setAnnouncementForm(prev => ({ ...prev, priority: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select onValueChange={(val) => setAnnouncementForm(prev => ({ ...prev, targetAudience: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Department</SelectItem>
                  <SelectItem value="Faculty">Faculty Only</SelectItem>
                  <SelectItem value="Student">Students Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Announcement Content</Label>
              <Textarea 
                placeholder="Enter announcement details..." 
                rows={6} 
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input 
                type="date" 
                value={announcementForm.validUntil}
                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, validUntil: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementDialog(false)}>Cancel</Button>
            <Button onClick={handlePublishAnnouncement}>Publish Announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Announcement Dialog */}
      <Dialog open={editAnnouncementDialog} onOpenChange={setEditAnnouncementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Department Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Announcement Title</Label>
              <Input placeholder="Enter announcement title" defaultValue={selectedAnnouncement?.title} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Department</SelectItem>
                  <SelectItem value="faculty">Faculty Only</SelectItem>
                  <SelectItem value="students">Students Only</SelectItem>
                  <SelectItem value="specific">Specific Program</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Announcement Content</Label>
              <Textarea placeholder="Enter announcement details..." rows={6} defaultValue={selectedAnnouncement?.content} />
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input type="date" defaultValue={selectedAnnouncement?.date} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAnnouncementDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success('Announcement updated successfully');
              setEditAnnouncementDialog(false);
            }}>Update Announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Announcement Confirmation Dialog */}
      <Dialog open={deleteAnnouncementDialog} onOpenChange={setDeleteAnnouncementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Announcement Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete the announcement titled <strong>{selectedAnnouncement?.title}</strong>?
              This action will permanently remove the announcement.
            </p>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAnnouncementDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success('Announcement deleted successfully');
              setDeleteAnnouncementDialog(false);
            }}>Confirm Deletion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
