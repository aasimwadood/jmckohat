// components/TimetableManagement.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { toast } from 'sonner';

// Types
interface TimetableEntry {
  id: number;
  courseId: number;
  courseName: string;
  courseCode: string;
  facultyName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  group: string;
  semester: string;
  departmentName: string;
  studentId?: string;
}

interface Course {
  id: number;
  code: string;
  title: string;
  department: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
}

// IMPORTANT: This is the props interface for the main component
interface TimetableManagementProps {
  studentId?: string;
  semester?: string;
  isEditable?: boolean;
}

// Constants
const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '12:00 - 13:00',
  '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'
];

// Main TimetableManagement Component
export default function TimetableManagement({ studentId, semester: propSemester, isEditable = true }: TimetableManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(''); // ADDED: Missing state
  const [currentSemester, setCurrentSemester] = useState(propSemester || ''); // ADDED: Missing state
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    courseId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    room: '',
    group: '',
    semester: '',
    department: '',
    studentId: ''
  });

  // Update currentSemester if propSemester changes
  useEffect(() => {
    if (propSemester) {
      setCurrentSemester(propSemester);
    }
  }, [propSemester]);

  // Fetch timetable data
  useEffect(() => {
    fetchTimetable();
  }, [studentId, selectedDepartment, currentSemester, selectedCourse]);

  useEffect(() => {
    fetchCourses();
    fetchDepartments();
    fetchStudents();
  }, []);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      let url = '/api/TimetableEntries';
      const params = new URLSearchParams();
      
      if (currentSemester) params.append('semester', currentSemester);
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedCourse) params.append('courseId', selectedCourse);
      
      if (studentId) {
        url = '/api/TimetableEntries/student';
        // params.append('studentId', studentId); // Backend uses current user
      }
      
      const queryString = params.toString();
      const finalUrl = queryString ? `${url}?${queryString}` : url;

      const response = await fetchWithAuth(finalUrl);
      if (response.ok) {
        const data = await response.json();
        setTimetableData(data);
        
        // Extract unique semesters from current data to show in filter
        if (data.length > 0) {
          const semesters = Array.from(new Set(
            (data as TimetableEntry[])
              .map((item: TimetableEntry) => item.semester)
              .filter((sem): sem is string => Boolean(sem))
          ));
          if (semesters.length > 0) {
            setAvailableSemesters(semesters);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetchWithAuth('/api/Courses');
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      } else {
        toast.error('Failed to load courses from database');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetchWithAuth('/api/AdminDashboard/users?role=student');
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetchWithAuth('/api/DepartmentsRegister/getall');
      if (response.ok) {
        const data = await response.json();
        // Handle both camelCase and PascalCase just in case
        const deptNames = data.map((d: any) => d.departmentName || d.DepartmentName);
        setDepartments(deptNames);
      } else {
        toast.error('Failed to load departments from database');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const getEntryForTimeSlot = (day: string, timeSlot: string): TimetableEntry | undefined => {
    const [slotStartStr, slotEndStr] = timeSlot.split(' - ');
    const [slotStartHour, slotStartMinute] = slotStartStr.split(':').map(Number);
    const slotStart = slotStartHour * 60 + slotStartMinute;
    
    const [slotEndHour, slotEndMinute] = slotEndStr.split(':').map(Number);
    const slotEnd = slotEndHour * 60 + slotEndMinute;
    
    return timetableData.find(entry => {
      if (entry.dayOfWeek !== day) return false;
      const [entryStartHour, entryStartMinute] = entry.startTime.split(':').map(Number);
      const entryStart = entryStartHour * 60 + entryStartMinute;
      
      // Match if entry starts within this slot's time range
      return entryStart >= slotStart && entryStart < slotEnd;
    });
  };

  const handleSubmit = async () => {
    // Updated validation to include department and semester
    if (!formData.courseId || !formData.dayOfWeek || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.department) {
      toast.error('Please select a department');
      return;
    }

    if (!formData.semester) {
      toast.error('Please enter a semester');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      toast.error('Start time must be before end time');
      return;
    }

    const formatTimeForApi = (timeStr: string) => {
      if (!timeStr) return '';
      return timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr;
    };

    try {
      // Use AdminDashboard/timetable for POST, TimetableEntries for PUT
      const url = editingEntry 
        ? `/api/TimetableEntries/${editingEntry.id}`
        : '/api/AdminDashboard/timetable';
      
      const method = editingEntry ? 'PUT' : 'POST';
      
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          courseId: parseInt(formData.courseId),
          dayOfWeek: formData.dayOfWeek,
          startTime: formatTimeForApi(formData.startTime),
          endTime: formatTimeForApi(formData.endTime),
          room: formData.room,
          group: formData.group,
          semester: formData.semester,
          department: formData.department,
          studentId: formData.studentId || null
        })
      });

      if (response.ok) {
        toast.success(editingEntry ? 'Timetable updated successfully' : 'Timetable created successfully');
        setIsDialogOpen(false);
        resetForm();
        fetchTimetable(); // Refresh the timetable
      } else {
        const error = await response.json();
        toast.error(error.error || error.message || error.title || 'Failed to save timetable entry');
      }
    } catch (error) {
      console.error('Error saving timetable:', error);
      toast.error('Failed to save timetable entry');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      const response = await fetchWithAuth(`/api/TimetableEntries/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Timetable entry deleted successfully');
        fetchTimetable(); // Refresh the timetable
      } else {
        toast.error('Failed to delete timetable entry');
      }
    } catch (error) {
      console.error('Error deleting timetable:', error);
      toast.error('Failed to delete timetable entry');
    }
  };

  const handleEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormData({
      courseId: entry.courseId.toString(),
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room || '',
      group: entry.group || '',
      semester: entry.semester || '',
      department: entry.departmentName || '',
      studentId: entry.studentId || ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingEntry(null);
    setFormData({
      courseId: '',
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      room: '',
      group: '',
      semester: '',
      department: '',
      studentId: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters - Only show for admin view (when no studentId) */}
      {!studentId && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label>Department</Label>
                <select
                  className="w-full p-2 border rounded-md mt-1"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label>Semester</Label>
                <select
                  className="w-full p-2 border rounded-md mt-1"
                  value={currentSemester}
                  onChange={(e) => setCurrentSemester(e.target.value)}
                >
                  <option value="">All Semesters</option>
                  {availableSemesters.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label>Course</Label>
                <select
                  className="w-full p-2 border rounded-md mt-1"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  <option value="">All Courses</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id.toString()}>
                      {course.code} - {course.title}
                    </option>
                  ))}
                </select>
              </div>
              {isEditable && (
                <div className="flex items-end">
                  <Button onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Timetable Entry
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timetable Display */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle>
              {studentId ? 'My Timetable' : 'Class Timetable'}
              {selectedDepartment && ` - ${selectedDepartment}`}
              {currentSemester && ` (${currentSemester})`}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">Time</TableHead>
                {DAYS_ORDER.map(day => (
                  <TableHead key={day} className="min-w-[150px]">{day}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {TIME_SLOTS.map(timeSlot => (
                <TableRow key={timeSlot}>
                  <TableCell className="font-medium">{timeSlot}</TableCell>
                  {DAYS_ORDER.map(day => {
                    const entry = getEntryForTimeSlot(day, timeSlot);
                    return (
                      <TableCell key={`${day}-${timeSlot}`} className="align-top">
                        {entry ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-sm">{entry.courseName}</div>
                            <div className="text-xs text-gray-600">{entry.courseCode}</div>
                            <div className="text-xs text-gray-500">{entry.room}</div>
                            <div className="text-xs text-gray-500">{entry.facultyName}</div>
                            {entry.group && (
                              <Badge variant="outline" className="text-xs">
                                Group {entry.group}
                              </Badge>
                            )}
                            {entry.studentId && (
                              <div className="text-[10px] text-blue-600 font-medium truncate" title={entry.studentId}>
                                ID: {entry.studentId}
                              </div>
                            )}
                            {isEditable && (
                              <div className="flex gap-1 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleEdit(entry)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleDelete(entry.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</DialogTitle>
            <DialogDescription>
              {editingEntry ? 'Update the timetable entry details below.' : 'Fill in the details to create a new timetable entry.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Course *</Label>
              <select
                className="w-full p-2 border rounded-md mt-1"
                value={formData.courseId}
                onChange={(e) => {
                  const courseId = e.target.value;
                  const selectedCourseObj = courses.find(c => c.id.toString() === courseId);
                  setFormData({ 
                    ...formData, 
                    courseId, 
                    department: selectedCourseObj?.department || formData.department 
                  });
                }}
              >
                <option value="">Select Course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title} ({course.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Day of Week *</Label>
                <select
                  className="w-full p-2 border rounded-md mt-1"
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                >
                  <option value="">Select Day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                </select>
              </div>
              <div>
                <Label>Group (Optional)</Label>
                <Input
                  placeholder="e.g., A, B, Morning"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Room</Label>
                <Input
                  placeholder="e.g., Room 101"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Department *</Label>
                <select
                  className="w-full p-2 border rounded-md mt-1"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Semester *</Label>
                <Input
                  placeholder="e.g., Fall 2024"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Specific Student (Optional)</Label>
                <select
                  className="w-full p-2 border rounded-md mt-1"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                >
                  <option value="">All Students (Department-wide)</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingEntry ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}