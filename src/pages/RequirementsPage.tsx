import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CheckCircle } from 'lucide-react';
import type { User } from '../App';
import { useEffect, useState } from 'react';

interface RequirementsPageProps {
  user: User | null;
    onLogout: () => void;
}

export interface ProgCategories {
    categoryId: number;
    categoryName: string;
}
export interface ProgRequirements {

    categoryId: number;
    requirementType: string;
    requirementText: string;

}

export default function RequirementsPage({ user, onLogout }: RequirementsPageProps) {

    const [reqType, setReqTypes] = useState<ProgCategories[]>([]);

    const [requirements, setReqTexts] = useState<ProgRequirements[]>([]);

    useEffect(() => {
        fetchAllReqTypes();
        fetchAllReqTexts();
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header user={user} onLogout={onLogout} />

            {/* Page Header */}
            <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-white mb-4">Admission Requirements</h1>
                    <p className="text-xl text-blue-100 max-w-3xl">
                        Review the eligibility criteria and requirements for different postgraduate programs.
                    </p>
                </div>
            </section>

            {/* Requirements Tabs */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    <Tabs
                        defaultValue={
                            reqType.length > 0
                                ? reqType[0].categoryId.toString()
                                : ""
                        }
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
                            {reqType.map((cat) => (
                                <TabsTrigger
                                    key={cat.categoryId}
                                    value={cat.categoryId.toString()}
                                >
                                    {cat.categoryName}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {reqType.map((cat) => {

                            const academic = requirements.filter(
                                (r) =>
                                    r.categoryId === cat.categoryId &&
                                    r.requirementType === "Academic"
                            );

                            const test = requirements.filter(
                                (r) =>
                                    r.categoryId === cat.categoryId &&
                                    r.requirementType === "Test"
                            );

                            const additional = requirements.filter(
                                (r) =>
                                    r.categoryId === cat.categoryId &&
                                    r.requirementType === "Additional"
                            );

                            return (
                                <TabsContent
                                    key={cat.categoryId}
                                    value={cat.categoryId.toString()}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                        {/* Academic Requirements */}
                                        <Card className="hover:shadow-xl transition-all">
                                            <CardContent className="p-6">
                                                <h3 className="text-gray-900 mb-4">
                                                    Academic Requirements
                                                </h3>

                                                <ul className="space-y-3">
                                                    {academic.map((req) => (
                                                        <li
                                                            key={req.requirementText}
                                                            className="flex items-start gap-2"
                                                        >
                                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                            <span className="text-gray-600 text-sm">
                                                                {req.requirementText}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>

                                        {/* Test Requirements */}
                                        <Card className="hover:shadow-xl transition-all">
                                            <CardContent className="p-6">
                                                <h3 className="text-gray-900 mb-4">
                                                    Test Requirements
                                                </h3>

                                                <ul className="space-y-3">
                                                    {test.map((req) => (
                                                        <li
                                                            key={req.requirementText}
                                                            className="flex items-start gap-2"
                                                        >
                                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                            <span className="text-gray-600 text-sm">
                                                                {req.requirementText}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>

                                        {/* Additional Requirements */}
                                        <Card className="hover:shadow-xl transition-all">
                                            <CardContent className="p-6">
                                                <h3 className="text-gray-900 mb-4">
                                                    Additional Requirements
                                                </h3>

                                                <ul className="space-y-3">
                                                    {additional.map((req) => (
                                                        <li
                                                            key={req.requirementText}
                                                            className="flex items-start gap-2"
                                                        >
                                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                            <span className="text-gray-600 text-sm">
                                                                {req.requirementText}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>

                                    </div>
                                </TabsContent>
                            );
                        })}
                    </Tabs>

                </div>
            </section>

            <Footer />
        </div>
    );

    // ? API Calls (Placed after return but inside component)

    async function fetchAllReqTypes() {
        try {
            const response = await fetch('api/ProgramCategories/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setReqTypes(data);
        } catch (error) {
            console.error('Error fetching requirements categories:', error);
        }
    }

    async function fetchAllReqTexts() {
        try {
            const response = await fetch('api/ProgramRequirements/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setReqTexts(data);
        } catch (error) {
            console.error('Error fetching requirements:', error);
        }
    }
}