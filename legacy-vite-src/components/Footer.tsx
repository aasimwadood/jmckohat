import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
export interface Footer {
    footerId: number; 
    location: string;
    phoneNo: string;
    email: string;
    copyright: string;
}

export default function Footer() {
    const [footer, setFooterData] = useState<Footer | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFooterData();
    }, []);

    async function fetchFooterData() {
        try {
            setLoading(true);
            const response = await fetch('/api/Footer/getall');

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data: Footer[] = await response.json();

            if (data && data.length > 0) {
                setFooterData(data[0]);
            } else {
                setFooterData({
                    footerId: 0,
                    location: "Main Campus, University Road, City",
                    phoneNo: "+92-123-4567890",
                    email: "info@college.edu.pk",
                    copyright: "College Management System. All rights reserved."
                });
            }

            setError(null);
        } catch (error) {
            console.error('Error fetching footer:', error);
            setError('Failed to load footer information');

            setFooterData({
                footerId: 0,
                location: "Main Campus, University Road, City",
                phoneNo: "+92-123-4567890",
                email: "info@college.edu.pk",
                copyright: "College Management System. All rights reserved."
            });
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <footer className="bg-gray-900 text-gray-300 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex justify-center items-center">
                        <div className="animate-pulse text-gray-500">Loading...</div>
                    </div>
                </div>
            </footer>
        );
    }

    if (!footer) {
        return null;
    }

    return (
        <footer className="bg-gray-900 text-gray-300 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* About Section */}
                    <div>
                        <h3 className="text-white text-lg font-semibold mb-4">About Us</h3>
                        <p className="text-sm leading-relaxed">
                            Leading educational institution committed to excellence in academics and character development.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white text-lg font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/" className="hover:text-white transition-colors duration-200">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link to="/about" className="hover:text-white transition-colors duration-200">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link to="/downloads" className="hover:text-white transition-colors duration-200">
                                    Downloads
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact" className="hover:text-white transition-colors duration-200">
                                    Contact Us
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Academics */}
                    <div>
                        <h3 className="text-white text-lg font-semibold mb-4">Academics</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/departments" className="hover:text-white transition-colors duration-200">
                                    Departments
                                </Link>
                            </li>
                            <li>
                                <Link to="/programs" className="hover:text-white transition-colors duration-200">
                                    Programs
                                </Link>
                            </li>
                            <li>
                                <Link to="/faculty" className="hover:text-white transition-colors duration-200">
                                    Faculty
                                </Link>
                            </li>
                            <li>
                                <Link to="/fee-structure" className="hover:text-white transition-colors duration-200">
                                    Fee Structure
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info - DYNAMIC */}
                    <div>
                        <h3 className="text-white text-lg font-semibold mb-4">Contact Info</h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <span className="leading-relaxed">{footer.location}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                <span>{footer.phoneNo}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                <a href={`mailto:${footer.email}`} className="hover:text-white transition-colors duration-200">
                                    {footer.email}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Copyright Section - DYNAMIC */}
                <div className="border-t border-gray-800 mt-10 pt-8 text-sm text-center">
                    <p className="text-gray-400">
                        &copy; {new Date().getFullYear()} {footer.copyright}
                    </p>
                </div>
            </div>
        </footer>
    );
}