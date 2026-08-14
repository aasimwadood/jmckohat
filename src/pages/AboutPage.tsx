import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Target, Eye, History, Users } from 'lucide-react';
import type { User } from '../App';

interface AboutPageProps {
  user: User | null;
  onLogout: () => void;
}
interface Configuration {
    key: string;
    value: string;
}
export interface Leadership{

    title: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
 }

export default function AboutPage({ user, onLogout }: AboutPageProps) {

    const [leaderships, setLeadership] = useState<Leadership[]>([]);
    const [configurations, setConfigurations] = useState<Configuration[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [highlights, setHighlights] = useState<any[]>([]);


    useEffect(() => {
        fetchAllLeadership();
        fetchAllConfigurations();
        fetchAllDepartments();
        fetchAllHighlights();
    }, []);

    const configMap = configurations.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, string>);


    async function fetchAllConfigurations() {
        try {
            const response = await fetch('api/configuration/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setConfigurations(data);
        } catch (error) {
            console.error('Error fetching configurations:', error);
        }
    }

    async function fetchAllLeadership() {
        try {
            const response = await fetch('api/Leadership/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setLeadership(data);
        } catch (error) {
            console.error('Error fetching leaderships:', error);
        }
    }

    async function fetchAllDepartments() {
        try {
            const response = await fetch('api/PublicPortal/departments');
            if (!response.ok) {
                // Fallback to DepartmentsPage if PublicPortal departments not implemented
                const altRes = await fetch('api/DepartmentsPage/getall');
                if (altRes.ok) {
                    const data = await altRes.json();
                    const formatted = data.map((dept: any) => ({
                        name: dept.name,
                        description: dept.description,
                        programs: typeof dept.programs === 'string' ? dept.programs.split(',').map((p: string) => p.trim()) : dept.programs
                    }));
                    setDepartments(formatted);
                    return;
                }
            } else {
                const data = await response.json();
                setDepartments(data);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    }

    async function fetchAllHighlights() {
        try {
            const response = await fetch('api/PublicPortal/highlights');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            setHighlights(data);
        } catch (error) {
            console.error('Error fetching highlights:', error);
        }
    }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} />

      {/* Page Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-white mb-4">About Us</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
                      {configMap["AboutUs"]}
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardContent className="p-8">
                <Target className="w-12 h-12 text-blue-600 mb-4" />
                <h2 className="text-gray-900 mb-4">Our Mission</h2>
                <p className="text-gray-600">
                                  { configMap["OurMission"] }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <Eye className="w-12 h-12 text-blue-600 mb-4" />
                <h2 className="text-gray-900 mb-4">Our Vision</h2>
                <p className="text-gray-600">
                                  {configMap["OurVision"] } 
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-8">
              <History className="w-12 h-12 text-blue-600 mb-4" />
              <h2 className="text-gray-900 mb-4">Our History</h2>
              <p className="text-gray-600 mb-4">
                              {configMap["OurHistory"] }
              
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <Users className="w-8 h-8 text-blue-600" />
            <h2 className="text-gray-900">Our Leadership</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {leaderships.map((leader, index) => (
              <Card key={index}>
                    <CardContent className="p-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-blue-600 text-xl">
                                {(
                                    (leader.firstName?.[0] || '') +
                                    (leader.lastName?.[0] || '')
                                ).toUpperCase()}
                            </span>
                        </div>

                        <h3 className="text-gray-900 mb-1">
                            {leader.title} {leader.firstName} {leader.lastName}
                        </h3>

                        <p className="text-blue-600 mb-2">{leader.position}</p>
                        <p className="text-sm text-gray-500">{leader.department}</p>
                    </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 mb-8">Our Departments</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {departments.map((dept, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h3 className="text-gray-900 mb-3">{dept.name}</h3>
                  <p className="text-gray-600 mb-4">{dept.description}</p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Programs Offered:</p>
                    <ul className="space-y-1">
                      {dept.programs.map((program, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                          {program}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Campus Highlights */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 mb-8">Campus Highlights</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((highlight, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="text-blue-600 mb-2">{highlight.value}</div>
                  <p className="text-gray-600">{highlight.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
    );
   
}
