import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import type { User } from '../App';
import { useEffect, useState } from 'react';

interface FeeStructurePageProps {
    user: User | null;
    onLogout: () => void;
}

export interface ProgCategory {
    categoryId: number;
    categoryName: string;
}

export interface ProgramFee {
    categoryId: number;
    program: string;
    admission: number;
    tuition: number;
    total: number;
}

export interface AddFeeCategory {
    categoryId: number;
    categoryName: string;
}

export interface AddFeeItems {
    feeId?: number;
    feeName: string;
    amount: number;
    categoryId: number;
}

export default function FeeStructurePage({ user, onLogout }: FeeStructurePageProps) {
    const [ progCategory,  setProgCategory] = useState<ProgCategory[]>([]);
    const [feeStructure, setProgFee] = useState<ProgramFee[]>([]);
    const [feeCategory, setAddFeeCategory] = useState<AddFeeCategory[]>([]);
    const [feeItems, setAddFeeItems] = useState<AddFeeItems[]>([]);

    useEffect(() => {
        fetchAllProgCategory();
        fetchAllProgFee();
        fetchAllAddFeeCategory();
        fetchAllAddFeeItems();
    }, []);

    // Group fee items by category
    const getFeeItemsByCategory = (categoryId: number) => {
        return feeItems.filter(item => item.categoryId === categoryId);
    };

    // Get category name by ID
    const getCategoryName = (categoryId: number) => {
        const category = feeCategory.find(cat => cat.categoryId === categoryId);
        return category?.categoryName || 'Other Fees';
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header user={user} onLogout={onLogout} />

            {/* Page Header */}
            <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-white mb-4">Fee Structure</h1>
                    <p className="text-xl text-blue-100 max-w-3xl">
                        Transparent and affordable fee structure for all postgraduate programs.
                    </p>
                </div>
            </section>

            {/* Fee Tables */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Tabs defaultValue="ms" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
                            <TabsTrigger value="ms">MS Programs</TabsTrigger>
                            <TabsTrigger value="mba">MBA Programs</TabsTrigger>
                            <TabsTrigger value="mphil">M.Phil Programs</TabsTrigger>
                            <TabsTrigger value="phd">PhD Programs</TabsTrigger>
                        </TabsList>

                        {/* Group program fees by category */}
                        {[1, 2, 3, 4].map((catId) => {
                            const tabValue = catId === 1 ? 'ms' : catId === 2 ? 'mba' : catId === 3 ? 'mphil' : 'phd';
                            const programsInCategory = feeStructure.filter(fee => fee.categoryId === catId);

                            return (
                                <TabsContent key={catId} value={tabValue}>
                                    <Card>
                                        <CardContent className="p-6">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Program</TableHead>
                                                        <TableHead>Admission Fee</TableHead>
                                                        <TableHead>Tuition Fee (Per Semester)</TableHead>
                                                        <TableHead>Total (Per Semester)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {programsInCategory.length > 0 ? (
                                                        programsInCategory.map((program, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell className="text-gray-900">{program.program}</TableCell>
                                                                <TableCell>PKR {program.admission.toLocaleString()}</TableCell>
                                                                <TableCell>PKR {program.tuition.toLocaleString()}</TableCell>
                                                                <TableCell className="text-blue-600">
                                                                    PKR {program.total.toLocaleString()}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-center text-gray-500">
                                                                No programs available in this category
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            );
                        })}
                    </Tabs>
                </div>
            </section>

            {/* Additional Fees - DYNAMIC */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-gray-900 mb-8">Additional Fees & Charges</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Dynamic Fee Categories */}
                        {feeCategory.length > 0 ? (
                            feeCategory.map((category) => {
                                const items = getFeeItemsByCategory(category.categoryId);
                                if (items.length === 0) return null;

                                return (
                                    <Card key={category.categoryId}>
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.categoryId % 2 === 0
                                                        ? 'from-orange-500 to-red-600'
                                                        : 'from-blue-500 to-purple-600'
                                                    } flex items-center justify-center`}>
                                                    <DollarSign className="w-6 h-6 text-white" />
                                                </div>
                                                <h3 className="text-gray-900">{category.categoryName}</h3>
                                            </div>
                                            <Table>
                                                <TableBody>
                                                    {items.map((item) => (
                                                        <TableRow key={item.feeId || item.feeName}>
                                                            <TableCell>{item.feeName}</TableCell>
                                                            <TableCell className="text-right">
                                                                PKR {item.amount.toLocaleString()}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        ) : (
                            // Fallback static data if no categories exist
                            <>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                <DollarSign className="w-6 h-6 text-white" />
                                            </div>
                                            <h3 className="text-gray-900">One-Time Charges</h3>
                                        </div>
                                        <Table>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell>Application Fee</TableCell>
                                                    <TableCell className="text-right">PKR 2,000</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Security Deposit (Refundable)</TableCell>
                                                    <TableCell className="text-right">PKR 5,000</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Student Card Fee</TableCell>
                                                    <TableCell className="text-right">PKR 500</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Library Fee</TableCell>
                                                    <TableCell className="text-right">PKR 2,000</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                                                <DollarSign className="w-6 h-6 text-white" />
                                            </div>
                                            <h3 className="text-gray-900">Miscellaneous Charges</h3>
                                        </div>
                                        <Table>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell>Late Fee (Per Day)</TableCell>
                                                    <TableCell className="text-right">PKR 100</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Duplicate ID Card</TableCell>
                                                    <TableCell className="text-right">PKR 300</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Transcript (Per Copy)</TableCell>
                                                    <TableCell className="text-right">PKR 1,000</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell>Degree Issuance</TableCell>
                                                    <TableCell className="text-right">PKR 3,000</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Scholarship & Financial Aid */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                            <CardContent className="p-8">
                                <CheckCircle className="w-12 h-12 mb-4" />
                                <h3 className="text-white mb-4">Scholarships Available</h3>
                                <ul className="space-y-2">
                                    {[
                                        'Merit-based scholarships (up to 100%)',
                                        'Need-based financial assistance',
                                        'HEC funded scholarships',
                                        'Provincial government scholarships',
                                        'Endowment fund scholarships',
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            <CardContent className="p-8">
                                <DollarSign className="w-12 h-12 mb-4" />
                                <h3 className="text-white mb-4">Fee Payment Options</h3>
                                <ul className="space-y-2">
                                    {[
                                        'Online payment through bank portal',
                                        'Bank challan payment',
                                        'Installment plan available (conditions apply)',
                                        'Credit card payment accepted',
                                        'Payment deadline: 15th of each semester',
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
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
                                        <li>• Fees are subject to revision as per college policy.</li>
                                        <li>• Admission fee is non-refundable.</li>
                                        <li>• Late fee will be charged after the due date.</li>
                                        <li>• Security deposit will be refunded after course completion.</li>
                                        <li>• Students must clear all dues before receiving degrees/transcripts.</li>
                                        <li>• Fees do not include thesis/dissertation printing and binding costs.</li>
                                        <li>• Hostel and transportation fees are separate (if availed).</li>
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

    // API fetch functions
    async function fetchAllProgCategory() {
        try {
            const response = await fetch('/api/ProgramCategories/getall');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            setProgCategory(data);
        } catch (error) {
            console.error('Error fetching Program Categories:', error);
        }
    }

    async function fetchAllProgFee() {
        try {
            const response = await fetch('/api/ProgramFees/getall');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            setProgFee(data);
        } catch (error) {
            console.error('Error fetching Program Fees:', error);
        }
    }

    async function fetchAllAddFeeCategory() {
        try {
            const response = await fetch('/api/AdditionalFeeCategories/getall');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            setAddFeeCategory(data);
        } catch (error) {
            console.error('Error fetching Additional Fee Categories:', error);
        }
    }

    async function fetchAllAddFeeItems() {
        try {
            const response = await fetch('/api/AdditionalFeeItems/getall');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            setAddFeeItems(data);
        } catch (error) {
            console.error('Error fetching Additional Fee Items:', error);
        }
    }
}