import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Checkbox } from './ui/checkbox';
import {
  FileText, Upload, Check, X, Clock, AlertCircle, Users, Calendar
  , Award, Eye, Edit, CheckCircle, XCircle, User, Loader2
} from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { toast } from 'sonner';

interface FYPManagementProps {
  role: 'student' | 'faculty' | 'hod' | 'coordinator';
  userId?: string;
  userName?: string;
}

export default function FYPManagement({ role, userId, userName }: FYPManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Dynamic States
  const [fypGroup, setFYPGroup] = useState<any>(null);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [availableSupervisors, setAvailableSupervisors] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [semesterConfig, setSemesterConfig] = useState<any>(null);
  const [enableForm, setEnableForm] = useState({
    proposalDeadline: '',
    midSemDeadline: '',
    finalSubmissionDeadline: '',
    supervisorQuota: 3,
    maxMembersPerGroup: 3
  });

  useEffect(() => {
    fetchInitialData();
  }, [role, userId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const currentSemester = 'Fall 2024'; // Dynamic in real app
      const currentDept = 'Computer Science'; // Dynamic in real app

      if (role === 'student' && userId) {
        const res = await fetchWithAuth(`/api/FYPManagement/groups/student/${userId}`);
        if (res.ok) setFYPGroup(await res.json());
        
        const studentsRes = await fetchWithAuth('/api/Users/students');
        if (studentsRes.ok) setAvailableStudents(await studentsRes.json());
      }

      if (role === 'faculty' && userId) {
        const res = await fetchWithAuth(`/api/FYPManagement/groups/supervisor/${userId}`);
        if (res.ok) setPendingRequests(await res.json());
      }

      if (role === 'hod' || role === 'coordinator') {
        const groupsRes = await fetchWithAuth(`/api/FYPManagement/groups?department=${currentDept}&semester=${currentSemester}`);
        if (groupsRes.ok) setAllGroups(await groupsRes.json());
      }

      const supervisorsRes = await fetchWithAuth(`/api/FYPManagement/available-supervisors?department=${currentDept}`);
      if (supervisorsRes.ok) setAvailableSupervisors(await supervisorsRes.json());

      const configRes = await fetchWithAuth(`/api/FYPManagement/semester-config?semester=${currentSemester}&department=${currentDept}`);
      if (configRes.ok) setSemesterConfig(await configRes.json());

    } catch (error) {
      console.error('Error fetching FYP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormGroup = async (formData: any) => {
      if (selectedMembers.length === 0) {
      toast.error('Please select at least one team member');
      return;
    }
    try {
      const res = await fetchWithAuth('/api/FYPManagement/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          memberIds: [...selectedMembers, userId],
          department: 'Computer Science', // Placeholder
          semester: 'Fall 2024' // Placeholder
        })
      });
      if (res.ok) {
        toast.success('Group formed successfully! Waiting for supervisor approval.');
        fetchInitialData();
        setIsDialogOpen(false);
      }
    } catch (error) {
      toast.error('Failed to form group');
    }
  };

  const handleSupervisorApproval = async (groupId: number, approved: boolean) => {
    try {
      const res = await fetchWithAuth(`/api/FYPManagement/groups/${groupId}/supervisor-approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approved)
      });
      if (res.ok) {
        toast.success(approved ? 'Request approved!' : 'Request rejected');
        fetchInitialData();
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleSubmitProposal = async (proposalData: any) => {
    try {
      const res = await fetchWithAuth('/api/FYPManagement/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...proposalData, groupId: fypGroup.id })
      });
      if (res.ok) {
        toast.success('Proposal submitted successfully!');
        fetchInitialData();
        setIsDialogOpen(false);
      }
    } catch (error) {
      toast.error('Submission failed');
    }
  };

  const handleEnableFYP = async (configData: any) => {
    try {
      const res = await fetchWithAuth('/api/FYPManagement/semester-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...configData,
          department: 'Computer Science',
          semester: 'Fall 2024',
          isEnabled: true
        })
      });
      if (res.ok) {
        toast.success('FYP Module enabled for this semester!');
        fetchInitialData();
        setIsDialogOpen(false);
      }
    } catch (error) {
      toast.error('Failed to enable FYP');
    }
  };

  const handleNominate = async (groupId: number, nominate: boolean) => {
    try {
      const res = await fetchWithAuth(`/api/FYPManagement/groups/${groupId}/nominate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nominate)
      });
      if (res.ok) {
        toast.success(nominate ? 'Project nominated for exhibition!' : 'Nomination removed');
        fetchInitialData();
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleArchive = async (groupId: number, archive: boolean) => {
    try {
      const res = await fetchWithAuth(`/api/FYPManagement/groups/${groupId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(archive)
      });
      if (res.ok) {
        toast.success(archive ? 'Project archived' : 'Project unarchived');
        fetchInitialData();
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const toggleMemberSelection = (studentId: string) => {
    if (selectedMembers.includes(studentId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== studentId));
    } else {
      if (selectedMembers.length < 3) {
        setSelectedMembers([...selectedMembers, studentId]);
      } else {
        toast.error('Maximum 3 team members allowed');
      }
    }
  };

  // Pending group requests for HoD approval
  const pendingGroupRequests = [
    {
      id: 1,
      groupName: 'AI Research Team',
      leader: 'Ahmed Khan',
      members: ['Sara Ali', 'Usman Tariq'],
      proposedTitle: 'AI-Based Chatbot for Customer Support',
      supervisor: 'Dr. Hassan Ahmed',
      requestDate: '2025-10-18',
      status: 'pending'
    },
    {
      id: 2,
      groupName: 'Blockchain Enthusiasts',
      leader: 'Kamran Ali',
      members: ['Nadia Ahmed', 'Farhan Khan'],
      proposedTitle: 'Blockchain-based Voting System',
      supervisor: 'Dr. Ayesha Malik',
      requestDate: '2025-10-17',
      status: 'pending'
    },
  ];

  // Mock data for different roles
  const studentGroups = [
    {
      id: 1,
      groupName: 'AI Research Team',
      leader: 'Ahmed Khan',
      members: ['Ahmed Khan', 'Sara Ali', 'Usman Tariq'],
      supervisor: 'Dr. Hassan Ahmed',
      supervisorApproved: true,
      title: 'AI-Based Chatbot for Customer Support',
      status: 'proposal-approved',
      proposalDefenseDate: '2025-10-25',
      proposalScore: 85,
      progressReports: 8,
      midSemScore: 78,
      finalDefenseDate: '2025-12-15',
      plagiarismScore: 5
    },
    {
      id: 2,
      groupName: 'Web Innovators',
      leader: 'Fatima Shah',
      members: ['Fatima Shah', 'Ali Raza'],
      supervisor: 'Prof. Dr. Sarah Khan',
      supervisorApproved: true,
      title: 'E-Commerce Platform with AI Recommendations',
      status: 'in-progress',
      proposalDefenseDate: '2025-10-20',
      proposalScore: 92,
      progressReports: 10,
      midSemScore: 85,
      finalDefenseDate: null,
      plagiarismScore: 3
    },
    {
      id: 3,
      groupName: 'Data Science Squad',
      leader: 'Hassan Ali',
      members: ['Hassan Ali', 'Ayesha Khan', 'Bilal Ahmed'],
      supervisor: 'Dr. Usman Tariq',
      supervisorApproved: false,
      title: 'Predictive Analytics for Healthcare',
      status: 'supervisor-pending',
      proposalDefenseDate: null,
      proposalScore: null,
      progressReports: 0,
      midSemScore: null,
      finalDefenseDate: null,
      plagiarismScore: null
    }
  ];

  const supervisorRequests = [
    {
      id: 1,
      groupName: 'Mobile Dev Team',
      leader: 'Zainab Malik',
      members: ['Zainab Malik', 'Hamza Sheikh'],
      proposedTitle: 'Cross-Platform Mobile App for Education',
      domain: 'Mobile Development',
      requestDate: '2025-10-15',
      status: 'pending'
    },
    {
      id: 2,
      groupName: 'Blockchain Enthusiasts',
      leader: 'Kamran Ali',
      members: ['Kamran Ali', 'Nadia Ahmed', 'Farhan Khan'],
      proposedTitle: 'Blockchain-based Voting System',
      domain: 'Blockchain & Security',
      requestDate: '2025-10-14',
      status: 'pending'
    }
  ];

  const progressReports = [
    { week: 1, title: 'Project Kickoff & Requirements', submitted: true, grade: 'A', feedback: 'Excellent start' },
    { week: 2, title: 'System Design & Architecture', submitted: true, grade: 'A-', feedback: 'Good progress' },
    { week: 3, title: 'Database Schema Design', submitted: true, grade: 'B+', feedback: 'Need improvements' },
    { week: 4, title: 'Frontend Development - Phase 1', submitted: true, grade: 'A', feedback: 'Great work' },
    { week: 5, title: 'Backend API Development', submitted: true, grade: 'A', feedback: 'Excellent implementation' },
    { week: 6, title: 'Integration Testing', submitted: false, grade: null, feedback: null },
    { week: 7, title: 'User Testing & Feedback', submitted: false, grade: null, feedback: null },
    { week: 8, title: 'Final Documentation', submitted: false, grade: null, feedback: null },
  ];

  const evaluationCriteria = [
    { criterion: 'Innovation & Novelty', maxMarks: 15, obtainedMarks: 13 },
    { criterion: 'Technical Implementation', maxMarks: 25, obtainedMarks: 22 },
    { criterion: 'Problem Solving', maxMarks: 15, obtainedMarks: 14 },
    { criterion: 'Documentation', maxMarks: 15, obtainedMarks: 12 },
    { criterion: 'Presentation & Demo', maxMarks: 20, obtainedMarks: 17 },
    { criterion: 'Teamwork & Contribution', maxMarks: 10, obtainedMarks: 9 },
  ];


  const openDialog = (type: string, item?: any) => {
    setDialogType(type);
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleApproveGroup = (groupId: number) => {
    toast.success(`Group ${groupId} request approved successfully!`);
  };

  const handleRejectGroup = (groupId: number) => {
    toast.error(`Group ${groupId} request rejected.`);
  };

  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        toast.success('Profile picture updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };


  const handleApproveRequest = (requestId: number) => {
    toast.success(`Supervisor request ${requestId} approved!`);
  };

  const handleRejectRequest = (requestId: number) => {
    toast.error(`Supervisor request ${requestId} rejected.` );
  };

  const handleSubmitProgressReport = () => {
    toast.success('Progress report submitted successfully!');
    setIsDialogOpen(false);
  };

  const handleSubmitFinalProject = () => {
    toast.success('Final project submitted successfully!');
    setIsDialogOpen(false);
  };

  const handleScheduleDefense = () => {
    toast.success('Defense scheduled successfully!');
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Student View */}
      {role === 'student' && (
        <>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profileImage || undefined} />
                  <AvatarFallback>
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="profile-upload" className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 cursor-pointer hover:bg-blue-700">
                  <Upload className="w-3 h-3" />
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageUpload}
                  />
                </label>
              </div>
              <div>
                <h2 className="text-gray-900 mb-2">Final Year Project</h2>
                <p className="text-gray-600">Manage your FYP journey from proposal to completion</p>
              </div>
            </div>
            <Button onClick={() => openDialog('form-group')}>
              <Users className="w-4 h-4 mr-2" />
              Form New Group
            </Button>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="proposal">Proposal</TabsTrigger>
              <TabsTrigger value="progress">Progress Reports</TabsTrigger>
              <TabsTrigger value="final">Final Submission</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Project Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Project Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Project Title</p>
                        <p className="text-gray-900">AI-Based Chatbot for Customer Support</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Group Name</p>
                        <p className="text-gray-900">AI Research Team</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Supervisor</p>
                        <p className="text-gray-900">Dr. Hassan Ahmed</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <Badge variant="default">Proposal Approved</Badge>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-sm text-gray-600">Project Progress</p>
                        <p className="text-sm text-gray-600">65%</p>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Proposal Score</p>
                        <p className="text-gray-900">85/100</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Progress Reports</p>
                        <p className="text-gray-900">8/12</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Mid-Sem Score</p>
                        <p className="text-gray-900">78/100</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Members */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['Ahmed Khan (Leader)', 'Sara Ali', 'Usman Tariq'].map((member, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                          {member.charAt(0)}
                        </div>
                        <div>
                          <p className="text-gray-900">{member}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proposal" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Project Proposal</CardTitle>
                    <Button onClick={() => openDialog('submit-proposal')}>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Proposal
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Proposal Title</Label>
                      <p className="text-gray-900 mt-1">AI-Based Chatbot for Customer Support</p>
                    </div>
                    <div>
                      <Label>Problem Statement</Label>
                      <p className="text-gray-700 mt-1 text-sm">
                        Customer support is a critical aspect of business operations. Traditional methods are time-consuming and expensive. 
                        An AI-based chatbot can automate responses, reduce costs, and improve customer satisfaction.
                      </p>
                    </div>
                    <div>
                      <Label>Objectives</Label>
                      <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                        <li>Develop an intelligent chatbot using NLP</li>
                        <li>Integrate with multiple communication channels</li>
                        <li>Implement machine learning for continuous improvement</li>
                        <li>Create an admin dashboard for monitoring</li>
                      </ul>
                    </div>
                    <div>
                      <Label>Proposal Defense</Label>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="text-green-900">Defense Completed</p>
                        </div>
                        <p className="text-sm text-gray-600">Date: October 25, 2025</p>
                        <p className="text-sm text-gray-600">Score: 85/100</p>
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Panel Feedback:</strong> Excellent proposal with clear objectives. 
                          Implementation plan is well thought out. Approved for development.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Weekly Progress Reports</CardTitle>
                    <Button onClick={() => openDialog('submit-progress')}>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {progressReports.map((report, idx) => (
                        <TableRow key={idx}>
                          <TableCell>Week {report.week}</TableCell>
                          <TableCell>{report.title}</TableCell>
                          <TableCell>
                            {report.submitted ? (
                              <Badge variant="default">Submitted</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>{report.grade || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-600">{report.feedback || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mid-Semester Evaluation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-blue-900">Evaluation Score</p>
                        <p className="text-2xl text-blue-600">78/100</p>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                    <div>
                      <Label>Panel Comments</Label>
                      <p className="text-sm text-gray-700 mt-1">
                        Good progress on the project. Technical implementation is solid. 
                        Documentation needs improvement. Continue focusing on the planned milestones.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="final" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Final Submission</CardTitle>
                    <Button onClick={() => openDialog('submit-final')}>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Final Project
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <p className="text-yellow-900">Final Defense Scheduled</p>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Date: December 15, 2025</p>
                      <p className="text-sm text-gray-600">Time: 10:00 AM</p>
                      <p className="text-sm text-gray-600">Venue: Conference Room 1</p>
                    </div>

                    <div>
                      <Label>Required Submissions</Label>
                      <div className="space-y-2 mt-2">
                        {[
                          { name: 'Final Report (PDF)', status: 'pending' },
                          { name: 'Source Code (ZIP)', status: 'pending' },
                          { name: 'Project Demo Video', status: 'pending' },
                          { name: 'Presentation Slides', status: 'pending' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{item.name}</span>
                            </div>
                            <Badge variant={item.status === 'submitted' ? 'default' : 'secondary'}>
                              {item.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Plagiarism Check</Label>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-green-900">Plagiarism Score: 5%</span>
                          </div>
                          <Badge variant="default" className="bg-green-600">Approved</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">Within acceptable limits (less than 15%)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Faculty View */}
      {role === 'faculty' && (
        <>
          <div>
            <h2 className="text-gray-900 mb-2">FYP Supervision</h2>
            <p className="text-gray-600">Manage and evaluate student projects under your supervision</p>
          </div>

          <Tabs defaultValue="supervised">
            <TabsList>
              <TabsTrigger value="supervised">Supervised Projects</TabsTrigger>
              <TabsTrigger value="requests">Supervision Requests</TabsTrigger>
              <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            </TabsList>

            <TabsContent value="supervised" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {studentGroups.filter(g => g.supervisorApproved).map((group) => (
                  <Card key={group.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{group.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Group: {group.groupName}</p>
                          <p className="text-sm text-gray-600">Leader: {group.leader}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Progress</p>
                          <Progress value={65} className="h-2" />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => openDialog('view-project', group)}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => openDialog('grade-report', group)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Grade
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Supervision Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Leader</TableHead>
                        <TableHead>Proposed Title</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Request Date</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supervisorRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.groupName}</TableCell>
                          <TableCell>{request.leader}</TableCell>
                          <TableCell>{request.proposedTitle}</TableCell>
                          <TableCell><Badge variant="secondary">{request.domain}</Badge></TableCell>
                          <TableCell>{request.requestDate}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600"
                                onClick={() => handleApproveRequest(request.id)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600"
                                onClick={() => handleRejectRequest(request.id)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evaluations">
              <Card>
                <CardHeader>
                  <CardTitle>Project Evaluations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {studentGroups.filter(g => g.supervisorApproved).map((group) => (
                      <div key={group.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-gray-900">{group.title}</h3>
                            <p className="text-sm text-gray-600">{group.groupName}</p>
                          </div>
                          <Button size="sm" onClick={() => openDialog('evaluate', group)}>
                            Evaluate
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Proposal</p>
                            <p className="text-gray-900">{group.proposalScore}/100</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Mid-Sem</p>
                            <p className="text-gray-900">{group.midSemScore}/100</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Progress Reports</p>
                            <p className="text-gray-900">{group.progressReports}/12</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* HOD View */}
      {role === 'hod' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-gray-900 mb-2">FYP Management</h2>
              <p className="text-gray-600">Oversee and manage final year projects for the department</p>
            </div>
            <Button onClick={() => openDialog('enable-fyp')}>
              Enable FYP for Semester
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Groups</p>
                    <p className="text-2xl text-gray-900">{studentGroups.length}</p>
                  </div>
                  <Users className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Proposals Approved</p>
                    <p className="text-2xl text-gray-900">{studentGroups.filter(g => g.status === 'proposal-approved' || g.status === 'in-progress').length}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl text-gray-900">{studentGroups.filter(g => g.status === 'in-progress').length}</p>
                  </div>
                  <Clock className="w-10 h-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Supervisors</p>
                    <p className="text-2xl text-gray-900">{availableSupervisors.length}</p>
                  </div>
                  <Award className="w-10 h-10 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="groups">
            <TabsList>
              <TabsTrigger value="groups">All Groups</TabsTrigger>
              <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
              <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
              <TabsTrigger value="schedule">Defense Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Group Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Leader</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Proposed Title</TableHead>
                        <TableHead>Supervisor</TableHead>
                        <TableHead>Request Date</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingGroupRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.groupName}</TableCell>
                          <TableCell>{request.leader}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {request.members.map((member, idx) => (
                                <div key={idx}>{member}</div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{request.proposedTitle}</TableCell>
                          <TableCell>{request.supervisor}</TableCell>
                          <TableCell>{request.requestDate}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleApproveGroup(request.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRejectGroup(request.id)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="groups">
              <Card>
                <CardHeader>
                  <CardTitle>Student Groups</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Leader</TableHead>
                        <TableHead>Project Title</TableHead>
                        <TableHead>Supervisor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allGroups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{group.groupName}</span>
                              {group.nominatedForBestProject && (
                                <Badge variant="default" className="w-fit bg-yellow-500 text-[10px]">Nominated</Badge>
                              )}
                              {group.isArchived && (
                                <Badge variant="secondary" className="w-fit text-[10px]">Archived</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{group.members?.find((m: any) => m.role === 'Leader')?.firstName || 'N/A'}</TableCell>
                          <TableCell>{group.projectTitle}</TableCell>
                          <TableCell>{group.supervisor?.firstName || 'Pending'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              group.status === 'InProgress' ? 'default' :
                              group.status === 'Completed' ? 'default' :
                              'secondary'
                            }>
                              {group.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openDialog('view-group', group)}>
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className={group.nominatedForBestProject ? 'text-yellow-600' : ''}
                                onClick={() => handleNominate(group.id, !group.nominatedForBestProject)}
                              >
                                <Award className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleArchive(group.id, !group.isArchived)}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="supervisors">
              <Card>
                <CardHeader>
                  <CardTitle>Faculty Supervisors</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supervisor Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Research Domains</TableHead>
                        <TableHead>Quota</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Available</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableSupervisors.map((supervisor) => (
                        <TableRow key={supervisor.id}>
                          <TableCell>{supervisor.name}</TableCell>
                          <TableCell>{supervisor.department}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {supervisor.domains.map((domain:any, idx:any) => (
                                <Badge key={idx} variant="secondary" className="text-xs">{domain}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{supervisor.quota}</TableCell>
                          <TableCell>{supervisor.assigned}</TableCell>
                          <TableCell>
                            <Badge variant={supervisor.quota - supervisor.assigned > 0 ? 'default' : 'destructive'}>
                              {supervisor.quota - supervisor.assigned}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Defense Schedule</CardTitle>
                    <Button onClick={() => openDialog('schedule-defense')}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Defense
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {studentGroups.filter(g => g.proposalDefenseDate || g.finalDefenseDate).map((group) => (
                      <div key={group.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-gray-900">{group.title}</h3>
                            <p className="text-sm text-gray-600">{group.groupName}</p>
                          </div>
                          <Badge variant="secondary">
                            {group.finalDefenseDate ? 'Final Defense' : 'Proposal Defense'}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{group.finalDefenseDate || group.proposalDefenseDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'form-group' && 'Form New Group'}
              {dialogType === 'submit-proposal' && 'Submit Project Proposal'}
              {dialogType === 'submit-progress' && 'Submit Weekly Progress Report'}
              {dialogType === 'submit-final' && 'Submit Final Project'}
              {dialogType === 'schedule-defense' && 'Schedule Defense'}
              {dialogType === 'evaluate' && 'Evaluate Project'}
              {dialogType === 'view-project' && 'Project Details'}
              {dialogType === 'grade-report' && 'Grade Progress Report'}
              {!dialogType && 'Dialog'}
            </DialogTitle>
            {dialogType === 'form-group' && (
              <DialogDescription>Create a new FYP group and select your supervisor</DialogDescription>
            )}
            {dialogType === 'submit-final' && (
              <DialogDescription>Upload all required files for final evaluation</DialogDescription>
            )}
            {dialogType === 'evaluate' && selectedItem && (
              <DialogDescription>{selectedItem.title}</DialogDescription>
            )}
            {dialogType === 'view-project' && selectedItem && (
              <DialogDescription>Group: {selectedItem.groupName}</DialogDescription>
            )}
            {dialogType === 'grade-report' && selectedItem && (
              <DialogDescription>{selectedItem.title}</DialogDescription>
            )}
          </DialogHeader>
          
          {dialogType === 'form-group' && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Group Name</Label>
                  <Input placeholder="Enter group name" className="mt-2" />
                </div>
                <div>
                  <Label>Team Members (Select up to 3 members)</Label>
                  <div className="mt-2 border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {availableStudents.map((student) => (
                      <div key={student.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          checked={selectedMembers.includes(student.id)}
                          onCheckedChange={() => toggleMemberSelection(student.id)}
                          disabled={!selectedMembers.includes(student.id) && selectedMembers.length >= 3}
                        />
                        <label className="text-sm flex-1 cursor-pointer">
                          {student.name} ({student.id})
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {selectedMembers.length}/3
                  </p>
                </div>
                <div>
                  <Label>Proposed Project Title</Label>
                  <Input placeholder="Enter project title" className="mt-2" />
                </div>
                <div>
                  <Label>Select Supervisor</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSupervisors.filter(s => s.assigned < s.quota).map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                          {supervisor.name} ({supervisor.domains.join(', ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => handleFormGroup({})}>Submit Request</Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'enable-fyp' && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Proposal Submission Deadline</Label>
                  <Input 
                    type="date" 
                    value={enableForm.proposalDeadline}
                    onChange={(e) => setEnableForm({...enableForm, proposalDeadline: e.target.value})}
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label>Mid-Semester Evaluation Deadline</Label>
                  <Input 
                    type="date" 
                    value={enableForm.midSemDeadline}
                    onChange={(e) => setEnableForm({...enableForm, midSemDeadline: e.target.value})}
                    className="mt-2" 
                  />
                </div>
                <div>
                  <Label>Final Report Submission Deadline</Label>
                  <Input 
                    type="date" 
                    value={enableForm.finalSubmissionDeadline}
                    onChange={(e) => setEnableForm({...enableForm, finalSubmissionDeadline: e.target.value})}
                    className="mt-2" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Supervisor Group Quota</Label>
                    <Input 
                      type="number" 
                      value={enableForm.supervisorQuota}
                      onChange={(e) => setEnableForm({...enableForm, supervisorQuota: parseInt(e.target.value)})}
                      className="mt-2" 
                    />
                  </div>
                  <div>
                    <Label>Max Members Per Group</Label>
                    <Input 
                      type="number" 
                      value={enableForm.maxMembersPerGroup}
                      onChange={(e) => setEnableForm({...enableForm, maxMembersPerGroup: parseInt(e.target.value)})}
                      className="mt-2" 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => handleEnableFYP(enableForm)}>Enable Module</Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'submit-proposal' && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Project Title</Label>
                  <Input defaultValue="AI-Based Chatbot for Customer Support" className="mt-2" />
                </div>
                <div>
                  <Label>Problem Statement</Label>
                  <Textarea className="mt-2" rows={4} placeholder="Describe the problem you're solving..." />
                </div>
                <div>
                  <Label>Objectives</Label>
                  <Textarea className="mt-2" rows={4} placeholder="List your project objectives..." />
                </div>
                <div>
                  <Label>Methodology</Label>
                  <Textarea className="mt-2" rows={4} placeholder="Describe your approach..." />
                </div>
                <div>
                  <Label>Upload Proposal Document</Label>
                  <Input type="file" className="mt-2" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmitProposal}>Submit Proposal</Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'submit-progress' && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Week Number</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {[6, 7, 8, 9, 10, 11, 12].map((week) => (
                        <SelectItem key={week} value={week.toString()}>Week {week}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Report Title</Label>
                  <Input placeholder="Enter report title" className="mt-2" />
                </div>
                <div>
                  <Label>Work Completed This Week</Label>
                  <Textarea className="mt-2" rows={4} placeholder="Describe what you accomplished..." />
                </div>
                <div>
                  <Label>Challenges Faced</Label>
                  <Textarea className="mt-2" rows={3} placeholder="Any difficulties or blockers..." />
                </div>
                <div>
                  <Label>Next Week's Plan</Label>
                  <Textarea className="mt-2" rows={3} placeholder="What you plan to do next..." />
                </div>
                <div>
                  <Label>Upload Supporting Documents</Label>
                  <Input type="file" className="mt-2" multiple />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmitProgressReport}>Submit Report</Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'submit-final' && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Final Report (PDF)</Label>
                  <Input type="file" accept=".pdf" className="mt-2" />
                </div>
                <div>
                  <Label>Source Code (ZIP)</Label>
                  <Input type="file" accept=".zip" className="mt-2" />
                </div>
                <div>
                  <Label>Demo Video (MP4)</Label>
                  <Input type="file" accept=".mp4" className="mt-2" />
                </div>
                <div>
                  <Label>Presentation Slides (PPTX/PDF)</Label>
                  <Input type="file" accept=".pptx,.pdf" className="mt-2" />
                </div>
                <div>
                  <Label>Project Abstract</Label>
                  <Textarea className="mt-2" rows={4} placeholder="Write a brief abstract of your project..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmitFinalProject}>Submit Final Project</Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'schedule-defense' && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Select Group</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose group" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.groupName} - {group.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Defense Type</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proposal">Proposal Defense</SelectItem>
                      <SelectItem value="mid-sem">Mid-Semester Evaluation</SelectItem>
                      <SelectItem value="final">Final Defense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" className="mt-2" />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input type="time" className="mt-2" />
                </div>
                <div>
                  <Label>Venue</Label>
                  <Input placeholder="Enter venue" className="mt-2" />
                </div>
                <div>
                  <Label>Panel Members (Comma separated)</Label>
                  <Input placeholder="Dr. Name 1, Dr. Name 2, Dr. Name 3" className="mt-2" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleScheduleDefense}>Schedule Defense</Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'evaluate' && selectedItem && (
            <>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criterion</TableHead>
                      <TableHead>Max Marks</TableHead>
                      <TableHead>Obtained</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluationCriteria.map((criterion, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{criterion.criterion}</TableCell>
                        <TableCell>{criterion.maxMarks}</TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            defaultValue={criterion.obtainedMarks} 
                            max={criterion.maxMarks}
                            className="w-20"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div>
                  <Label>Comments & Feedback</Label>
                  <Textarea className="mt-2" rows={4} placeholder="Provide detailed feedback..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  toast.success('Evaluation saved successfully!');
                  setIsDialogOpen(false);
                }}>
                  Save Evaluation
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'view-project' && selectedItem && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Group Name</Label>
                    <p className="text-gray-900 mt-1">{selectedItem.groupName}</p>
                  </div>
                  <div>
                    <Label>Group Leader</Label>
                    <p className="text-gray-900 mt-1">{selectedItem.leader}</p>
                  </div>
                </div>
                <div>
                  <Label>Project Title</Label>
                  <p className="text-gray-900 mt-1">{selectedItem.title}</p>
                </div>
                <div>
                  <Label>Team Members</Label>
                  <div className="space-y-2 mt-2">
                    {selectedItem.members.map((member: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                          {member.charAt(0)}
                        </div>
                        <span className="text-gray-900">{member}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Project Progress</Label>
                  <Progress value={65} className="h-2 mt-2" />
                  <p className="text-sm text-gray-600 mt-1">65% complete</p>
                </div>
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Proposal Score</p>
                    <p className="text-gray-900">{selectedItem.proposalScore}/100</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Progress Reports</p>
                    <p className="text-gray-900">{selectedItem.progressReports}/12</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Mid-Sem Score</p>
                    <p className="text-gray-900">{selectedItem.midSemScore}/100</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'grade-report' && selectedItem && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Select Week</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose week" />
                    </SelectTrigger>
                    <SelectContent>
                      {progressReports.filter(r => r.submitted).map((report) => (
                        <SelectItem key={report.week} value={report.week.toString()}>
                          Week {report.week} - {report.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grade</Label>
                  <Select>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Assign grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A (Excellent)</SelectItem>
                      <SelectItem value="A-">A- (Very Good)</SelectItem>
                      <SelectItem value="B+">B+ (Good)</SelectItem>
                      <SelectItem value="B">B (Satisfactory)</SelectItem>
                      <SelectItem value="C+">C+ (Fair)</SelectItem>
                      <SelectItem value="C">C (Pass)</SelectItem>
                      <SelectItem value="F">F (Fail)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Feedback & Comments</Label>
                  <Textarea 
                    className="mt-2" 
                    rows={5} 
                    placeholder="Provide detailed feedback on the progress report..."
                  />
                </div>
                <div>
                  <Label>Recommendations</Label>
                  <Textarea 
                    className="mt-2" 
                    rows={3} 
                    placeholder="Any suggestions for improvement..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  toast.success('Grade submitted successfully!');
                  setIsDialogOpen(false);
                }}>
                  Submit Grade
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}