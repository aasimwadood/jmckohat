import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { LayoutDashboard, DollarSign, BookOpen, HelpCircle, Calendar, UserPlus, Loader2, Activity } from 'lucide-react';
import type { User } from '../../App';
import { AdmissionManagement } from '../../components/AdmissionManagement';
import { fetchWithAuth } from '../../utils/api';
import { toast } from 'sonner';

interface AdministrationDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdministrationDashboard({ user, onLogout }: AdministrationDashboardProps) {
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Dynamic States
  const [stats, setStats] = useState<any>(null);
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [libraryData, setLibraryData] = useState<any[]>([]);
  const [helpdeskTickets, setHelpdeskTickets] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [reportDefinitions, setReportDefinitions] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  async function fetchAllAdminData() {
    setLoading(true);
    try {
      const [statsRes, financeRes, libraryRes, ticketsRes, eventsRes, reportsRes, logsRes] = await Promise.all([
        fetchWithAuth('/api/AdministrationDashboard/stats'),
        fetchWithAuth('/api/AdministrationDashboard/finance'),
        fetchWithAuth('/api/AdministrationDashboard/library'),
        fetchWithAuth('/api/AdministrationDashboard/helpdesk'),
        fetchWithAuth('/api/AdministrationDashboard/events'),
        fetchWithAuth('/api/AdministrationDashboard/reports'),
        fetchWithAuth('/api/AdministrationDashboard/logs')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (financeRes.ok) setFinanceData(await financeRes.json());
      if (libraryRes.ok) setLibraryData(await libraryRes.json());
      if (ticketsRes.ok) setHelpdeskTickets(await ticketsRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (reportsRes.ok) setReportDefinitions(await reportsRes.json());
      if (logsRes.ok) setSystemLogs(await logsRes.json());

    } catch (error) {
      console.error('Error fetching administration data:', error);
      toast.error('Failed to load some dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, onClick: () => setActiveView('overview') },
    { name: 'Admissions - Fee Verification', icon: UserPlus, onClick: () => setActiveView('admissions') },
    { name: 'Finance & Fees', icon: DollarSign, onClick: () => setActiveView('finance') },
    { name: 'Library Management', icon: BookOpen, onClick: () => setActiveView('library') },
    { name: 'Helpdesk', icon: HelpCircle, onClick: () => setActiveView('helpdesk') },
    { name: 'Events & Facilities', icon: Calendar, onClick: () => setActiveView('events') },
    { name: 'System Logs', icon: Activity, onClick: () => setActiveView('logs') },
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
          <h1 className="text-gray-900 mb-2">Administration Dashboard</h1>
          <p className="text-gray-600">Non-Academic Services Management</p>
        </div>

        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <DollarSign className="w-10 h-10 text-green-600 mb-4" />
                  <p className="text-sm text-gray-600">Fee Collection (This Month)</p>
                  <p className="text-gray-900">PKR {stats?.feeCollection || '0'}M</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <BookOpen className="w-10 h-10 text-blue-600 mb-4" />
                  <p className="text-sm text-gray-600">Library Books Issued</p>
                  <p className="text-gray-900">{stats?.libraryBooksIssued || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <HelpCircle className="w-10 h-10 text-purple-600 mb-4" />
                  <p className="text-sm text-gray-600">Active Support Tickets</p>
                  <p className="text-gray-900">{stats?.activeTickets || '0'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Calendar className="w-10 h-10 text-orange-600 mb-4" />
                  <p className="text-sm text-gray-600">Upcoming Events</p>
                  <p className="text-gray-900">{stats?.upcomingEvents || '0'}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('finance')}>
                <CardContent className="pt-6 text-center">
                  <DollarSign className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-gray-900 mb-2">Finance & Accounts</h3>
                  <p className="text-sm text-gray-600">Manage fees, payments, and financial reports</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('library')}>
                <CardContent className="pt-6 text-center">
                  <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-gray-900 mb-2">Library Management</h3>
                  <p className="text-sm text-gray-600">Manage book inventory and issuance</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('helpdesk')}>
                <CardContent className="pt-6 text-center">
                  <HelpCircle className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-gray-900 mb-2">Helpdesk & Support</h3>
                  <p className="text-sm text-gray-600">Handle student queries and support tickets</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('events')}>
                <CardContent className="pt-6 text-center">
                  <Calendar className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                  <h3 className="text-gray-900 mb-2">Events & Facilities</h3>
                  <p className="text-sm text-gray-600">Manage campus events and facilities</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeView === 'admissions' && (
          <AdmissionManagement role="accountant" userId={user.id} userName={user.name} />
        )}
        {activeView === 'finance' && (
          <Tabs defaultValue="challans">
            <TabsList>
              <TabsTrigger value="challans">Fee Challans</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="challans" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Generate Fee Challans</CardTitle>
                    <Button>Generate Bulk Challans</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm mb-2">Student ID</label>
                        <input type="text" className="w-full p-2 border rounded-md" placeholder="Enter student ID" />
                      </div>
                      <div>
                        <label className="block text-sm mb-2">Semester</label>
                        <select className="w-full p-2 border rounded-md">
                          <option>Fall 2024</option>
                          <option>Spring 2025</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-2">Amount</label>
                        <input type="number" className="w-full p-2 border rounded-md" placeholder="PKR" />
                      </div>
                    </div>
                    <Button>Generate Challan</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financeData.length > 0 ? (
                        financeData.map((payment: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{payment.studentId || 'N/A'}</TableCell>
                            <TableCell>PKR {payment.amountPaid?.toLocaleString()}</TableCell>
                            <TableCell>{payment.paymentDate}</TableCell>
                            <TableCell><Badge>Paid</Badge></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-gray-500">No payment data available</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scholarships" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Scholarship Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Sample Student</TableCell>
                        <TableCell>Merit-Based</TableCell>
                        <TableCell>100%</TableCell>
                        <TableCell><Badge>Active</Badge></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reportDefinitions.map((report: any, i: number) => (
                      <div key={report.id || i} className="p-4 border rounded-lg flex justify-between items-center">
                        <span className="text-gray-900">{report.description}</span>
                        <Button size="sm" variant="outline" onClick={() => toast.success(`Generating ${report.description}...`)}>
                          Generate
                        </Button>
                      </div>
                    ))}
                    {reportDefinitions.length === 0 && (
                      <div className="col-span-full py-8 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        <p>Loading report definitions...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {activeView === 'library' && (
          <Tabs defaultValue="inventory">
            <TabsList>
              <TabsTrigger value="inventory">Book Inventory</TabsTrigger>
              <TabsTrigger value="issuance">Issue/Return</TabsTrigger>
              <TabsTrigger value="fines">Fines</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Library Books</CardTitle>
                    <Button>Add New Book</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>ISBN</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {libraryData.length > 0 ? (
                        libraryData.map((book: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{book.title}</TableCell>
                            <TableCell>{book.author}</TableCell>
                            <TableCell>{book.isbn}</TableCell>
                            <TableCell>
                              <Badge variant={book.isAvailable ? 'default' : 'secondary'}>
                                {book.isAvailable ? 'Available' : 'Issued'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-gray-500">No library data available</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {activeView === 'helpdesk' && (
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {helpdeskTickets.length > 0 ? (
                    helpdeskTickets.map((ticket: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>TKT-{ticket.id}</TableCell>
                        <TableCell>{ticket.createdBy?.firstName || 'N/A'}</TableCell>
                        <TableCell>{ticket.category}</TableCell>
                        <TableCell>{ticket.title}</TableCell>
                        <TableCell>
                          <Badge variant={ticket.status === 'Open' ? 'secondary' : 'default'}>{ticket.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">Resolve</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">No support tickets found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === 'events' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Campus Events & Facilities</CardTitle>
                <Button>Create Event</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length > 0 ? (
                    events.map((ev: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{ev.title}</TableCell>
                        <TableCell>{ev.date}</TableCell>
                        <TableCell>{ev.venue}</TableCell>
                        <TableCell><Badge>Scheduled</Badge></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-gray-500">No campus events scheduled</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeView === 'logs' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>System Activity Logs</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchAllAdminData}>
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
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemLogs.length > 0 ? (
                    systemLogs.map((log, i) => (
                      <TableRow key={i}>
                        <TableCell>{log.time}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.ip}</TableCell>
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
      </div>
    </DashboardLayout>
  );
}
