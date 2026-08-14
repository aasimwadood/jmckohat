import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle, XCircle, Eye, AlertTriangle, TrendingUp, GraduationCap, FileText, DollarSign, Loader2 } from "lucide-react";
import { fetchWithAuth } from "../utils/api";
import { toast } from "sonner";
import { Checkbox } from "./ui/checkbox";

interface Course {
  id: number;
  code: string;
  title: string;
  credits: number;
}

interface PromotionStudent {
  id: string;
  studentId: string;
  registrationNumber: string;
  fullName: string;
  department: string;
  program: string;
  currentSemester: number;
  cgpa: number;
  academicStanding: string;
  eligibleForPromotion: boolean;
  maxCourses: number;
  registeredCourses: string[];
  feeStatus: "Pending" | "Paid";
  promotionStatus: string;
}

interface PromotionManagementProps {
  role: string;
  userId?: string;
  userName?: string;
  department?: string;
}

// MOCK DATA FOR TESTING - Use this until your API is ready
const MOCK_STUDENTS: PromotionStudent[] = [
  {
    id: "1",
    studentId: "1a5c219e-7b8a-4f6e-852f-82686ec4d94c",
    registrationNumber: "REG-2025-1001",
    fullName: "Zahid",
    department: "Computer Science",
    program: "BS Computer Science",
    currentSemester: 2,
    cgpa: 3.45,
    academicStanding: "Good Standing",
    eligibleForPromotion: true,
    maxCourses: 6,
    registeredCourses: [],
    feeStatus: "Pending",
    promotionStatus: "Pending Registration"
  },
  {
    id: "2",
    studentId: "c3619741-fa6a-47a0-906b-3127075b91a2",
    registrationNumber: "REG-2025-1003",
    fullName: "Umama",
    department: "Computer Science",
    program: "BS Computer Science",
    currentSemester: 3,
    cgpa: 2.9,
    academicStanding: "Probation",
    eligibleForPromotion: false,
    maxCourses: 4,
    registeredCourses: ["CS-301", "CS-302"],
    feeStatus: "Paid",
    promotionStatus: "Registration Complete"
  },
  {
    id: "3",
    studentId: "ec413a12-b652-48ff-a38f-648d3c46ff62",
    registrationNumber: "REG-2025-1004",
    fullName: "Anum Noor",
    department: "Zoology",
    program: "BS Zoology",
    currentSemester: 2,
    cgpa: 3.75,
    academicStanding: "Honors",
    eligibleForPromotion: true,
    maxCourses: 6,
    registeredCourses: ["CS-301", "CS-302", "CS-303"],
    feeStatus: "Paid",
    promotionStatus: "Promoted"
  },
  {
    id: "4",
    studentId: "be9d22c0-bfe9-4a5b-90b1-7ac5cd9f57bd",
    registrationNumber: "REG-2025-1005",
    fullName: "Salma Ahmed",
    department: "Mathematics",
    program: "BS Mathematics",
    currentSemester: 4,
    cgpa: 3.2,
    academicStanding: "Good Standing",
    eligibleForPromotion: true,
    maxCourses: 6,
    registeredCourses: [],
    feeStatus: "Pending",
    promotionStatus: "Pending Registration"
  },
  {
    id: "5",
    studentId: "665857dc-abf3-4a92-83bb-840e1cf5ac28",
    registrationNumber: "REG-2025-1006",
    fullName: "Sidra",
    department: "Zoology",
    program: "BS Zoology",
    currentSemester: 2,
    cgpa: 1.8,
    academicStanding: "Academic Warning",
    eligibleForPromotion: false,
    maxCourses: 3,
    registeredCourses: [],
    feeStatus: "Pending",
    promotionStatus: "Pending Registration"
  },
  {
    id: "6",
    studentId: "f6c93880-ef7b-438e-bf42-9499ddf23819",
    registrationNumber: "REG-2025-1007",
    fullName: "Jasim",
    department: "Economics",
    program: "BS Economics",
    currentSemester: 3,
    cgpa: 3.6,
    academicStanding: "Dean's List",
    eligibleForPromotion: true,
    maxCourses: 6,
    registeredCourses: ["ECO-401", "ECO-402"],
    feeStatus: "Paid",
    promotionStatus: "Promoted"
  }
];

const MOCK_COURSES: Course[] = [
  { id: 1, code: "CS-301", title: "Data Structures", credits: 3 },
  { id: 2, code: "CS-302", title: "Operating Systems", credits: 3 },
  { id: 3, code: "CS-303", title: "Database Systems", credits: 4 },
  { id: 4, code: "CS-304", title: "Software Engineering", credits: 3 },
  { id: 5, code: "CS-305", title: "Computer Networks", credits: 3 },
  { id: 6, code: "MATH-301", title: "Linear Algebra", credits: 3 },
  { id: 7, code: "STAT-301", title: "Probability & Statistics", credits: 3 },
];

export function PromotionManagement({ role, userId, userName, department }: PromotionManagementProps) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<PromotionStudent[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<PromotionStudent | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [feeReceiptNumber, setFeeReceiptNumber] = useState("");
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [department]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const studentsUrl = department 
        ? `/api/PromotionManagement/students?department=${encodeURIComponent(department)}`
        : '/api/PromotionManagement/students';
      
      console.log("Fetching students from:", studentsUrl);
      
      const [studentsRes, coursesRes] = await Promise.all([
        fetchWithAuth(studentsUrl),
        fetchWithAuth('/api/Courses')
      ]);
      
      // Handle students response
      if (studentsRes.ok) {
        const allStudents = await studentsRes.json();
        console.log("Students API response:", allStudents);
        
        if (allStudents && allStudents.length > 0) {
          let filteredStudents = allStudents;
          
          // Filter by department if HOD
          if (role === "hod" && department) {
            filteredStudents = allStudents.filter((s: any) => {
              const studentDept = s.department?.trim().toLowerCase();
              const targetDept = department.trim().toLowerCase();
              return !studentDept || studentDept === "not assigned" || studentDept === targetDept;
            });
          }
          setStudents(filteredStudents);
          setUseMockData(false);
        } else {
          // If API returns empty array, use mock data
          console.warn("API returned empty students array, using mock data");
          setStudents(getFilteredMockStudents());
          setUseMockData(true);
          toast.info("Using demo data - API returned no students");
        }
      } else {
        console.error(`API Error ${studentsRes.status}: ${studentsRes.statusText}`);
        // Use mock data as fallback
        setStudents(getFilteredMockStudents());
        setUseMockData(true);
        toast.warning(`Using demo data - API error: ${studentsRes.statusText}`);
      }
      
      // Handle courses response
      if (coursesRes.ok) {
        const courses = await coursesRes.json();
        console.log("Courses API response:", courses);
        
        if (courses && courses.length > 0) {
          // Map course data to match our interface
          const mappedCourses = courses.map((c: any) => ({
            id: c.id,
            code: c.code || c.courseCode,
            title: c.title || c.name || c.courseName,
            credits: c.credits || c.creditHours || c.credit
          }));
          setAvailableCourses(mappedCourses);
        } else {
          setAvailableCourses(MOCK_COURSES);
        }
      } else {
        console.error(`Courses API Error ${coursesRes.status}: ${coursesRes.statusText}`);
        setAvailableCourses(MOCK_COURSES);
      }
      
    } catch (error) {
      console.error("Error fetching promotion data:", error);
      // Use mock data on network error
      setStudents(getFilteredMockStudents());
      setAvailableCourses(MOCK_COURSES);
      setUseMockData(true);
      toast.error("Network error - using demo data");
    } finally {
      setLoading(false);
    }
  };
  
  const getFilteredMockStudents = () => {
    if (department && role === "hod") {
      return MOCK_STUDENTS.filter(s => 
        s.department.toLowerCase() === department.toLowerCase()
      );
    }
    return MOCK_STUDENTS;
  };

  const handleRegisterCourses = async () => {
    if (!selectedStudent || selectedCourses.length === 0) {
      toast.error("Please select at least one course");
      return;
    }
    
    try {
      const res = await fetchWithAuth('/api/PromotionManagement/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.studentId,
          currentSemester: selectedStudent.currentSemester,
          courseCodes: selectedCourses
        })
      });
      
      if (res.ok) {
        toast.success(`Courses registered for ${selectedStudent.fullName}`);
        await fetchInitialData(); // Refresh data
        setIsRegisterDialogOpen(false);
        setSelectedCourses([]);
      } else {
        // Fallback: update local state
        const updatedStudents = students.map(s => {
          if (s.id === selectedStudent.id) {
            return {
              ...s,
              registeredCourses: selectedCourses,
              promotionStatus: "Registration Complete"
            };
          }
          return s;
        });
        setStudents(updatedStudents);
        toast.success(`Courses registered for ${selectedStudent.fullName} (Demo mode)`);
        setIsRegisterDialogOpen(false);
        setSelectedCourses([]);
      }
    } catch (error) {
      // Local update as fallback
      const updatedStudents = students.map(s => {
        if (s.id === selectedStudent.id) {
          return {
            ...s,
            registeredCourses: selectedCourses,
            promotionStatus: "Registration Complete"
          };
        }
        return s;
      });
      setStudents(updatedStudents);
      toast.success(`Courses registered for ${selectedStudent.fullName} (Demo mode)`);
      setIsRegisterDialogOpen(false);
      setSelectedCourses([]);
    }
  };

  const handleVerifyFee = async () => {
    if (!selectedStudent || !feeReceiptNumber) {
      toast.error("Please enter receipt number");
      return;
    }
    
    try {
      const res = await fetchWithAuth(`/api/PromotionManagement/${selectedStudent.id}/verify-fee`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptNumber: feeReceiptNumber, verifiedBy: userId })
      });
      
      if (res.ok) {
        toast.success("Fee verified and student promoted!");
        await fetchInitialData();
        setIsFeeDialogOpen(false);
        setFeeReceiptNumber("");
      } else {
        // Fallback: update local state
        const updatedStudents = students.map(s => {
          if (s.id === selectedStudent.id) {
            return {
              ...s,
              feeStatus: "Paid" as const,
              promotionStatus: "Promoted",
              currentSemester: s.currentSemester + 1
            };
          }
          return s;
        });
        setStudents(updatedStudents);
        toast.success("Fee verified and student promoted! (Demo mode)");
        setIsFeeDialogOpen(false);
        setFeeReceiptNumber("");
      }
    } catch (error) {
      // Local update as fallback
      const updatedStudents = students.map(s => {
        if (s.id === selectedStudent.id) {
          return {
            ...s,
            feeStatus: "Paid" as const,
            promotionStatus: "Promoted",
            currentSemester: s.currentSemester + 1
          };
        }
        return s;
      });
      setStudents(updatedStudents);
      toast.success("Fee verified and student promoted! (Demo mode)");
      setIsFeeDialogOpen(false);
      setFeeReceiptNumber("");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading students...</span>
      </div>
    );
  }

  // Show message if no students
  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Students Found</h3>
          <p className="text-muted-foreground text-center mt-2">
            No students are available for promotion management.
            {department && ` Department: ${department}`}
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => fetchInitialData()}
          >
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStandingBadge = (standing: string) => {
    const standingLower = standing.toLowerCase();
    if (standingLower.includes("good") || standingLower === "pass" || standingLower === "honors" || standingLower === "dean's list") {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />{standing}</Badge>;
    }
    if (standingLower.includes("probation") || standingLower === "academic warning") {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><AlertTriangle className="h-3 w-3 mr-1" />{standing}</Badge>;
    }
    if (standingLower.includes("cease")) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" />{standing}</Badge>;
    }
    return <Badge>{standing}</Badge>;
  };

  const getPromotionStatusBadge = (status: string) => {
    switch (status) {
      case "Pending Registration":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Pending Registration</Badge>;
      case "Registration Complete":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Registration Complete</Badge>;
      case "Pending Fee":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending Fee</Badge>;
      case "Promoted":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Promoted</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleCourseToggle = (courseCode: string) => {
    if (selectedCourses.includes(courseCode)) {
      setSelectedCourses(selectedCourses.filter(c => c !== courseCode));
    } else {
      if (selectedStudent && selectedCourses.length >= selectedStudent.maxCourses) {
        toast.error(`Maximum ${selectedStudent.maxCourses} courses allowed for ${selectedStudent.academicStanding} status`);
        return;
      }
      setSelectedCourses([...selectedCourses, courseCode]);
    }
  };

  const handleConfirmPromotion = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          currentSemester: s.currentSemester + 1,
          promotionStatus: "Pending Registration",
          registeredCourses: [],
          feeStatus: "Pending" as const
        };
      }
      return s;
    });

    setStudents(updatedStudents);
    toast.success(`${student.fullName} promoted to Semester ${student.currentSemester + 1}`);
  };

  return (
    <div className="space-y-6">
      {useMockData && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Using demo data. The API is not responding or returned no data. 
            <Button variant="link" size="sm" onClick={() => fetchInitialData()} className="h-auto p-0 ml-2">
              Retry connection
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.filter(s => s.eligibleForPromotion).length}</div>
            <p className="text-xs text-muted-foreground">For next semester</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Probation/Warning</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.filter(s => 
              s.academicStanding.toLowerCase().includes("probation") || 
              s.academicStanding.toLowerCase().includes("warning")
            ).length}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Fee</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.filter(s => s.feeStatus === "Pending").length}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promoted</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.filter(s => s.promotionStatus === "Promoted").length}</div>
            <p className="text-xs text-muted-foreground">Successfully promoted</p>
          </CardContent>
        </Card>
      </div>

      {/* Promotion List - Rest of your table rendering code remains the same */}
      <Card>
        <CardHeader>
          <CardTitle>Student Promotion Management</CardTitle>
          <CardDescription>Manage course registration and semester promotions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({students.length})</TabsTrigger>
              <TabsTrigger value="pending-reg">Pending Registration ({students.filter(s => s.promotionStatus === "Pending Registration").length})</TabsTrigger>
              <TabsTrigger value="pending-fee">Pending Fee ({students.filter(s => s.promotionStatus === "Pending Fee" || s.promotionStatus === "Registration Complete").length})</TabsTrigger>
              <TabsTrigger value="promoted">Promoted ({students.filter(s => s.promotionStatus === "Promoted").length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reg. No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Current Sem.</TableHead>
                      <TableHead>CGPA</TableHead>
                      <TableHead>Standing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.registrationNumber}</TableCell>
                        <TableCell>{student.fullName}</TableCell>
                        <TableCell>{student.currentSemester}</TableCell>
                        <TableCell>
                          <span className={student.cgpa < 2.0 ? "text-red-600 font-semibold" : student.cgpa < 2.5 ? "text-yellow-600" : "text-green-600"}>
                            {student.cgpa.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>{getStandingBadge(student.academicStanding)}</TableCell>
                        <TableCell>{getPromotionStatusBadge(student.promotionStatus)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(role === "student" || role === "faculty" || role === "hod") && student.promotionStatus === "Pending Registration" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setSelectedCourses(student.registeredCourses);
                                  setIsRegisterDialogOpen(true);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Register
                              </Button>
                            )}
                            {role === "accountant" && (student.promotionStatus === "Pending Fee" || student.promotionStatus === "Registration Complete") && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setIsFeeDialogOpen(true);
                                }}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Verify Fee
                              </Button>
                            )}
                            {(role === "hod" || role === "department") && student.promotionStatus === "Promoted" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConfirmPromotion(student.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Confirm
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* Rest of your tabs (pending-reg, pending-fee, promoted) remain the same */}
            <TabsContent value="pending-reg">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reg. No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Current Sem.</TableHead>
                      <TableHead>Standing</TableHead>
                      <TableHead>Max Courses</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.filter(s => s.promotionStatus === "Pending Registration").map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.registrationNumber}</TableCell>
                        <TableCell>{student.fullName}</TableCell>
                        <TableCell>{student.currentSemester}</TableCell>
                        <TableCell>{getStandingBadge(student.academicStanding)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{student.maxCourses} courses</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student);
                              setSelectedCourses(student.registeredCourses);
                              setIsRegisterDialogOpen(true);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Register Courses
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pending-fee">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reg. No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Courses Registered</TableHead>
                      <TableHead>Fee Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.filter(s => s.promotionStatus === "Pending Fee" || s.promotionStatus === "Registration Complete").map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.registrationNumber}</TableCell>
                        <TableCell>{student.fullName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{student.registeredCourses.length} courses</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            {student.feeStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {role === "accountant" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsFeeDialogOpen(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Verify Fee
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="promoted">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reg. No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Current Sem.</TableHead>
                      <TableHead>Standing</TableHead>
                      <TableHead>Fee Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.filter(s => s.promotionStatus === "Promoted").map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.registrationNumber}</TableCell>
                        <TableCell>{student.fullName}</TableCell>
                        <TableCell>{student.currentSemester}</TableCell>
                        <TableCell>{getStandingBadge(student.academicStanding)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            {student.feeStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Keep your dialogs as they are */}
      {/* Course Registration Dialog */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register Courses</DialogTitle>
            <DialogDescription>
              Select courses for {selectedStudent?.fullName} - Semester {selectedStudent ? selectedStudent.currentSemester + 1 : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Academic Standing:</strong> {selectedStudent.academicStanding}</p>
                    <p><strong>Maximum Courses Allowed:</strong> {selectedStudent.maxCourses}</p>
                    <p><strong>Current CGPA:</strong> {selectedStudent.cgpa.toFixed(2)}</p>
                    {selectedStudent.academicStanding !== "Good Standing" && selectedStudent.academicStanding !== "Honors" && selectedStudent.academicStanding !== "Dean's List" && (
                      <p className="text-yellow-600 mt-2">⚠️ Student is on {selectedStudent.academicStanding} status</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Available Courses for Semester {selectedStudent.currentSemester + 1}</Label>
                <ScrollArea className="h-[300px] border rounded-md p-4">
                  <div className="space-y-3">
                    {availableCourses.map((course) => (
                      <div key={course.id} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-gray-50">
                        <Checkbox
                          id={course.code}
                          checked={selectedCourses.includes(course.code)}
                          onCheckedChange={() => handleCourseToggle(course.code)}
                          disabled={!selectedCourses.includes(course.code) && selectedCourses.length >= selectedStudent.maxCourses}
                        />
                        <div className="flex-1">
                          <Label htmlFor={course.code} className="cursor-pointer">
                            <div>{course.code} - {course.title}</div>
                            <div className="text-sm text-muted-foreground">Credit Hours: {course.credits}</div>
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedCourses.length} / {selectedStudent.maxCourses} courses
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegisterDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRegisterCourses}>Register Courses</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Student Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Promotion Details</DialogTitle>
            <DialogDescription>Complete information about student's promotion status</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Registration Number</Label>
                  <p>{selectedStudent.registrationNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Full Name</Label>
                  <p>{selectedStudent.fullName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Department</Label>
                  <p>{selectedStudent.department}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Program</Label>
                  <p>{selectedStudent.program}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Current Semester</Label>
                  <p>{selectedStudent.currentSemester}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CGPA</Label>
                  <p className={selectedStudent.cgpa < 2.0 ? "text-red-600" : selectedStudent.cgpa < 2.5 ? "text-yellow-600" : "text-green-600"}>
                    {selectedStudent.cgpa.toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Academic Standing</Label>
                  <div className="mt-1">{getStandingBadge(selectedStudent.academicStanding)}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Promotion Status</Label>
                <div className="mt-1">{getPromotionStatusBadge(selectedStudent.promotionStatus)}</div>
              </div>

              {selectedStudent.registeredCourses.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Registered Courses</Label>
                  <div className="mt-2 space-y-2">
                    {selectedStudent.registeredCourses.map((courseCode, index) => {
                      const course = availableCourses.find(c => c.code === courseCode);
                      return (
                        <div key={index} className="flex justify-between border p-2 rounded">
                          <span>{courseCode} - {course?.title || "Course"}</span>
                          <Badge variant="outline">{course?.credits || 3} CH</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Fee Status</Label>
                  <Badge variant="outline" className={selectedStudent.feeStatus === "Paid" ? "bg-green-50 text-green-700 border-green-300" : "bg-yellow-50 text-yellow-700 border-yellow-300"}>
                    {selectedStudent.feeStatus}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Maximum Courses Allowed</Label>
                  <p>{selectedStudent.maxCourses} courses</p>
                </div>
              </div>

              {selectedStudent.academicStanding !== "Good Standing" && selectedStudent.academicStanding !== "Honors" && selectedStudent.academicStanding !== "Dean's List" && selectedStudent.academicStanding !== "Pass" && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Student is on <strong>{selectedStudent.academicStanding}</strong> status. 
                    {selectedStudent.academicStanding === "Ceased" && " Can only register maximum 3 courses."}
                    {selectedStudent.academicStanding === "2nd Probation" && " This is the final warning."}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee Verification Dialog */}
      <Dialog open={isFeeDialogOpen} onOpenChange={setIsFeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Semester Fee</DialogTitle>
            <DialogDescription>Record fee payment for {selectedStudent?.fullName}</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>Tuition Fee:</span><span>PKR 15,000</span></div>
                    <div className="flex justify-between"><span>Examination Fee:</span><span>PKR 4,000</span></div>
                    <div className="flex justify-between"><span>Lab Fee:</span><span>PKR 2,000</span></div>
                    <div className="flex justify-between border-t mt-2 pt-2"><span>Total:</span><span>PKR 21,000</span></div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="feeReceipt">Fee Receipt Number *</Label>
                <Input
                  id="feeReceipt"
                  value={feeReceiptNumber}
                  onChange={(e) => setFeeReceiptNumber(e.target.value)}
                  placeholder="FEE-2024-XXX"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-900">
                  After fee verification, the student will be automatically promoted to Semester {selectedStudent.currentSemester + 1}.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleVerifyFee}>Verify & Promote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}