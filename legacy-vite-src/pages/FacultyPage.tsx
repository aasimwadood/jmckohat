import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Mail, Phone, Award, BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import type { User } from '../App';
import { useEffect, useState } from 'react';

interface FacultyPageProps {
  user: User | null;
  onLogout: () => void;
}

export interface FacultyCat {
    categoryId: number;
    categoryName: string;
    
}

export interface FacultyMem {
    facultyId: number;
    categoryId: number;
    name: string;
    designation: string;
    qualification: string;
    specification: string;
    email: string;
    phone: string;
    publications: number;
}

export default function FacultyPage({ user, onLogout }: FacultyPageProps) {

    const [facultycat, setFacultyCat] = useState<FacultyCat[]>([]);
    const [facultymem, setFacultyMem] = useState<FacultyMem[]>([]);

    useEffect(() => {
        fetchAllFacultyCat();
        fetchAllFacultyMem();

    }, []);

    async function fetchAllFacultyCat() {
        try {
            const response = await fetch('api/FacultyCategories/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setFacultyCat(data);
        } catch (error) {
            debugger;
            console.error('Error fetching Faculties page:', error);
        }
    }

    async function fetchAllFacultyMem() {
        try {
            const response = await fetch('api/FacultyMembers/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setFacultyMem(data);
        } catch (error) {
            debugger;
            console.error('Error fetching Faculties page:', error);
        }
    }
 /* const facultyMembers = {
    cs: [
      {
        name: 'Dr. Hassan Ahmed',
        designation: 'Professor & Head of Department',
        qualification: 'PhD in Computer Science',
        specialization: 'Artificial Intelligence, Machine Learning',
        email: 'hassan.ahmed@gpck.edu.pk',
        phone: '+92-922-514001',
        publications: 45,
      },
      {
        name: 'Dr. Ali Raza',
        designation: 'Associate Professor',
        qualification: 'PhD in Computer Science',
        specialization: 'Cybersecurity, Network Security',
        email: 'ali.raza@gpck.edu.pk',
        phone: '+92-922-514002',
        publications: 32,
      },
      {
        name: 'Dr. Fatima Khan',
        designation: 'Assistant Professor',
        qualification: 'PhD in Software Engineering',
        specialization: 'Software Development, Agile Methodologies',
        email: 'fatima.khan@gpck.edu.pk',
        phone: '+92-922-514003',
        publications: 28,
      },
    ],
    business: [
      {
        name: 'Dr. Ayesha Khan',
        designation: 'Professor & Head of Department',
        qualification: 'PhD in Business Administration',
        specialization: 'Strategic Management, Entrepreneurship',
        email: 'ayesha.khan@gpck.edu.pk',
        phone: '+92-922-514011',
        publications: 52,
      },
      {
        name: 'Dr. Usman Tariq',
        designation: 'Associate Professor',
        qualification: 'PhD in Finance',
        specialization: 'Corporate Finance, Investment Analysis',
        email: 'usman.tariq@gpck.edu.pk',
        phone: '+92-922-514012',
        publications: 38,
      },
      {
        name: 'Dr. Sarah Ali',
        designation: 'Assistant Professor',
        qualification: 'PhD in Marketing',
        specialization: 'Digital Marketing, Consumer Behavior',
        email: 'sarah.ali@gpck.edu.pk',
        phone: '+92-922-514013',
        publications: 25,
      },
    ],
    math: [
      {
        name: 'Prof. Dr. Muhammad Ali',
        designation: 'Professor & Head of Department',
        qualification: 'PhD in Mathematics',
        specialization: 'Pure Mathematics, Algebra',
        email: 'muhammad.ali@gpck.edu.pk',
        phone: '+92-922-514021',
        publications: 68,
      },
      {
        name: 'Dr. Ahmed Shah',
        designation: 'Associate Professor',
        qualification: 'PhD in Applied Mathematics',
        specialization: 'Numerical Analysis, Computational Methods',
        email: 'ahmed.shah@gpck.edu.pk',
        phone: '+92-922-514022',
        publications: 42,
      },
    ],
    english: [
      {
        name: 'Dr. Sarah Johnson',
        designation: 'Professor & Head of Department',
        qualification: 'PhD in English Literature',
        specialization: 'Victorian Literature, Critical Theory',
        email: 'sarah.johnson@gpck.edu.pk',
        phone: '+92-922-514031',
        publications: 55,
      },
      {
        name: 'Dr. Zainab Malik',
        designation: 'Associate Professor',
        qualification: 'PhD in Linguistics',
        specialization: 'Applied Linguistics, Discourse Analysis',
        email: 'zainab.malik@gpck.edu.pk',
        phone: '+92-922-514032',
        publications: 36,
      },
    ],
  };
  */
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} />

      {/* Page Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-white mb-4">Our Faculty</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Meet our distinguished faculty members who are experts in their respective fields with extensive research experience and academic excellence.
          </p>
        </div>
      </section>

      {/* Faculty Tabs */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <Tabs
                      defaultValue={facultycat.length > 0 ? facultycat[0].categoryId.toString() : ""}
                      className="w-full"
                  >
                      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
                          {facultycat.map((cat) => (
                              <TabsTrigger
                                  key={cat.categoryId}
                                  value={cat.categoryId.toString()}
                              >
                                  {cat.categoryName}
                              </TabsTrigger>
                          ))}
                      </TabsList>

                      {facultycat.map((cat) => (
                          <TabsContent
                              key={cat.categoryId}
                              value={cat.categoryId.toString()}
                          >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {facultymem
                                      .filter((f) => f.categoryId === cat.categoryId)
                                      .map((faculty) => (
                                          <Card key={faculty.facultyId} className="hover:shadow-xl transition-all duration-300">
                                              <CardContent className="p-6">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-2xl">
                            {faculty.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>

                        <div className="text-center mb-4">
                          <h3 className="text-gray-900 mb-1">{faculty.name}</h3>
                          <Badge variant="secondary" className="mb-2">{faculty.designation}</Badge>
                          <p className="text-sm text-gray-600">{faculty.qualification}</p>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex items-start gap-2 text-sm">
                            <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600">{faculty.specification}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-gray-600 break-all">{faculty.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-gray-600">{faculty.phone}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Award className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-600">
                              {faculty.publications} Publications
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      <Footer />
    </div>
  );
}
