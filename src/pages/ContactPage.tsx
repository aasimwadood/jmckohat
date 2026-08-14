import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Mail, Phone, MapPin, Clock, Building2, HelpCircle, Send } from 'lucide-react';
import type { User } from '../App';
import { useEffect, useState } from 'react';

interface ContactPageProps {
    user: User | null;
    onLogout: () => void;
}

export interface ContactInfo {
    icon: string;
    title: string;
    description: string;
    details: string;
}

export interface OfficeHours {
    day: string;
    openingTime: string;
    closingTime: string;
    status: string;
}

export interface DeptContacts {
    name: string;
    phone: string;
    email: string;
}

export interface Campuses {
    name: string;
    address: string;
    phone: string;
    email: string;
}

export interface Message {
    fullName: string;
    email: string;
    phoneNumber: string;
    subject: string;
    messages: string;
}

export default function ContactPage({ user, onLogout }: ContactPageProps) {
    const [contacts, setContactInfo] = useState<ContactInfo[]>([]);
    const [officeHours, setOfficeHours] = useState<OfficeHours[]>([]);
    const [departments, setDeptContacts] = useState<DeptContacts[]>([]);
    const [campuses, setCampuses] = useState<Campuses[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Form state for new message
    const [newMessage, setNewMessage] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        subject: '',
        messages: ''
    });

    // UI state for form submission
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        fetchAllContactInfo();
    }, []);

    useEffect(() => {
        fetchAllOfficeHours();
    }, []);

    useEffect(() => {
        fetchAllDeptContacts();
    }, []);

    useEffect(() => {
        fetchAllCampuses();
    }, []);

    useEffect(() => {
        fetchAllMessages();
    }, []);

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setNewMessage(prev => ({
            ...prev,
            [id === 'name' ? 'fullName' : id]: value
        }));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError('');

        try {
            const response = await fetch('/api/Message/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newMessage)
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();

            // Clear form
            setNewMessage({
                fullName: '',
                email: '',
                phoneNumber: '',
                subject: '',
                messages: ''
            });

            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000);

            // Refresh messages list
            fetchAllMessages();

        } catch (error) {
            console.error('Error sending message:', error);
            setSubmitError('Failed to send message. Please try again.');
            setTimeout(() => setSubmitError(''), 3000);
        } finally {
            setIsSubmitting(false);
        }
    };

    async function fetchAllContactInfo() {
        try {
            const response = await fetch('/api/ContactInfo/getall');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            setContactInfo(data);
        } catch (error) {
            console.error('Error fetching Contact Information:', error);
        }
    }

    async function fetchAllOfficeHours() {
        try {
            const response = await fetch('/api/OfficeHours/getall');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            console.log('Office hours data:', data); 
            setOfficeHours(data);
        } catch (error) {
            console.error('Error fetching Office Hours:', error);
        }
    }

    async function fetchAllDeptContacts() {
        try {
            const response = await fetch('/api/DepartmentContacts/getall');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            setDeptContacts(data);
        } catch (error) {
            console.error('Error fetching Department Contacts:', error);
        }
    }

    async function fetchAllCampuses() {
        try {
            const response = await fetch('/api/CampusLocations/getall');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            setCampuses(data);
        } catch (error) {
            console.error('Error fetching Campus Locations:', error);
        }
    }

    async function fetchAllMessages() {
        try {
            const response = await fetch('/api/Message/getall');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            setMessages(data);
        } catch (error) {
            console.error('Error fetching Messages:', error);
        }
    }

    // Helper function to get icon component
    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'Mail': return <Mail className="w-10 h-10 text-blue-600 mb-4" />;
            case 'Building2': return <Building2 className="w-10 h-10 text-blue-600 mb-4" />;
            case 'HelpCircle': return <HelpCircle className="w-10 h-10 text-blue-600 mb-4" />;
            case 'Phone': return <Phone className="w-10 h-10 text-blue-600 mb-4" />;
            default: return <Mail className="w-10 h-10 text-blue-600 mb-4" />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header user={user} onLogout={onLogout} />

            {/* Page Header */}
            <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-white mb-4">Contact Us</h1>
                    <p className="text-xl text-blue-100 max-w-3xl">
                        Get in touch with us. We're here to help and answer any questions you may have.
                    </p>
                </div>
            </section>

            {/* Contact Methods */}
            <section className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-gray-900 mb-8">How Can We Help?</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        {contacts.map((contact, index) => (
                            <Card key={index}>
                                <CardContent className="p-6">
                                    {getIcon(contact.icon)}
                                    <h3 className="text-gray-900 mb-2">{contact.title}</h3>
                                    <p className="text-blue-600 mb-2">{contact.details}</p>
                                    <p className="text-sm text-gray-500">{contact.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Contact Form */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div>
                            <h2 className="text-gray-900 mb-6">Send us a Message</h2>

                            {/* Success/Error Messages */}
                            {submitSuccess && (
                                <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
                                    Message sent successfully!
                                </div>
                            )}

                            {submitError && (
                                <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
                                    {submitError}
                                </div>
                            )}

                            <Card>
                                <CardContent className="p-6">
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <Label htmlFor="name">Full Name *</Label>
                                            <Input
                                                id="name"
                                                placeholder="Enter your name"
                                                value={newMessage.fullName}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="email">Email Address *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="your.email@example.com"
                                                value={newMessage.email}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="phoneNumber">Phone Number</Label>
                                            <Input
                                                id="phoneNumber"
                                                placeholder="+92-XXX-XXXXXXX"
                                                value={newMessage.phoneNumber}
                                                onChange={handleInputChange}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="subject">Subject</Label>
                                            <Input
                                                id="subject"
                                                placeholder="How can we help?"
                                                value={newMessage.subject}
                                                onChange={handleInputChange}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="messages">Message *</Label>
                                            <Textarea
                                                id="messages"
                                                placeholder="Tell us more about your inquiry..."
                                                rows={6}
                                                value={newMessage.messages}
                                                onChange={handleInputChange}
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="animate-spin">?</span>
                                                    Sending...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Send className="w-4 h-4" />
                                                    Send Message
                                                </span>
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        <div>
                            <h2 className="text-gray-900 mb-6">Office Hours</h2>
                            <Card className="mb-6">
                                <CardContent className="p-6">
                                    <Clock className="w-10 h-10 text-blue-600 mb-4" />
                                    <div className="space-y-3">
                                        {officeHours.length > 0 ? officeHours.map((hours, index) => (
                                            <div key={index} className="flex justify-between">
                                                <span className="text-gray-600">{hours.day}:</span>
                                                <span className="text-gray-900">
                                                    {hours.status === 'Closed'
                                                        ? 'Closed'
                                                        : `${hours.openingTime} - ${hours.closingTime}`}
                                                </span>
                                            </div>
                                        )) : (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Monday - Friday:</span>
                                                    <span className="text-gray-900">8:00 AM - 5:00 PM</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Saturday:</span>
                                                    <span className="text-gray-900">9:00 AM - 2:00 PM</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Sunday:</span>
                                                    <span className="text-gray-900">Closed</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <h3 className="text-gray-900 mb-4">Campus Locations</h3>
                            {campuses.length > 0 ? campuses.map((campus, index) => (
                                <Card key={index} className="mb-4">
                                    <CardContent className="p-6">
                                        <h4 className="text-gray-900 mb-3">{campus.name}</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-start gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                <span className="text-gray-600">{campus.address}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-gray-600">{campus.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-gray-600">{campus.email}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )) : (
                                <Card className="mb-4">
                                    <CardContent className="p-6">
                                        <h4 className="text-gray-900 mb-3">Main Campus</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-start gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                <span className="text-gray-600">Main Campus, University Road, City</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-gray-600">+92-123-4567890</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-gray-600">info@college.edu.pk</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Department Contacts */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-gray-900 mb-8">Department-Wise Contacts</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {departments.length > 0 ? departments.map((dept, index) => (
                            <Card key={index}>
                                <CardContent className="p-6">
                                    <h3 className="text-gray-900 mb-4">{dept.name}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-600">{dept.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-600">{dept.email}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            // Default department contacts if none in database
                            <>
                                <Card>
                                    <CardContent className="p-6">
                                        <h3 className="text-gray-900 mb-4">Computer Science</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-600">+92-51-9085-1001</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-600">cs@college.edu.pk</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <h3 className="text-gray-900 mb-4">Business Administration</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-600">+92-51-9085-1002</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-600">business@college.edu.pk</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}