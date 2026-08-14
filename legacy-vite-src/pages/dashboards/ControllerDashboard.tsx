import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { LayoutDashboard, Calendar, FileCheck, FileText, Award, Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../../App';
import { fetchWithAuth } from '../../utils/api';

interface ControllerDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function ControllerDashboard({ user, onLogout }: ControllerDashboardProps) {
  const [activeView, setActiveView] = useState('overview');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic States
  const [stats, setStats] = useState<any>(null);
  const [examSchedules, setExamSchedules] = useState<any[]>([]);
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [transcriptRequests, setTranscriptRequests] = useState<any[]>([]);
  const [resultQueries, setResultQueries] = useState<any[]>([]);

  useEffect(() => {
    fetchAllControllerData();
  }, []);

  async function fetchAllControllerData() {
    setLoading(true);
    try {
      const [statsRes, schedulesRes, resultsRes, transcriptsRes, queriesRes] = await Promise.all([
        fetchWithAuth('/api/ControllerDashboard/stats'),
        fetchWithAuth('/api/ControllerDashboard/schedules'),
        fetchWithAuth('/api/ControllerDashboard/results'),
        fetchWithAuth('/api/ControllerDashboard/transcripts'),
        fetchWithAuth('/api/ControllerDashboard/queries')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (schedulesRes.ok) setExamSchedules(await schedulesRes.json());
      if (resultsRes.ok) setResultsData(await resultsRes.json());
      if (transcriptsRes.ok) setTranscriptRequests(await transcriptsRes.json());
      if (queriesRes.ok) setResultQueries(await queriesRes.json());

    } catch (error) {
      console.error('Error fetching controller data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, onClick: () => setActiveView('overview') },
    { name: 'Exam Schedules', icon: Calendar, onClick: () => setActiveView('schedules') },
    { name: 'Results Management', icon: FileCheck, onClick: () => setActiveView('results') },
    { name: 'Transcript Generation', icon: FileText, onClick: () => setActiveView('transcripts') },
    { name: 'Exam Policies', icon: Settings, onClick: () => setActiveView('policies') },
    { name: 'Result Queries', icon: Award, onClick: () => setActiveView('queries') },
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

  const openDialog = (type: string, item?: any) => {
    setDialogType(type);
    setSelectedItem(item);
    setIsDialogOpen(true);
  };
  const handleReviewRequest = () => {
    toast.success('Review completed and response sent to student!');
    setIsDialogOpen(false);
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} navigation={navigation}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Controller of Examination</h1>
          <p className="text-gray-600">Examination and Results Management</p>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">Upcoming Exams</p>
                  <p className="text-gray-900">{stats?.upcomingExams || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">Pending Results</p>
                  <p className="text-gray-900">{stats?.pendingResults || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">Transcript Requests</p>
                  <p className="text-gray-900">{stats?.transcriptRequests || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600">Result Queries</p>
                  <p className="text-gray-900">{stats?.resultQueries || '0'}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Exam Schedule Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Exam Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examSchedules.length > 0 ? (
                      examSchedules.map((schedule, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{schedule.department}</TableCell>
                          <TableCell>{schedule.examType}</TableCell>
                          <TableCell>{schedule.startDate}</TableCell>
                          <TableCell>{schedule.endDate}</TableCell>
                          <TableCell><Badge>{schedule.status}</Badge></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                          No exam schedules available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'schedules' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Create Exam Schedule</CardTitle>
                <Button onClick={() => openDialog('new-schedule')}>New Schedule</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Department</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>Computer Science</option>
                      <option>Business Administration</option>
                      <option>Engineering</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Exam Type</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>Midterm</option>
                      <option>Final</option>
                      <option>Quiz</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Semester</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>Fall 2024</option>
                      <option>Spring 2025</option>
                    </select>
                  </div>
                </div>
                <Button onClick={() => openDialog('generate-schedule')}>Generate Schedule</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === 'results' && (
          <Card>
            <CardHeader>
              <CardTitle>Finalize Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>CS-201</TableCell>
                    <TableCell>Midterm</TableCell>
                    <TableCell>Computer Science</TableCell>
                    <TableCell>45</TableCell>
                    <TableCell><Badge variant="secondary">Pending Approval</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => openDialog('finalize-result')}>Finalize</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === 'transcripts' && (
          <Card>
            <CardHeader>
              <CardTitle>Transcript Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>2021-CS-101</TableCell>
                    <TableCell>Ahmed Khan</TableCell>
                    <TableCell>BS Computer Science</TableCell>
                    <TableCell>2025-10-15</TableCell>
                    <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                    <TableCell>
                      <Button size="sm">Generate</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === 'queries' && (
          <Card>
            <CardHeader>
              <CardTitle>Result Rechecking Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Ahmed Khan</TableCell>
                    <TableCell>CS-201</TableCell>
                    <TableCell>Midterm</TableCell>
                    <TableCell>Marks discrepancy</TableCell>
                    <TableCell><Badge variant="secondary">Under Review</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openDialog('review', { student: 'Ahmed Khan', course: 'CS-201', exam: 'Midterm' })}>Review</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {activeView === 'policies' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Examination Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg text-gray-900 mb-3">General Examination Rules</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Students must arrive 15 minutes before the exam start time</li>
                    <li>Valid student ID card is mandatory for entry</li>
                    <li>Mobile phones and electronic devices are strictly prohibited</li>
                    <li>Late entry is not allowed after 30 minutes from exam start time</li>
                    <li>Students cannot leave the examination hall before 30 minutes</li>
                  </ul>
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-lg text-gray-900 mb-3">Grading Policy</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Marks Range</TableHead>
                        <TableHead>Grade Point</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>A</TableCell>
                        <TableCell>85-100</TableCell>
                        <TableCell>4.0</TableCell>
                        <TableCell>Excellent</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>B</TableCell>
                        <TableCell>70-84</TableCell>
                        <TableCell>3.0</TableCell>
                        <TableCell>Good</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>C</TableCell>
                        <TableCell>60-69</TableCell>
                        <TableCell>2.0</TableCell>
                        <TableCell>Satisfactory</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>D</TableCell>
                        <TableCell>50-59</TableCell>
                        <TableCell>1.0</TableCell>
                        <TableCell>Pass</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>F</TableCell>
                        <TableCell>Below 50</TableCell>
                        <TableCell>0.0</TableCell>
                        <TableCell>Fail</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-lg text-gray-900 mb-3">Attendance Requirements</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-700 mb-2">Minimum attendance required: <strong>75%</strong></p>
                    <p className="text-sm text-gray-600">Students with less than 75% attendance will not be allowed to sit for the examination.</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-lg text-gray-900 mb-3">Assessment Weightage</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Quizzes</p>
                      <p className="text-gray-900">15%</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Assignments</p>
                      <p className="text-gray-900">15%</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Mid-Term Exam</p>
                      <p className="text-gray-900">30%</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Final Exam</p>
                      <p className="text-gray-900">40%</p>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-lg text-gray-900 mb-3">Result Rechecking Policy</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Students can apply for result rechecking within 7 days of result announcement</li>
                    <li>Rechecking fee: PKR 500 per course</li>
                    <li>Only addition of marks and checking for unmarked answers will be done</li>
                    <li>No change in grading policy during rechecking</li>
                    <li>Results will be communicated within 15 working days</li>
                  </ul>
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-lg text-gray-900 mb-3">Unfair Means</h3>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-red-900 mb-2">Zero Tolerance Policy</p>
                    <p className="text-sm text-gray-700">
                      Any student found involved in unfair means during examination will face strict disciplinary action
                      including cancellation of exam and possible expulsion from the institution.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          {dialogType === 'review' && selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>Review Result Rechecking Request</DialogTitle>
                <DialogDescription>
                  Review the result rechecking request for {selectedItem?.student} in {selectedItem?.course} ({selectedItem?.exam}).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Label>Student Name</Label>
                <Input value={selectedItem?.student} readOnly />
                <Label>Course</Label>
                <Input value={selectedItem?.course} readOnly />
                <Label>Exam</Label>
                <Input value={selectedItem?.exam} readOnly />
                <Label>Reason for Rechecking</Label>
                <Textarea value="Marks discrepancy" readOnly />
                <Label>Review Response</Label>
                <Textarea placeholder="Enter your review response here..." />
              </div>
              <DialogFooter>
                <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleReviewRequest}>Submit Review</Button>
              </DialogFooter>
            </>
          )}
          {dialogType === 'new-schedule' && (
            <>
              <DialogHeader>
                <DialogTitle>Create New Exam Schedule</DialogTitle>
                <DialogDescription>
                  Create a new examination schedule for the upcoming semester.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Department</Label>
                  <select className="w-full p-2 border rounded-md mt-1">
                    <option>Computer Science</option>
                    <option>Business Administration</option>
                    <option>Engineering</option>
                  </select>
                </div>
                <div>
                  <Label>Exam Type</Label>
                  <select className="w-full p-2 border rounded-md mt-1">
                    <option>Midterm</option>
                    <option>Final</option>
                    <option>Quiz</option>
                  </select>
                </div>
                <div>
                  <Label>Semester</Label>
                  <select className="w-full p-2 border rounded-md mt-1">
                    <option>Fall 2024</option>
                    <option>Spring 2025</option>
                  </select>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" className="mt-1" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" className="mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  toast.success('Exam schedule created successfully!');
                  setIsDialogOpen(false);
                }}>Create Schedule</Button>
              </DialogFooter>
            </>
          )}
          {dialogType === 'generate-schedule' && (
            <>
              <DialogHeader>
                <DialogTitle>Generate Exam Schedule</DialogTitle>
                <DialogDescription>
                  Automatically generate examination schedule based on selected criteria.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">The system will automatically generate exam schedule considering:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Course enrollment numbers</li>
                    <li>Room availability</li>
                    <li>Conflict-free time slots</li>
                    <li>Faculty availability</li>
                  </ul>
                </div>
                <div>
                  <Label>Time Gap Between Exams (days)</Label>
                  <Input type="number" placeholder="2" className="mt-1" />
                </div>
                <div>
                  <Label>Preferred Start Time</Label>
                  <Input type="time" placeholder="09:00" className="mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  toast.success('Exam schedule generated successfully!');
                  setIsDialogOpen(false);
                }}>Generate</Button>
              </DialogFooter>
            </>
          )}
          {dialogType === 'finalize-result' && (
            <>
              <DialogHeader>
                <DialogTitle>Finalize Examination Results</DialogTitle>
                <DialogDescription>
                  Review and finalize the results for CS-201 Midterm Examination.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-gray-900">45</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pass</p>
                    <p className="text-green-600">38</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fail</p>
                    <p className="text-red-600">7</p>
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-900">
                    ⚠️ Once finalized, the results will be visible to students and cannot be modified without special approval.
                  </p>
                </div>
                <div>
                  <Label>Verification Status</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" id="verify-marks" defaultChecked />
                      <label htmlFor="verify-marks" className="text-gray-700">All marks have been verified</label>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" id="verify-attendance" defaultChecked />
                      <label htmlFor="verify-attendance" className="text-gray-700">Attendance requirements met</label>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" id="verify-unfair" defaultChecked />
                      <label htmlFor="verify-unfair" className="text-gray-700">No pending unfair means cases</label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  toast.success('Results finalized and published successfully!');
                  setIsDialogOpen(false);
                }}>Finalize & Publish</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
