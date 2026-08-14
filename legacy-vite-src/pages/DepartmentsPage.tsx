import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BookOpen, Users, Award, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { User } from '../App';
import { useEffect, useState } from 'react';

interface DepartmentsPageProps {
  user: User | null;
  onLogout: () => void;
}

export interface DepartmentsPage {

    deptId: number;
    name: string;
    head: string;
    programs: string[];
    description: string;
    students: number;
    faculty: number;
    labs: number;
}

export default function DepartmentsPage({ user, onLogout }: DepartmentsPageProps) {

    const [departments, setDepartmentsPage] = useState<DepartmentsPage[]>([]);

    useEffect(() => {
        fetchAllDepartmentsPage();
    }, []);

  /*const departments = [
    {
      name: 'Department of Computer Science',
      head: 'Dr. Hassan Ahmed',
      programs: ['MS Computer Science', 'M.Phil Computer Science', 'PhD Computer Science'],
      description: 'The Department of Computer Science offers cutting-edge programs in artificial intelligence, cybersecurity, software engineering, and data science. Our faculty comprises renowned researchers and industry experts.',
      students: 450,
      faculty: 25,
      labs: 8,
    },
    {
      name: 'Department of Business Administration',
      head: 'Dr. Ayesha Khan',
      programs: ['MBA', 'M.Phil Management Sciences', 'MS Finance'],
      description: 'Our Business Administration department prepares future business leaders through comprehensive programs in management, finance, marketing, and entrepreneurship. We emphasize practical learning and industry connections.',
      students: 600,
      faculty: 32,
      labs: 5,
    },
    {
      name: 'Department of Mathematics',
      head: 'Prof. Dr. Muhammad Ali',
      programs: ['MS Mathematics', 'M.Phil Mathematics', 'PhD Mathematics'],
      description: 'The Mathematics department focuses on pure and applied mathematics, statistics, and mathematical modeling. Our research spans various fields including computational mathematics and operations research.',
      students: 200,
      faculty: 18,
      labs: 3,
    },
    {
      name: 'Department of English',
      head: 'Dr. Sarah Johnson',
      programs: ['MA English', 'M.Phil English', 'PhD English Literature'],
      description: 'The English department offers comprehensive programs in literature, linguistics, and language teaching. We emphasize critical thinking, analytical skills, and effective communication.',
      students: 350,
      faculty: 22,
      labs: 2,
    },
    {
      name: 'Department of Physics',
      head: 'Prof. Dr. Ahmed Raza',
      programs: ['MS Physics', 'M.Phil Physics', 'PhD Physics'],
      description: 'Our Physics department conducts advanced research in theoretical and experimental physics, including condensed matter physics, quantum mechanics, and astrophysics.',
      students: 180,
      faculty: 20,
      labs: 6,
    },
    {
      name: 'Department of Chemistry',
      head: 'Dr. Fatima Noor',
      programs: ['MS Chemistry', 'M.Phil Chemistry', 'PhD Chemistry'],
      description: 'The Chemistry department offers programs in organic, inorganic, physical, and analytical chemistry with state-of-the-art research facilities and experienced faculty.',
      students: 220,
      faculty: 19,
      labs: 7,
    },
  ];*/

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} />

      {/* Page Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-white mb-4">Our Departments</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Explore our diverse academic departments offering world-class postgraduate programs in various disciplines.
          </p>
        </div>
      </section>

      {/* Departments Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {departments.map((dept, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-900 mb-2">{dept.name}</h3>
                      <p className="text-blue-600">Head: {dept.head}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-6">{dept.description}</p>

                  <div className="mb-6">
                    <h4 className="text-gray-900 mb-3">Programs Offered:</h4>
                    <ul className="space-y-2">
                      {dept.programs.map((program, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-gray-700">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          {program}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
                    <div className="text-center">
                      <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-gray-900">{dept.students}</p>
                      <p className="text-xs text-gray-600">Students</p>
                    </div>
                    <div className="text-center">
                      <Award className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-gray-900">{dept.faculty}</p>
                      <p className="text-xs text-gray-600">Faculty</p>
                    </div>
                    <div className="text-center">
                      <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-gray-900">{dept.labs}</p>
                      <p className="text-xs text-gray-600">Labs</p>
                    </div>
                  </div>

                  <Link to="/programs">
                    <Button className="w-full">View Programs</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
    );

    async function fetchAllDepartmentsPage() {
        try {
            const response = await fetch('/api/DepartmentsPage/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            const formatted = data.map((dept: any) => ({
                ...dept,
                programs: dept.programs.split(',').map((p: string) => p.trim())
            }));

            setDepartmentsPage(formatted);

        } catch (error) {
            console.error('Error fetching Departments Pages:', error);
        }
    }
}
