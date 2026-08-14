import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle,  Calendar, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { User } from '../App';
import { useEffect, useState } from 'react';
import React from 'react';

interface HowToApplyPageProps {
  user: User | null;
  onLogout: () => void;
}

export interface Apply {

    number: number;
    title: string;
    description: string;
    icon: string;
    color: string;
}

export interface ImpDates {

    event: string;
    startDate: string | null;
    endDate: string | null;
}



export default function HowToApplyPage({ user, onLogout }: HowToApplyPageProps) {

    const [steps, setApplySteps] = useState<Apply[]>([]);

    const [importantDates, setImpDates] = useState<ImpDates[]>([]);

    useEffect(() => {
        fetchAllApplySteps();
    }, []);

    useEffect(() => {
        fetchAllImpDates();
    }, []);
  /*const steps = [
    {
      number: '01',
      title: 'Check Eligibility',
      description: 'Review the admission requirements for your desired program',
      icon: CheckCircle,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      number: '02',
      title: 'Prepare Documents',
      description: 'Gather all required documents including transcripts, certificates, and test scores',
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
    },
    {
      number: '03',
      title: 'Fill Application Form',
      description: 'Complete the online or offline application form with accurate information',
      icon: Send,
      color: 'from-orange-500 to-red-500',
    },
    {
      number: '04',
      title: 'Pay Application Fee',
      description: 'Submit the non-refundable application fee through designated bank',
      icon: CreditCard,
      color: 'from-green-500 to-emerald-500',
    },
    {
      number: '05',
      title: 'Submit Application',
      description: 'Submit your complete application before the deadline',
      icon: Send,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      number: '06',
      title: 'Entrance Test/Interview',
      description: 'Appear for the entrance test or interview as per program requirements',
      icon: Calendar,
      color: 'from-yellow-500 to-orange-500',
    },
  ];*/

  /*const importantDates = [
    { event: 'Application Start Date', date: 'January 15, 2025' },
    { event: 'Application Deadline', date: 'March 31, 2025' },
    { event: 'Entrance Test', date: 'April 15-20, 2025' },
    { event: 'Result Announcement', date: 'May 5, 2025' },
    { event: 'Registration Start', date: 'May 10, 2025' },
    { event: 'Classes Begin', date: 'June 1, 2025' },
  ];
  */
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} onLogout={onLogout} />

      {/* Page Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-white mb-4">How to Apply</h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Follow our step-by-step application process to join Government Postgraduate College Kohat.
          </p>
        </div>
      </section>

      {/* Application Steps */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-gray-900 text-center mb-12">Application Process</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <Card key={index} className="relative overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${step.color} opacity-10 rounded-bl-full`}></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      {React.createElement(step.icon, { className: "w-8 h-8 text-white" })}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Step {step.number}</p>
                      <h3 className="text-gray-900">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-gray-600">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Important Dates */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-gray-900 mb-6">Important Dates</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {importantDates.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <span className="text-gray-900">{item.event}</span>
                        </div>
                            <span className="text-blue-600">
                                <span className="text-blue-600">
                                    {item.startDate && new Date(item.startDate).toLocaleDateString()}
                                    {item.endDate && ` - ${new Date(item.endDate).toLocaleDateString()}`}
                                </span>
                            </span>                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-gray-900 mb-6">Required Documents</h2>
              <Card>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    {[
                      'Completed Application Form',
                      'Academic Transcripts (attested)',
                      'Degree Certificate (attested)',
                      'CNIC Copy',
                      'Domicile Certificate',
                      'Recent Passport Size Photographs',
                      'Character Certificate',
                      'NOC (for employed candidates)',
                      'Entry Test Scorecard (if applicable)',
                      'Fee Challan Copy',
                    ].map((doc, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{doc}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Application Fee */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-white mb-2">Application Fee</h3>
                  <p className="text-blue-100 mb-4">
                    Non-refundable application fee must be paid through designated bank branches.
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white">PKR</span>
                    <span className="text-white">2,000</span>
                    <span className="text-blue-200 text-sm">(for all programs)</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Link to="/downloads">
                    <Button size="lg" variant="secondary">
                      Download Application Form
                    </Button>
                  </Link>
                  <Link to="/fee-structure">
                    <Button size="lg" variant="outline" className="bg-white/10 text-white border-white hover:bg-white/20">
                      View Fee Structure
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Important Notes */}
      <section className="py-16 bg-yellow-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-yellow-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                <div>
                  <h3 className="text-gray-900 mb-4">Important Notes</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Incomplete applications will not be processed.</li>
                    <li>• All documents must be attested by a gazetted officer.</li>
                    <li>• Candidates are advised to apply well before the deadline.</li>
                    <li>• Merit list will be displayed on the college notice board and website.</li>
                    <li>• Original documents will be required at the time of admission.</li>
                    <li>• The college reserves the right to cancel any application without assigning any reason.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
    );
    async function fetchAllApplySteps() {
        try {
            const response = await fetch('api/ApplySteps/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setApplySteps(data);
        } catch (error) {
            debugger;
            console.error('Error fetching apply steps:', error);
        }
    }

    async function fetchAllImpDates() {
        try {
            const response = await fetch('api/ImportantDates/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setImpDates(data);
        } catch (error) {
            debugger;
            console.error('Error fetching important dates:', error);
        }
    }
}
