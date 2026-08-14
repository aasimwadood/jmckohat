import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import FYPManagement from '../../components/FYPManagement';
import CourseFileReport from '../../components/CourseFileReport';
import { AdmissionManagement } from '../../components/AdmissionManagement';
import {
  LayoutDashboard, Users, CheckCircle, FileText, Upload,
  BookOpen, MessageSquare, Calendar, Eye, Edit, Trash2, Plus, Award, Download, UserPlus, Loader2,
  CheckSquare, Info
} from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../../App';
import { fetchWithAuth } from '../../utils/api';

interface FacultyDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function FacultyDashboard({ user, onLogout }: FacultyDashboardProps) {
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Dynamic States
  const [stats, setStats] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);

  useEffect(() => {
    fetchAllFacultyData();
  }, [user.id]);

  async function fetchAllFacultyData() {
    setLoading(true);
    try {
      const [statsRes, coursesRes, studentsRes, assignmentsRes, materialsRes, announcementsRes, scheduleRes] = await Promise.all([
        fetchWithAuth(`/api/FacultyDashboard/stats/${user.id}`),
        fetchWithAuth(`/api/FacultyDashboard/courses/${user.id}`),
        fetchWithAuth(`/api/FacultyDashboard/students/${user.id}`),
        fetchWithAuth(`/api/FacultyDashboard/assignments/${user.id}`),
        fetchWithAuth(`/api/FacultyDashboard/materials/${user.id}`),
        fetchWithAuth(`/api/FacultyDashboard/announcements/${user.id}`),
        fetchWithAuth(`/api/FacultyDashboard/schedule/${user.id}`)
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (coursesRes.ok) setCourses(await coursesRes.json());
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json());
      if (materialsRes.ok) setMaterials(await materialsRes.json());
      if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());
      if (scheduleRes.ok) setSchedule(await scheduleRes.json());

    } catch (error) {
      console.error('Error fetching faculty data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  type DialogType = 'course' | 'grade' | 'assignment' | 'material' | 'edit-material' | 'delete-material' | 'view-assignment' | null;
  const [dialogType, setDialogType] = useState<DialogType>(null);

  const [assignmentForm, setAssignmentForm] = useState({
    courseId: '',
    title: '',
    description: '',
    dueDate: '',
    totalMarks: '100'
  });
  const [materialForm, setMaterialForm] = useState({
    courseId: '',
    title: '',
    type: 'lecture',
    description: ''
  });
  const [gradeData, setGradeData] = useState<any>({});
  const [editMaterialData, setEditMaterialData] = useState<any>(null);

  const [selectedMarksCourse, setSelectedMarksCourse] = useState<string>('');
  const [marksForm, setMarksForm] = useState<any[]>([]);

  useEffect(() => {
    if (selectedMarksCourse) {
      const courseObj = courses.find(c => c.code === selectedMarksCourse);
      const courseStudents = students.filter(s => s.courseCode === selectedMarksCourse);
      setMarksForm(courseStudents.map(s => ({
        studentId: s.id,
        studentName: s.name,
        courseId: courseObj?.id,
        quiz1: 0,
        quiz2: 0,
        midterm: 0,
        assignments: 0,
        remarks: ''
      })));
    }
  }, [selectedMarksCourse, students, courses]);

  const handleMarkChange = (studentId: string, field: string, value: string) => {
    setMarksForm(prev => prev.map(m => {
      if (m.studentId === studentId) {
        return { ...m, [field]: field === 'remarks' ? value : (parseInt(value) || 0) };
      }
      return m;
    }));
  };

  const handleSubmitMarks = async (studentMarks: any) => {
    const total = studentMarks.quiz1 + studentMarks.quiz2 + studentMarks.midterm + studentMarks.assignments;
    try {
      const response = await fetchWithAuth(`/api/Results`, {
        method: 'POST',
        body: JSON.stringify({
          courseId: studentMarks.courseId,
          studentId: studentMarks.studentId,
          score: total,
          quiz1: studentMarks.quiz1,
          quiz2: studentMarks.quiz2,
          midterm: studentMarks.midterm,
          assignments: studentMarks.assignments,
          remarks: studentMarks.remarks
        })
      });
      if (response.ok) {
        toast.success(`Marks submitted for ${studentMarks.studentName}`);
        fetchAllFacultyData();
      } else {
        const err = await response.text();
        toast.error(err || 'Failed to submit marks');
      }
    } catch (error) {
      toast.error('Error submitting marks');
    }
  };

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, onClick: () => setActiveView('overview') },
    { name: 'My Courses', icon: BookOpen, onClick: () => setActiveView('courses') },
    { name: 'Attendance', icon: CheckCircle, onClick: () => setActiveView('attendance') },
    { name: 'Assignments', icon: FileText, onClick: () => setActiveView('assignments') },
    { name: 'Upload Marks', icon: Upload, onClick: () => setActiveView('marks') },
    { name: 'Admissions', icon: UserPlus, onClick: () => setActiveView('admissions') },
    { name: 'Course Materials', icon: Upload, onClick: () => setActiveView('materials') },
    { name: 'Announcements', icon: MessageSquare, onClick: () => setActiveView('announcements') },
    { name: 'Class Schedule', icon: Calendar, onClick: () => setActiveView('schedule') },
    { name: 'FYP Supervision', icon: Award, onClick: () => setActiveView('fyp') },
    { name: 'Course File Report', icon: FileText, onClick: () => setActiveView('course-file') },
  ];

  const openDialog = (type: DialogType, data?: any) => {
    setDialogType(type);
    if (data) {
      if (type === 'assignment') {
        setAssignmentForm({
          courseId: data.courseId || '',
          title: data.title || '',
          description: data.description || '',
          dueDate: data.dueDate || '',
          totalMarks: data.totalMarks || '100'
        });
      } else if (type === 'grade' || type === 'view-assignment') {
        setGradeData(data);
      } else if (type === 'material') {
        setMaterialForm({
          courseId: data.id || '',
          title: '',
          type: 'lecture',
          description: ''
        });
      } else if (type === 'edit-material') {
        setEditMaterialData(data);
        setMaterialForm({
          courseId: data.courseId || '',
          title: data.title || '',
          type: data.type || 'lecture',
          description: data.description || ''
        });
      }
    }
    setIsDialogOpen(true);
  };

  const handleCreateAssignment = async () => {
    if (!assignmentForm.courseId || !assignmentForm.title || !assignmentForm.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const response = await fetchWithAuth(`/api/Assignments`, {
        method: 'POST',
        body: JSON.stringify({
          ...assignmentForm,
          courseId: parseInt(assignmentForm.courseId),
          maxScore: parseInt(assignmentForm.totalMarks)
        })
      });
      if (response.ok) {
        toast.success('Assignment created successfully!');
        fetchAllFacultyData();
        setIsDialogOpen(false);
        setAssignmentForm({ courseId: '', title: '', description: '', dueDate: '', totalMarks: '100' });
      }
    } catch (error) {
      toast.error('Failed to create assignment');
    }
  };
    

  const handleUploadMaterial = async () => {
    if (!materialForm.courseId || !materialForm.title) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const response = await fetchWithAuth(`/api/FacultyDashboard/materials`, {
        method: 'POST',
        body: JSON.stringify({
          ...materialForm,
          courseId: parseInt(materialForm.courseId),
          facultyId: user.id
        })
      });
      if (response.ok) {
        toast.success('Material uploaded successfully!');
        fetchAllFacultyData();
        setIsDialogOpen(false);
        setMaterialForm({ courseId: '', title: '', type: 'lecture', description: '' });
      }
    } catch (error) {
      toast.error('Failed to upload material');
    }
  };

  const handleUpdateMaterial = async () => {
    if (!editMaterialData) return;
    try {
      const response = await fetchWithAuth(`/api/FacultyDashboard/materials/${editMaterialData.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...materialForm,
          courseId: parseInt(materialForm.courseId)
        })
      });
      if (response.ok) {
        toast.success('Material updated successfully!');
        fetchAllFacultyData();
        setIsDialogOpen(false);
      }
    } catch (error) {
      toast.error('Failed to update material');
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    try {
      const response = await fetchWithAuth(`/api/FacultyDashboard/materials/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('Material deleted successfully!');
        fetchAllFacultyData();
        setIsDialogOpen(false);
      }
    } catch (error) {
      toast.error('Failed to delete material');
    }
  };

  const handleGradeSubmission = () => {
    toast.success('Grades submitted successfully!');
    setIsDialogOpen(false);
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
          <h1 className="text-gray-900 mb-2">Faculty Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}! {stats?.departmentName ? `(${stats.departmentName} Department)` : ''}</p>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Courses</p>
                      <p className="text-gray-900">{stats?.totalCourses || '0'}</p>
                    </div>
                    <BookOpen className="w-10 h-10 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Students</p>
                      <p className="text-gray-900">{stats?.totalStudents || '0'}</p>
                    </div>
                    <Users className="w-10 h-10 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Assignments</p>
                      <p className="text-gray-900">{stats?.pendingAssignments || '0'}</p>
                    </div>
                    <FileText className="w-10 h-10 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Today's Classes</p>
                      <p className="text-gray-900">{stats?.todaysClasses || '0'}</p>
                    </div>
                    <Calendar className="w-10 h-10 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>My Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Code</TableHead>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course, index) => (
                      <TableRow key={index}>
                        <TableCell>{course.code}</TableCell>
                        <TableCell>{course.name}</TableCell>
                        <TableCell>{course.section}</TableCell>
                        <TableCell>{course.students}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCourse(course);
                              openDialog('course', course);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-gray-900">{assignment.title}</h4>
                        <p className="text-sm text-gray-600">
                          {assignment.course} • Due: {assignment.dueDate}
                        </p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-gray-900">{assignment.submissions}/{assignment.total}</p>
                        <p className="text-sm text-gray-600">Submissions</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog('grade', assignment)}
                      >
                        Grade
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'courses' && (
          <Card>
            <CardHeader>
              <CardTitle>My Courses - Detailed View</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={courses[0]?.code.toLowerCase()}>
                <TabsList className="mb-4">
                  {courses.map(course => (
                    <TabsTrigger key={course.code} value={course.code.toLowerCase()}>{course.code}</TabsTrigger>
                  ))}
                </TabsList>
                {courses.map(course => (
                  <TabsContent key={course.code} value={course.code.toLowerCase()}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Course Code</p>
                          <p className="text-gray-900">{course.code}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Total Students</p>
                          <p className="text-gray-900">{course.students}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Section</p>
                          <p className="text-gray-900">{course.section}</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="text-gray-900 mb-4">Course Description</h4>
                        <p className="text-gray-600">{course.description || 'No description available.'}</p>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="text-gray-900 mb-4">Student List</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Attendance</TableHead>
                              <TableHead>Marks</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.filter(s => s.courseCode === course.code).map((student) => (
                              <TableRow key={student.id}>
                                <TableCell>{student.id}</TableCell>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.attendance}%</TableCell>
                                <TableCell>{student.marks}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* ... (rest of the views updated to use the same logic) ... */}
        {activeView === 'attendance' && (
          <Card>
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={courses[0]?.code.toLowerCase()}>
                <TabsList>
                  {courses.map(course => (
                    <TabsTrigger key={course.code} value={course.code.toLowerCase()}>{course.code}</TabsTrigger>
                  ))}
                </TabsList>
                {courses.map(course => (
                  <TabsContent key={course.code} value={course.code.toLowerCase()} className="mt-4">
                    <div className="mb-4">
                      <Label>Date</Label>
                      <Input type="date" className="max-w-xs" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Present</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.filter(s => s.courseCode === course.code).map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.id}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>
                              <Checkbox defaultChecked />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4">
                      <Button onClick={() => toast.success('Attendance submitted successfully!')}>
                        Submit Attendance
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {activeView === 'assignments' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Manage Assignments</CardTitle>
                <Button onClick={() => openDialog('assignment')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Assignment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.course}</TableCell>
                      <TableCell>{assignment.title}</TableCell>
                      <TableCell>{assignment.dueDate}</TableCell>
                      <TableCell>{assignment.submissions}/{assignment.total}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog('view-assignment', assignment)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog('grade', assignment)}
                          >
                            <CheckSquare className="w-4 h-4 mr-1" />
                            Grade
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

        {activeView === 'marks' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Upload Student Marks</CardTitle>
                <div className="flex items-center gap-4">
                  <Label>Select Course:</Label>
                  <select 
                    className="p-2 border rounded-md"
                    value={selectedMarksCourse}
                    onChange={(e) => setSelectedMarksCourse(e.target.value)}
                  >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                      <option key={course.code} value={course.code}>{course.code} - {course.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedMarksCourse ? (
                <div className="space-y-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="w-24">Quiz 1</TableHead>
                        <TableHead className="w-24">Quiz 2</TableHead>
                        <TableHead className="w-24">Midterm</TableHead>
                        <TableHead className="w-24">Assignments</TableHead>
                        <TableHead className="w-24">Total</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marksForm.map((m) => (
                        <TableRow key={m.studentId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{m.studentName}</p>
                              <p className="text-xs text-gray-500">{m.studentId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={m.quiz1} 
                              onChange={(e) => handleMarkChange(m.studentId, 'quiz1', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={m.quiz2} 
                              onChange={(e) => handleMarkChange(m.studentId, 'quiz2', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={m.midterm} 
                              onChange={(e) => handleMarkChange(m.studentId, 'midterm', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={m.assignments} 
                              onChange={(e) => handleMarkChange(m.studentId, 'assignments', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="font-bold">
                            {m.quiz1 + m.quiz2 + m.midterm + m.assignments}
                          </TableCell>
                          <TableCell>
                            <Input 
                              value={m.remarks} 
                              onChange={(e) => handleMarkChange(m.studentId, 'remarks', e.target.value)}
                              placeholder="Optional remarks"
                            />
                          </TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => handleSubmitMarks(m)}>Submit</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Upload className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Please select a course to start uploading marks.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeView === 'announcements' && (
          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{announcement.title}</h4>
                      <Badge variant={announcement.isInstitutional ? "default" : "outline"}>
                        {announcement.isInstitutional ? "Institutional" : announcement.department}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-2">{announcement.content}</p>
                    <div className="flex items-center text-sm text-gray-400">
                      <Calendar className="w-4 h-4 mr-1" />
                      {announcement.date}
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No announcements found.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === 'schedule' && (
          <Card>
            <CardHeader>
              <CardTitle>Class Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Room</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.day}</TableCell>
                      <TableCell>{entry.time}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.courseCode}</p>
                          <p className="text-xs text-gray-500">{entry.courseName}</p>
                        </div>
                      </TableCell>
                      <TableCell>{entry.room}</TableCell>
                    </TableRow>
                  ))}
                  {schedule.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No classes scheduled for you.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === 'materials' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Course Materials</CardTitle>
                <Button onClick={() => openDialog('material')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Material
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>{material.course}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.title}</p>
                          <p className="text-xs text-gray-500">{material.size}</p>
                          {material.issuedById && (
                            <p className="text-xs text-gray-400">Issued By: {material.issuedById}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{material.type}</Badge>
                      </TableCell>
                      <TableCell>{material.date}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openDialog('edit-material', material)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDeleteMaterial(material.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {materials.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No materials uploaded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {activeView === 'fyp' && (
          <Card>
            <CardHeader>
              <CardTitle>FYP Supervision</CardTitle>
            </CardHeader>
            <CardContent>
              <FYPManagement role="faculty" />
            </CardContent>
          </Card>
        )}
        {activeView === 'course-file' && (
          <Card>
            <CardHeader>
              <CardTitle>Course File Report</CardTitle>
            </CardHeader>
            <CardContent>
              <CourseFileReport />
            </CardContent>
          </Card>
        )}
        {activeView === 'admissions' && (
          <Card>
            <CardHeader>
              <CardTitle>Admissions Management</CardTitle>
            </CardHeader>
            <CardContent>
              <AdmissionManagement 
                role="faculty" 
                userName={user.name} 
                userId={user.id}
                department={stats?.departmentName} 
              />
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {dialogType === 'course' && selectedCourse && (
              <>
                <DialogHeader>
                  <DialogTitle>Course Details - {selectedCourse.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Course Code</Label>
                      <p className="text-gray-900">{selectedCourse.code}</p>
                    </div>
                    <div>
                      <Label>Section</Label>
                      <p className="text-gray-900">{selectedCourse.section}</p>
                    </div>
                    <div>
                      <Label>Total Students</Label>
                      <p className="text-gray-900">{selectedCourse.students}</p>
                    </div>
                    <div>
                      <Label>Credits</Label>
                      <p className="text-gray-900">{selectedCourse.credits || '3'}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <p className="text-gray-600">{selectedCourse.description || 'No description available.'}</p>
                  </div>
                </div>
              </>
            )}

            {dialogType === 'assignment' && (
              <>
                <DialogHeader>
                  <DialogTitle>Create New Assignment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Course *</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={assignmentForm.courseId}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, courseId: e.target.value })}
                    >
                      <option value="">Select a course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.code}: {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Assignment Title *</Label>
                    <Input
                      value={assignmentForm.title}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                      placeholder="Enter assignment title"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={assignmentForm.description}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                      placeholder="Enter assignment description"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Due Date *</Label>
                      <Input
                        type="date"
                        value={assignmentForm.dueDate}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Total Marks</Label>
                      <Input
                        type="number"
                        value={assignmentForm.totalMarks}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, totalMarks: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateAssignment}>Create Assignment</Button>
                </DialogFooter>
              </>
            )}

            {(dialogType === 'material' || dialogType === 'edit-material') && (
              <>
                <DialogHeader>
                  <DialogTitle>{dialogType === 'material' ? 'Upload New Material' : 'Edit Material'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Course *</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={materialForm.courseId}
                      onChange={(e) => setMaterialForm({ ...materialForm, courseId: e.target.value })}
                    >
                      <option value="">Select a course</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.code}: {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Material Title *</Label>
                    <Input
                      value={materialForm.title}
                      onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                      placeholder="e.g. Lecture 01 - Introduction"
                    />
                  </div>
                  <div>
                    <Label>Material Type</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={materialForm.type}
                      onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value })}
                    >
                      <option value="lecture">Lecture Notes</option>
                      <option value="reading">Reading Material</option>
                      <option value="reference">Reference Book</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={materialForm.description}
                      onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                      placeholder="Brief description of the material"
                    />
                  </div>
                  {dialogType === 'material' && (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center border-gray-200">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, PPTX, DOCX up to 10MB</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={dialogType === 'material' ? handleUploadMaterial : handleUpdateMaterial}>
                    {dialogType === 'material' ? 'Upload Material' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </>
            )}

            {dialogType === 'view-assignment' && gradeData && (
              <>
                <DialogHeader>
                  <DialogTitle>Assignment Details: {gradeData.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Course</Label>
                      <p className="text-gray-900">{gradeData.course}</p>
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <p className="text-gray-900">{gradeData.dueDate}</p>
                    </div>
                    <div>
                      <Label>Submissions</Label>
                      <p className="text-gray-900">{gradeData.submissions} / {gradeData.total}</p>
                    </div>
                    <div>
                      <Label>Max Score</Label>
                      <p className="text-gray-900">{gradeData.maxScore || '100'}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <p className="text-gray-600 whitespace-pre-wrap">{gradeData.description || 'No description provided.'}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
                </DialogFooter>
              </>
            )}

            {dialogType === 'grade' && gradeData && (
              <>
                <DialogHeader>
                  <DialogTitle>Grade Assignment: {gradeData.title}</DialogTitle>
                  <DialogDescription>
                    Review and grade submissions for {gradeData.course}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-500" />
                      <span className="text-blue-700 font-medium">Submissions status</span>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {gradeData.submissions} received
                    </Badge>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* This would normally fetch submissions, showing a placeholder for now */}
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            Submissions list and individual grading will be implemented in the next update.
                            You can view the summary above.
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                  <Button onClick={handleGradeSubmission}>Bulk Release Grades</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
