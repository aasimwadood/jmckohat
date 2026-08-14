import Header from '../components/Header';
import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BookOpen, Clock, Award, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { User } from '../App';

interface ProgramsPageProps {
  user: User | null;
  onLogout: () => void;
}
export interface ProgramCategories {

    categoryId: number;
    categoryName: string;
}

export interface ProgramDetails {
    programId: number;
    programName: string;
    departments: string;
    duration: string;
    creditHours: number;
    eligibility: string;
    specializations: string;
    categoryId: number;
    categoryName: string;

}

export default function ProgramsPage({ user, onLogout }: ProgramsPageProps) {

    const [programcategories, setProgramCategories] = useState<ProgramCategories[]>([]);
    const [programdetails, setProgramDetails] = useState<ProgramDetails[]>([]);

    useEffect(() => {
        fetchAllProgramCategories();
    },
        []);
    useEffect(() => {
        fetchAllProgramDetails();
    },
        []);

    async function fetchAllProgramCategories() {
        try {
            const response = await fetch('api/ProgramCategories/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setProgramCategories(data);
        } catch (error) {
            debugger;
            console.error('Error fetching ProgramCategories:', error);
        }
    }

    async function fetchAllProgramDetails() {
        try {
            const response = await fetch('api/ProgramDetails/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setProgramDetails(data);
        } catch (error) {
            debugger;
            console.error('Error fetching program details:', error);
        }
    }
  /*const programs = {
    ms: [
      {
        name: 'MS Computer Science',
        department: 'Computer Science',
        duration: '2 Years',
        credits: '30 Credit Hours',
        eligibility: '16 years of education with minimum 2.5 CGPA',
        specializations: ['Artificial Intelligence', 'Cybersecurity', 'Data Science'],
      },
      {
        name: 'MS Mathematics',
        department: 'Mathematics',
        duration: '2 Years',
        credits: '30 Credit Hours',
        eligibility: '16 years of education with minimum 2.5 CGPA',
        specializations: ['Pure Mathematics', 'Applied Mathematics', 'Statistics'],
      },
      {
        name: 'MS Physics',
        department: 'Physics',
        duration: '2 Years',
        credits: '30 Credit Hours',
        eligibility: '16 years of education with minimum 2.5 CGPA',
        specializations: ['Condensed Matter Physics', 'Nuclear Physics', 'Astrophysics'],
      },
      {
        name: 'MS Chemistry',
        department: 'Chemistry',
        duration: '2 Years',
        credits: '30 Credit Hours',
        eligibility: '16 years of education with minimum 2.5 CGPA',
        specializations: ['Organic Chemistry', 'Inorganic Chemistry', 'Analytical Chemistry'],
      },
    ],
    mba: [
      {
        name: 'MBA (General)',
        department: 'Business Administration',
        duration: '2 Years',
        credits: '60 Credit Hours',
        eligibility: '16 years of education with minimum 2.5 CGPA',
        specializations: ['Finance', 'Marketing', 'Human Resource Management', 'General Management'],
      },
      {
        name: 'MS Finance',
        department: 'Business Administration',
        duration: '2 Years',
        credits: '30 Credit Hours',
        eligibility: '16 years of education with minimum 2.5 CGPA',
        specializations: ['Corporate Finance', 'Investment Management', 'Financial Planning'],
      },
    ],
    mphil: [
      {
        name: 'M.Phil Computer Science',
        department: 'Computer Science',
        duration: '2 Years',
        credits: '30 Credit Hours + Thesis',
        eligibility: 'MS/MA with minimum 3.0 CGPA',
        specializations: ['Research-based program'],
      },
      {
        name: 'M.Phil Mathematics',
        department: 'Mathematics',
        duration: '2 Years',
        credits: '30 Credit Hours + Thesis',
        eligibility: 'MS/MA with minimum 3.0 CGPA',
        specializations: ['Research-based program'],
      },
      {
        name: 'M.Phil English',
        department: 'English',
        duration: '2 Years',
        credits: '30 Credit Hours + Thesis',
        eligibility: 'MA English with minimum 3.0 CGPA',
        specializations: ['Linguistics', 'Literature', 'Language Teaching'],
      },
    ],
    phd: [
      {
        name: 'PhD Computer Science',
        department: 'Computer Science',
        duration: '3-5 Years',
        credits: '18 Credit Hours + Dissertation',
        eligibility: 'M.Phil/MS with minimum 3.0 CGPA',
        specializations: ['Advanced research in specialized areas'],
      },
      {
        name: 'PhD Mathematics',
        department: 'Mathematics',
        duration: '3-5 Years',
        credits: '18 Credit Hours + Dissertation',
        eligibility: 'M.Phil/MS with minimum 3.0 CGPA',
        specializations: ['Advanced research in specialized areas'],
      },
      {
        name: 'PhD Physics',
        department: 'Physics',
        duration: '3-5 Years',
        credits: '18 Credit Hours + Dissertation',
        eligibility: 'M.Phil/MS with minimum 3.0 CGPA',
        specializations: ['Advanced research in specialized areas'],
      },
    ],
  }; */

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} />

      {/* Page Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-white mb-4">Academic Programs</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Explore our comprehensive range of postgraduate programs designed to advance your academic and professional career.
          </p>
        </div>
      </section>

      {/* Programs Tabs */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <Tabs
                      defaultValue={programcategories[0]?.categoryId?.toString()}
                      className="w-full"
                  >
                      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
                          {programcategories.map((category) => (
                              <TabsTrigger
                                  key={category.categoryId}
                                  value={category.categoryId.toString()}
                              >
                                  {category.categoryName}
                              </TabsTrigger>
                          ))}
                      </TabsList>

                      {programcategories.map((category) => (
                          <TabsContent
                              key={category.categoryId}
                              value={category.categoryId.toString()}
                          >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {programdetails
                                      .filter((program) => program.categoryId === category.categoryId)
                                      .map((program) => (
                                          <Card
                                              key={program.programId}
                                              className="hover:shadow-xl transition-all duration-300"
                                          >
                                              <CardContent className="p-6">
                                                  <div className="flex items-start justify-between mb-4">
                                                      <div className="flex-1">
                                                          <h3 className="text-gray-900 mb-2">
                                                              {program.programName}
                                                          </h3>

                                                          <Badge variant="secondary" className="mb-3">
                                                              {program.categoryName}
                                                          </Badge>
                                                      </div>

                                                      <BookOpen className="w-8 h-8 text-blue-600" />
                                                  </div>

                                                  <div className="space-y-3 mb-6">
                                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                                          <Clock className="w-4 h-4 text-blue-600" />
                                                          <span>Duration: {program.duration}</span>
                                                      </div>

                                                      <div className="flex items-center gap-2 text-sm text-gray-600">
                                                          <Award className="w-4 h-4 text-blue-600" />
                                                          <span>{program.creditHours} Credit Hours</span>
                                                      </div>

                                                      <div className="flex items-start gap-2 text-sm text-gray-600">
                                                          <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                                                          <span>Eligibility: {program.eligibility}</span>
                                                      </div>
                                                  </div>

                                                  <div className="mb-6">
                                                      <h4 className="text-sm text-gray-900 mb-2">
                                                          Specializations:
                                                      </h4>

                                                      <ul className="space-y-1">
                                                          {program.specializations
                                                              ?.split(",")
                                                              .map((spec, idx) => (
                                                                  <li
                                                                      key={idx}
                                                                      className="text-sm text-gray-600 flex items-center gap-2"
                                                                  >
                                                                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                                                                      {spec.trim()}
                                                                  </li>
                                                              ))}
                                                      </ul>
                                                  </div>

                                                  <div className="flex gap-2">
                                                      <Link to="/how-to-apply" className="flex-1">
                                                          <Button className="w-full">
                                                              Apply Now
                                                          </Button>
                                                      </Link>

                                                      <Link to="/requirements">
                                                          <Button variant="outline">
                                                              Requirements
                                                          </Button>
                                                      </Link>
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
