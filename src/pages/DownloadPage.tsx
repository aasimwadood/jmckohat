import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Download, FileText, Calendar, DollarSign, BookOpen, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { User } from '../App';

interface DownloadPageProps {
  user: User | null;
  onLogout: () => void;
}
export interface DownloadCat {
    id: number;
    categoryName: string;
}

export interface Downloads{
    categoryId: number;
    name: string;
    date: string;
    size: number;

}
export default function DownloadPage({ user, onLogout }: DownloadPageProps) {

    const [categories, setCategories] = useState<DownloadCat[]>([]);
    const [downloads, setDownloads] = useState<Downloads[]>([]);

    useEffect(() => {
        fetchAllCategories();
    }, []);

    useEffect(() => {
        fetchAllDownloads();
    }, []);

  const [searchQuery, setSearchQuery] = useState('');

  /*const downloads = {
    admissions: [
      { name: 'Admission Form 2025', date: '2025-10-01', size: '2.5 MB' },
      { name: 'Admission Requirements & Criteria', date: '2025-09-15', size: '1.2 MB' },
      { name: 'Scholarship Application Form', date: '2025-09-10', size: '850 KB' },
      { name: 'Transfer Student Guidelines', date: '2025-08-20', size: '1.5 MB' },
    ],
    academic: [
      { name: 'Academic Calendar Spring 2025', date: '2025-10-01', size: '1.8 MB' },
      { name: 'Academic Calendar Fall 2024', date: '2024-08-15', size: '1.7 MB' },
      { name: 'Course Registration Guide', date: '2025-09-25', size: '2.1 MB' },
      { name: 'Grading Policy & System', date: '2025-01-10', size: '980 KB' },
    ],
    examination: [
      { name: 'Mid-Term Exam Schedule Fall 2024', date: '2025-10-15', size: '1.3 MB' },
      { name: 'Final Exam Schedule Spring 2025', date: '2025-06-01', size: '1.4 MB' },
      { name: 'Examination Rules & Regulations', date: '2025-01-05', size: '1.1 MB' },
      { name: 'Result Verification Form', date: '2025-09-01', size: '650 KB' },
    ],
    fees: [
      { name: 'Fee Structure 2024-2025', date: '2025-08-01', size: '1.6 MB' },
      { name: 'Fee Challan Form', date: '2025-10-01', size: '750 KB' },
      { name: 'Installment Plan Application', date: '2025-08-15', size: '920 KB' },
      { name: 'Fee Refund Policy', date: '2025-07-20', size: '880 KB' },
    ],
    policies: [
      { name: 'Student Code of Conduct', date: '2025-01-01', size: '2.2 MB' },
      { name: 'Attendance Policy', date: '2025-01-01', size: '1.0 MB' },
      { name: 'Plagiarism & Academic Integrity', date: '2025-01-01', size: '1.4 MB' },
      { name: 'Library Usage Guidelines', date: '2025-02-15', size: '1.1 MB' },
    ],
  };

  const categories = [
    { id: 'admissions', label: 'Admissions', icon: FileText },
    { id: 'academic', label: 'Academic Calendars', icon: Calendar },
    { id: 'examination', label: 'Examinations', icon: BookOpen },
    { id: 'fees', label: 'Fee Challans', icon: DollarSign },
    { id: 'policies', label: 'Policies & Guidelines', icon: FileText },
  ];
  */
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} />

      {/* Page Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-white mb-4">Downloads</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Access important forms, documents, and resources. All files are available for download.
          </p>
        </div>
      </section>

      {/* Search Bar */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Downloads Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <Tabs defaultValue={categories[0]?.id?.toString()} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-8">
                          {categories.map((category) => (
                              <TabsTrigger
                                  key={category.id}
                                  value={category.id.toString()}
                                  className="flex items-center gap-2"
                              >
                                  {category.categoryName}
                              </TabsTrigger>
                          ))}
                      </TabsList>

            {categories.map((category) => (
                <TabsContent key={category.id} value={category.id.toString()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {downloads
                            .filter(d => d.categoryId === category.id)
                            .filter(doc =>
                                searchQuery === '' ||
                                doc.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )                   
                    
                    .map((doc, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start gap-3 mb-3">
                                <FileText className="w-10 h-10 text-blue-600 flex-shrink-0" />
                                <div>
                                  <h3 className="text-gray-900 mb-1">{doc.name}</h3>
                                  <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span>{doc.date}</span>
                                    <span>•</span>
                                    <span>{doc.size} MB</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
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

      {/* Important Notice */}
      <section className="py-12 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-blue-200">
            <CardContent className="p-8">
              <h3 className="text-gray-900 mb-4">Important Notice</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>All documents are in PDF format. Make sure you have a PDF reader installed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>For admission forms, ensure all fields are filled correctly before submission.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Fee challans must be printed and submitted at designated bank branches.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Always check the document date to ensure you're using the latest version.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
    );

    async function fetchAllCategories() {
        try {
            const response = await fetch('api/DownloadCategories/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setCategories(data);
        } catch (error) {
            debugger;
            console.error('Error fetching Download Categories:', error);
        }
    }

    async function fetchAllDownloads() {
        try {
            const response = await fetch('api/Downloads/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setDownloads(data);
        } catch (error) {
            debugger;
            console.error('Error fetching Downloads:', error);
        }
    }
}
