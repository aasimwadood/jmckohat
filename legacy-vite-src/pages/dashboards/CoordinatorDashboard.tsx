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
import { LayoutDashboard, Calendar, Clock, Users, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../../App';
import { fetchWithAuth } from '../../utils/api';

interface CoordinatorDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function CoordinatorDashboard({ user, onLogout }: CoordinatorDashboardProps) {
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Dynamic States
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [facultyData, setFacultyData] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    fetchAllCoordinatorData();
  }, []);

  async function fetchAllCoordinatorData() {
    setLoading(true);
    try {
      const [statsRes, eventsRes, timetablesRes, facultyRes, conflictsRes] = await Promise.all([
        fetchWithAuth('/api/CoordinatorDashboard/stats'),
        fetchWithAuth('/api/CoordinatorDashboard/events'),
        fetchWithAuth('/api/CoordinatorDashboard/timetables'),
        fetchWithAuth('/api/CoordinatorDashboard/faculty'),
        fetchWithAuth('/api/CoordinatorDashboard/conflicts')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (timetablesRes.ok) setTimetables(await timetablesRes.json());
      if (facultyRes.ok) setFacultyData(await facultyRes.json());
      if (conflictsRes.ok) setConflicts(await conflictsRes.json());

    } catch (error) {
      console.error('Error fetching coordinator data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const [createTimetableDialog, setCreateTimetableDialog] = useState(false);
  const [addEventDialog, setAddEventDialog] = useState(false);
  const [editEventDialog, setEditEventDialog] = useState(false);
  const [resolveConflictDialog, setResolveConflictDialog] = useState(false);
  const [viewScheduleDialog, setViewScheduleDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedConflict, setSelectedConflict] = useState<any>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, onClick: () => setActiveView('overview') },
    { name: 'Timetable Management', icon: Calendar, onClick: () => setActiveView('timetable') },
    { name: 'Academic Calendar', icon: Calendar, onClick: () => setActiveView('calendar') },
    { name: 'Faculty Coordination', icon: Users, onClick: () => setActiveView('faculty') },
    { name: 'Scheduling Conflicts', icon: AlertCircle, onClick: () => setActiveView('conflicts') },
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
          <h1 className="text-gray-900 mb-2">Coordinator Dashboard</h1>
          <p className="text-gray-600">Academic Logistics & Coordination</p>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <Calendar className="w-10 h-10 text-blue-600 mb-4" />
                  <p className="text-sm text-gray-600">Active Timetables</p>
                  <p className="text-gray-900">{stats?.activeTimetables || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Clock className="w-10 h-10 text-green-600 mb-4" />
                  <p className="text-sm text-gray-600">Total Classes</p>
                  <p className="text-gray-900">{stats?.totalClasses || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Users className="w-10 h-10 text-purple-600 mb-4" />
                  <p className="text-sm text-gray-600">Faculty Coordinated</p>
                  <p className="text-gray-900">{stats?.facultyCoordinated || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <AlertCircle className="w-10 h-10 text-orange-600 mb-4" />
                  <p className="text-sm text-gray-600">Pending Conflicts</p>
                  <p className="text-gray-900">{stats?.pendingConflicts || '0'}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Academic Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.length > 0 ? (
                    events.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <h4 className="text-gray-900">{item.event}</h4>
                          <p className="text-sm text-gray-600">{item.department}</p>
                        </div>
                        <p className="text-sm text-gray-500">{item.date}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No upcoming events</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'timetable' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Timetable Management</CardTitle>
                <Button onClick={() => setCreateTimetableDialog(true)}>Create New Timetable</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4">
                <select className="p-2 border rounded-md">
                  <option>Computer Science</option>
                  <option>Business Administration</option>
                  <option>Engineering</option>
                </select>
                <select className="p-2 border rounded-md">
                  <option>Semester 1</option>
                  <option>Semester 3</option>
                  <option>Semester 5</option>
                </select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Monday</TableHead>
                    <TableHead>Tuesday</TableHead>
                    <TableHead>Wednesday</TableHead>
                    <TableHead>Thursday</TableHead>
                    <TableHead>Friday</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>9:00 - 10:30</TableCell>
                    <TableCell>CS-201</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>CS-201</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>CS-201</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 flex gap-2">
                <Button>Save Timetable</Button>
                <Button variant="outline" onClick={() => {
                  toast.success('Timetable published successfully');
                }}>Publish</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === 'calendar' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Academic Calendar</CardTitle>
                <Button onClick={() => setAddEventDialog(true)}>Add Event</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Mid-term Break</TableCell>
                    <TableCell>2025-11-01</TableCell>
                    <TableCell>2025-11-05</TableCell>
                    <TableCell>Holiday</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedEvent({ name: 'Mid-term Break', startDate: '2025-11-01', endDate: '2025-11-05', type: 'Holiday' });
                        setEditEventDialog(true);
                      }}>Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Final Exams</TableCell>
                    <TableCell>2025-12-15</TableCell>
                    <TableCell>2025-12-25</TableCell>
                    <TableCell>Examination</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedEvent({ name: 'Final Exams', startDate: '2025-12-15', endDate: '2025-12-25', type: 'Examination' });
                        setEditEventDialog(true);
                      }}>Edit</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {activeView === 'faculty' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Faculty Coordination</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4 mb-4">
                    <Input placeholder="Search faculty..." className="max-w-xs" />
                    <Select>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue placeholder="Filter by department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="cs">Computer Science</SelectItem>
                        <SelectItem value="ba">Business Administration</SelectItem>
                        <SelectItem value="eng">Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Faculty Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Teaching Load</TableHead>
                        <TableHead>Available Hours</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { name: 'Prof. John Doe', dept: 'Computer Science', load: '12 hrs', available: '8 hrs', status: 'Available' },
                        { name: 'Dr. Sarah Smith', dept: 'Computer Science', load: '15 hrs', available: '5 hrs', status: 'Available' },
                        { name: 'Prof. Michael Johnson', dept: 'Engineering', load: '18 hrs', available: '2 hrs', status: 'Limited' },
                        { name: 'Dr. Emily Brown', dept: 'Business Admin', load: '9 hrs', available: '11 hrs', status: 'Available' },
                      ].map((faculty, i) => (
                        <TableRow key={i}>
                          <TableCell>{faculty.name}</TableCell>
                          <TableCell>{faculty.dept}</TableCell>
                          <TableCell>{faculty.load}</TableCell>
                          <TableCell>{faculty.available}</TableCell>
                          <TableCell>
                            <Badge variant={
                              faculty.status === 'Available' ? 'default' :
                              faculty.status === 'Limited' ? 'secondary' : 'destructive'
                            }>
                              {faculty.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedFaculty(faculty);
                              setViewScheduleDialog(true);
                            }}>View Schedule</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'conflicts' && (
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Conflicts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { issue: 'Room A-101 double booked on Monday 9:00 AM', priority: 'High', details: 'CS-201 and MATH-101 both scheduled' },
                  { issue: 'Prof. John Doe scheduled for two classes at same time', priority: 'Critical', details: 'Tuesday 2:00 PM - CS-301 and CS-401' },
                  { issue: 'Lab equipment unavailable for CS-301 practical', priority: 'Medium', details: 'Lab maintenance scheduled' },
                ].map((conflict, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-gray-900">{conflict.issue}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        conflict.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                        conflict.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {conflict.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{conflict.details}</p>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedConflict(conflict);
                      setResolveConflictDialog(true);
                    }}>Resolve</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {/* Create Timetable Dialog */}
      <Dialog open={createTimetableDialog} onOpenChange={setCreateTimetableDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Timetable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cs">Computer Science</SelectItem>
                    <SelectItem value="ba">Business Administration</SelectItem>
                    <SelectItem value="eng">Engineering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                    <SelectItem value="3">Semester 3</SelectItem>
                    <SelectItem value="4">Semester 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input placeholder="e.g., 2025-2026" />
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fall">Fall</SelectItem>
                    <SelectItem value="spring">Spring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Template (Optional)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Use existing template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Start from scratch</SelectItem>
                  <SelectItem value="prev">Previous semester</SelectItem>
                  <SelectItem value="standard">Standard template</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Any special notes or requirements..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTimetableDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success('Timetable created successfully');
              setCreateTimetableDialog(false);
            }}>Create Timetable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Event Dialog */}
      <Dialog open={addEventDialog} onOpenChange={setAddEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Academic Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input placeholder="e.g., Mid-term Examinations" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="exam">Examination</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="cs">Computer Science</SelectItem>
                  <SelectItem value="ba">Business Administration</SelectItem>
                  <SelectItem value="eng">Engineering</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Event details and instructions..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEventDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success('Event added successfully');
              setAddEventDialog(false);
            }}>Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Event Dialog */}
      <Dialog open={editEventDialog} onOpenChange={setEditEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input defaultValue={selectedEvent?.name} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" defaultValue={selectedEvent?.startDate} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" defaultValue={selectedEvent?.endDate} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select defaultValue={selectedEvent?.type?.toLowerCase()}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="examination">Examination</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Event details..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEventDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success('Event updated successfully');
              setEditEventDialog(false);
            }}>Update Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Resolve Conflict Dialog */}
      <Dialog open={resolveConflictDialog} onOpenChange={setResolveConflictDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Scheduling Conflict</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="text-gray-900 mb-1">Conflict Details</h4>
              <p className="text-sm text-gray-700">{selectedConflict?.issue}</p>
              <p className="text-sm text-gray-600 mt-1">{selectedConflict?.details}</p>
            </div>
            <div className="space-y-2">
              <Label>Resolution Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reschedule">Reschedule Class</SelectItem>
                  <SelectItem value="changeroom">Change Room</SelectItem>
                  <SelectItem value="changefaculty">Assign Different Faculty</SelectItem>
                  <SelectItem value="cancel">Cancel One Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>New Time/Room (if applicable)</Label>
              <Input placeholder="e.g., Monday 2:00 PM - Room B-201" />
            </div>
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea placeholder="Explain the resolution and any actions taken..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Notify Affected Parties</Label>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="notify" className="rounded" defaultChecked />
                <label htmlFor="notify" className="text-sm text-gray-600">
                  Send notification to affected faculty and students
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveConflictDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success('Conflict resolved successfully');
              setResolveConflictDialog(false);
            }}>Confirm Resolution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View Schedule Dialog */}
      <Dialog open={viewScheduleDialog} onOpenChange={setViewScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View Schedule for {selectedFaculty?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input defaultValue={selectedFaculty?.dept} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Teaching Load</Label>
                <Input defaultValue={selectedFaculty?.load} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Available Hours</Label>
                <Input defaultValue={selectedFaculty?.available} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input defaultValue={selectedFaculty?.status} readOnly />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Classes</Label>
              <Textarea placeholder="List of classes and their timings..." rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewScheduleDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
