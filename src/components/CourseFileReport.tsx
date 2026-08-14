import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Download, Printer, Eye } from 'lucide-react';
import { toast } from 'sonner';
import logo from '../assets/image/logo.png';

export default function CourseFileReport() {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const courses = [
    { code: 'CS-301', name: 'Data Structures & Algorithms' },
    { code: 'CS-302', name: 'Database Systems' },
    { code: 'CS-303', name: 'Web Development' },
    { code: 'CS-304', name: 'Software Engineering' },
  ];

  const courseData = {
    courseCode: 'CS-301',
    courseName: 'Data Structures & Algorithms',
    creditHours: 3,
    semester: 'Fall 2024',
    faculty: 'Dr. Hassan Ahmed',
    department: 'Computer Science',
    
    // Course Learning Outcomes
    clos: [
      'Understand and analyze different data structures',
      'Implement algorithms for searching and sorting',
      'Apply appropriate data structures to solve problems',
      'Evaluate time and space complexity of algorithms',
    ],

    // Course Contents
    contents: [
      { week: 1, topic: 'Introduction to Data Structures', hours: 3, clo: '1' },
      { week: 2, topic: 'Arrays and Linked Lists', hours: 3, clo: '1,2' },
      { week: 3, topic: 'Stacks and Queues', hours: 3, clo: '1,2' },
      { week: 4, topic: 'Trees - Binary Trees', hours: 3, clo: '1,2,3' },
      { week: 5, topic: 'Trees - BST and AVL', hours: 3, clo: '1,2,3' },
      { week: 6, topic: 'Graphs - Representation', hours: 3, clo: '1,2,3' },
      { week: 7, topic: 'Graphs - Traversal Algorithms', hours: 3, clo: '2,3,4' },
      { week: 8, topic: 'Mid-Term Examination', hours: 3, clo: 'All' },
      { week: 9, topic: 'Sorting Algorithms - Bubble, Selection', hours: 3, clo: '2,3,4' },
      { week: 10, topic: 'Sorting Algorithms - Quick, Merge', hours: 3, clo: '2,3,4' },
      { week: 11, topic: 'Searching Algorithms', hours: 3, clo: '2,3,4' },
      { week: 12, topic: 'Hashing Techniques', hours: 3, clo: '2,3,4' },
      { week: 13, topic: 'Algorithm Complexity Analysis', hours: 3, clo: '4' },
      { week: 14, topic: 'Dynamic Programming', hours: 3, clo: '3,4' },
      { week: 15, topic: 'Review and Practice', hours: 3, clo: 'All' },
      { week: 16, topic: 'Final Examination', hours: 3, clo: 'All' },
    ],

    // Assessment Plan
    assessmentPlan: [
      { component: 'Quizzes', weightage: 15, clo: '1,2,3,4' },
      { component: 'Assignments', weightage: 15, clo: '2,3,4' },
      { component: 'Mid-Term Exam', weightage: 30, clo: '1,2,3' },
      { component: 'Final Exam', weightage: 40, clo: '1,2,3,4' },
    ],

    // Reference Books
    books: [
      { title: 'Data Structures and Algorithm Analysis in C++', author: 'Mark Allen Weiss', type: 'Main' },
      { title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest, Stein', type: 'Reference' },
      { title: 'Data Structures Using C and C++', author: 'Yedidyah Langsam', type: 'Reference' },
    ],

    // Student Performance
    studentPerformance: {
      enrolled: 45,
      passed: 42,
      failed: 3,
      passPercentage: 93.3,
      averageMarks: 78.5,
      distribution: {
        'A': 12,
        'B': 18,
        'C': 12,
        'D': 0,
        'F': 3,
      }
    },

    // CLO Attainment
    cloAttainment: [
      { clo: 'CLO-1', target: 70, achieved: 82, status: 'Achieved' },
      { clo: 'CLO-2', target: 70, achieved: 78, status: 'Achieved' },
      { clo: 'CLO-3', target: 70, achieved: 75, status: 'Achieved' },
      { clo: 'CLO-4', target: 70, achieved: 68, status: 'Not Achieved' },
    ],

    // Teaching Methods
    teachingMethods: [
      'Lectures with multimedia presentations',
      'Hands-on lab sessions',
      'Problem-solving workshops',
      'Peer learning activities',
      'Online quizzes and assignments',
    ],

    // Lab Work
    labs: [
      { labNo: 1, title: 'Arrays and Pointers', duration: 3 },
      { labNo: 2, title: 'Linked List Implementation', duration: 3 },
      { labNo: 3, title: 'Stack and Queue Operations', duration: 3 },
      { labNo: 4, title: 'Binary Tree Traversal', duration: 3 },
      { labNo: 5, title: 'Graph Algorithms', duration: 3 },
      { labNo: 6, title: 'Sorting Algorithms', duration: 3 },
      { labNo: 7, title: 'Searching Algorithms', duration: 3 },
      { labNo: 8, title: 'Final Project', duration: 3 },
    ],

    // Attendance Report
    attendanceReport: {
      totalClasses: 48,
      avgAttendance: 82.5,
      studentAttendance: [
        { studentId: '2021-CS-101', name: 'Ahmed Khan', present: 42, total: 48, percentage: 87.5 },
        { studentId: '2021-CS-102', name: 'Sara Ali', present: 45, total: 48, percentage: 93.75 },
        { studentId: '2021-CS-103', name: 'Hassan Mahmood', present: 38, total: 48, percentage: 79.17 },
        { studentId: '2021-CS-104', name: 'Ayesha Khan', present: 46, total: 48, percentage: 95.83 },
        { studentId: '2021-CS-105', name: 'Usman Tariq', present: 40, total: 48, percentage: 83.33 },
      ]
    }
  };

  const generatePDF = () => {
    toast.success('Generating Course File Report PDF...');
    setTimeout(() => {
      toast.success('Course File Report downloaded successfully!');
    }, 1500);
  };

  const printReport = () => {
    toast.success('Preparing report for printing...');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const renderPreview = () => (
    <div className="bg-white p-8 space-y-8 print:p-4" id="course-file-report">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-300 pb-6">
        <div className="flex items-center justify-center gap-6 mb-4">
          <img src={logo} alt="GPGC Kohat" className="w-20 h-20 object-contain" />
          <div>
            <h1 className="text-3xl text-gray-900 mb-1">Government Postgraduate College Kohat</h1>
            <p className="text-lg text-gray-700">Department of {courseData.department}</p>
            <p className="text-gray-600">Course File Report - {courseData.semester}</p>
          </div>
        </div>
      </div>

      {/* Course Information */}
      <div>
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">Course Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Course Code</p>
            <p className="text-gray-900">{courseData.courseCode}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Course Name</p>
            <p className="text-gray-900">{courseData.courseName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Credit Hours</p>
            <p className="text-gray-900">{courseData.creditHours}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Faculty Member</p>
            <p className="text-gray-900">{courseData.faculty}</p>
          </div>
        </div>
      </div>

      {/* Course Learning Outcomes */}
      <div>
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">Course Learning Outcomes (CLOs)</h2>
        <ol className="list-decimal list-inside space-y-2">
          {courseData.clos.map((clo, idx) => (
            <li key={idx} className="text-gray-700">{clo}</li>
          ))}
        </ol>
      </div>

      {/* Course Contents */}
      <div>
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">Course Contents</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Week</TableHead>
              <TableHead>Topics Covered</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>CLO Mapped</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courseData.contents.map((content, idx) => (
              <TableRow key={idx}>
                <TableCell>{content.week}</TableCell>
                <TableCell>{content.topic}</TableCell>
                <TableCell>{content.hours}</TableCell>
                <TableCell>{content.clo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Assessment Plan */}
      <div className="page-break-before">
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">Assessment Plan</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assessment Component</TableHead>
              <TableHead>Weightage (%)</TableHead>
              <TableHead>CLO Assessed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courseData.assessmentPlan.map((assessment, idx) => (
              <TableRow key={idx}>
                <TableCell>{assessment.component}</TableCell>
                <TableCell>{assessment.weightage}%</TableCell>
                <TableCell>{assessment.clo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reference Books */}
      <div>
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">Reference Material</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Book Title</TableHead>
              <TableHead>Author(s)</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courseData.books.map((book, idx) => (
              <TableRow key={idx}>
                <TableCell>{book.title}</TableCell>
                <TableCell>{book.author}</TableCell>
                <TableCell>{book.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Teaching Methods */}
      <div>
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">Teaching Methodology</h2>
        <ul className="list-disc list-inside space-y-2">
          {courseData.teachingMethods.map((method, idx) => (
            <li key={idx} className="text-gray-700">{method}</li>
          ))}
        </ul>
      </div>

      {/* Lab Work */}
      <div className="page-break-before">
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">Laboratory Work</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lab No.</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Duration (Hours)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courseData.labs.map((lab, idx) => (
              <TableRow key={idx}>
                <TableCell>{lab.labNo}</TableCell>
                <TableCell>{lab.title}</TableCell>
                <TableCell>{lab.duration}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Student Performance */}
      <div>
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">Student Performance Analysis</h2>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Overall Statistics</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700">Total Enrolled:</span>
                <span className="text-gray-900">{courseData.studentPerformance.enrolled}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Passed:</span>
                <span className="text-green-600">{courseData.studentPerformance.passed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Failed:</span>
                <span className="text-red-600">{courseData.studentPerformance.failed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Pass Percentage:</span>
                <span className="text-gray-900">{courseData.studentPerformance.passPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Average Marks:</span>
                <span className="text-gray-900">{courseData.studentPerformance.averageMarks}%</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Grade Distribution</p>
            <div className="space-y-2">
              {Object.entries(courseData.studentPerformance.distribution).map(([grade, count]) => (
                <div key={grade} className="flex justify-between items-center">
                  <span className="text-gray-700">Grade {grade}:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          grade === 'A' ? 'bg-green-500' :
                          grade === 'B' ? 'bg-blue-500' :
                          grade === 'C' ? 'bg-yellow-500' :
                          grade === 'D' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${(count / courseData.studentPerformance.enrolled) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-gray-900 w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CLO Attainment */}
      <div>
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">CLO Attainment Analysis</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CLO</TableHead>
              <TableHead>Target (%)</TableHead>
              <TableHead>Achieved (%)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courseData.cloAttainment.map((clo, idx) => (
              <TableRow key={idx}>
                <TableCell>{clo.clo}</TableCell>
                <TableCell>{clo.target}%</TableCell>
                <TableCell>{clo.achieved}%</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    clo.status === 'Achieved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {clo.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Attendance Report */}
      <div>
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">Attendance Report</h2>
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Classes Conducted</p>
              <p className="text-gray-900">{courseData.attendanceReport.totalClasses}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Attendance</p>
              <p className="text-gray-900">{courseData.attendanceReport.avgAttendance}%</p>
            </div>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Present</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Percentage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courseData.attendanceReport.studentAttendance.map((student, idx) => (
              <TableRow key={idx}>
                <TableCell>{student.studentId}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.present}</TableCell>
                <TableCell>{student.total}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    student.percentage >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {student.percentage.toFixed(2)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Recommendations */}
      <div className="page-break-before">
        <h2 className="text-2xl text-gray-900 mb-4 border-b pb-2">Recommendations for Improvement</h2>
        <div className="space-y-3">
          <div>
            <h3 className="text-lg text-gray-900 mb-2">CLO-4 Enhancement</h3>
            <p className="text-gray-700">
              Focus on improving algorithm complexity analysis through additional practice sessions and workshops.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-gray-900 mb-2">Student Engagement</h3>
            <p className="text-gray-700">
              Introduce more interactive coding challenges and peer programming activities to enhance learning.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-gray-900 mb-2">Assessment Methods</h3>
            <p className="text-gray-700">
              Consider adding project-based assessments to better evaluate practical implementation skills.
            </p>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-12 pt-8 border-t-2 border-gray-300">
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-12">
              <p className="text-gray-900">Faculty Signature</p>
              <p className="text-sm text-gray-600">{courseData.faculty}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-12">
              <p className="text-gray-900">HOD Signature</p>
              <p className="text-sm text-gray-600">Head of Department</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-12">
              <p className="text-gray-900">Dean Signature</p>
              <p className="text-sm text-gray-600">Dean of Faculty</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-gray-900 mb-2">Course File Report Generator</h2>
        <p className="text-gray-600">Generate comprehensive course file reports for documentation</p>
      </div>

      {!showPreview ? (
        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Select Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.code} value={course.code}>
                          {course.code} - {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Semester</Label>
                  <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fall-2024">Fall 2024</SelectItem>
                      <SelectItem value="spring-2024">Spring 2024</SelectItem>
                      <SelectItem value="fall-2023">Fall 2023</SelectItem>
                      <SelectItem value="spring-2023">Spring 2023</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={() => setShowPreview(true)}
                  disabled={!selectedCourse || !selectedSemester}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Report
                </Button>
                <Button 
                  variant="outline"
                  onClick={generatePDF}
                  disabled={!selectedCourse || !selectedSemester}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-4 print:hidden">
            <Button onClick={() => setShowPreview(false)} variant="outline">
              ← Back
            </Button>
            <Button onClick={printReport}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={generatePDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {renderPreview()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}