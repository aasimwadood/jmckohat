import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { User } from '../App';
import logo from '../assets/image/logo.png';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
    setMobileMenuOpen(false);
  };
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    // Search through available pages and content
    const allPages = [
      { title: 'Home', path: '/', keywords: ['home', 'main', 'index'] },
      { title: 'About Us', path: '/about', keywords: ['about', 'information', 'history'] },
      { title: 'Departments', path: '/departments', keywords: ['departments', 'computer science', 'mathematics', 'physics', 'chemistry'] },
      { title: 'Programs', path: '/programs', keywords: ['programs', 'courses', 'degree', 'masters', 'msc', 'ma'] },
      { title: 'Faculty', path: '/faculty', keywords: ['faculty', 'teachers', 'professors', 'staff'] },
      { title: 'How to Apply', path: '/how-to-apply', keywords: ['apply', 'admission', 'application'] },
      { title: 'Requirements', path: '/requirements', keywords: ['requirements', 'eligibility', 'criteria'] },
      { title: 'Fee Structure', path: '/fee-structure', keywords: ['fee', 'fees', 'cost', 'tuition', 'charges'] },
      { title: 'Contact Us', path: '/contact', keywords: ['contact', 'email', 'phone', 'address'] },
      { title: 'Downloads', path: '/downloads', keywords: ['downloads', 'forms', 'documents', 'prospectus'] },
      { title: 'Login', path: '/login', keywords: ['login', 'signin', 'portal'] },
      { title: 'Register', path: '/register', keywords: ['register', 'signup', 'create account'] },
    ];
    const results = allPages.filter(page => {
      const searchLower = query.toLowerCase();
      return page.title.toLowerCase().includes(searchLower) ||
             page.keywords.some(keyword => keyword.includes(searchLower));
    });
    setSearchResults(results.slice(0, 5));
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Main Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Institution Name */}
            <Link to="/" className="flex items-center gap-4 group">
              <div className="relative">
                {/* College Logo */}
                <div className="w-12 h-12 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <img src={logo} alt="GPGC Kohat Logo" className="w-full h-full object-contain" />
                </div>
              </div>

              <div className="hidden lg:flex flex-col">
                <span className="text-sm font-light tracking-wider text-gray-300">Government Postgraduate</span>
                <span className="text-lg leading-tight tracking-wide">College Kohat</span>
              </div>

              <div className="lg:hidden">
                <span className="text-lg tracking-wide">GPC Kohat</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <NavLink to="/">Home</NavLink>
              <NavLink to="/about">About</NavLink>

              {/* Academics Dropdown */}
              <div className="relative group">
                <button className="px-4 py-2 text-sm hover:text-blue-400 transition-colors flex items-center gap-1">
                  Academics
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white text-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link to="/departments" className="block px-4 py-3 hover:bg-blue-50 text-sm transition-colors">
                    Departments
                  </Link>
                  <Link to="/programs" className="block px-4 py-3 hover:bg-blue-50 text-sm transition-colors">
                    Programs
                  </Link>
                  <Link to="/faculty" className="block px-4 py-3 hover:bg-blue-50 text-sm transition-colors">
                    Faculty
                  </Link>
                </div>
              </div>

              {/* Admissions Dropdown */}
              <div className="relative group">
                <button className="px-4 py-2 text-sm hover:text-blue-400 transition-colors flex items-center gap-1">
                  Admissions
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white text-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link to="/how-to-apply" className="block px-4 py-3 hover:bg-blue-50 text-sm transition-colors">
                    How to Apply
                  </Link>
                  <Link to="/requirements" className="block px-4 py-3 hover:bg-blue-50 text-sm transition-colors">
                    Requirements
                  </Link>
                  <Link to="/fee-structure" className="block px-4 py-3 hover:bg-blue-50 text-sm transition-colors">
                    Fee Structure
                  </Link>
                </div>
              </div>

              <NavLink to="/contact">Contact</NavLink>
              <NavLink to="/downloads">Downloads</NavLink>

              {user && (
                <button
                  onClick={handleLogout}
                  className="ml-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Logout
                </button>
              )}

              {!user && (
                <Link to="/login">
                  <button className="ml-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    Login
                  </button>
                </Link>
              )}
            </nav>

            {/* Search and Mobile Menu */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-10 h-10 rounded-full bg-yellow-500 hover:bg-yellow-400 flex items-center justify-center transition-all hover:scale-105 shadow-lg"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-slate-900" />
              </button>

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden w-10 h-10 flex items-center justify-center"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Search Bar (Expandable) */}
          {searchOpen && (
            <div className="py-4 animate-in slide-in-from-top duration-200">
              <div className="relative max-w-2xl mx-auto">
                <input
                  type="text"
                  placeholder="Search for programs, faculty, resources..."
                  className="w-full px-4 py-3 pl-12 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white text-gray-900 shadow-lg rounded-lg mt-2 overflow-hidden z-50">
                    <ul className="divide-y divide-gray-200">
                      {searchResults.map((result, index) => (
                        <li key={index}>
                          <Link
                            to={result.path}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                            className="block px-4 py-3 hover:bg-blue-50 transition-colors"
                          >
                            <div className="text-sm">{result.title}</div>
                            <div className="text-xs text-gray-500">{result.path}</div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 w-full bg-white text-gray-900 shadow-lg rounded-lg mt-2 p-4 z-50">
                    <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-700 animate-in slide-in-from-top duration-200">
          <nav className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col gap-2">
              <MobileNavLink to="/" onClick={() => setMobileMenuOpen(false)}>
                Home
              </MobileNavLink>
              <MobileNavLink to="/about" onClick={() => setMobileMenuOpen(false)}>
                About Us
              </MobileNavLink>

              <div className="border-t border-slate-700 my-2 pt-2">
                <p className="text-xs text-gray-400 px-3 mb-2">ACADEMICS</p>
                <MobileNavLink to="/departments" onClick={() => setMobileMenuOpen(false)}>
                  Departments
                </MobileNavLink>
                <MobileNavLink to="/programs" onClick={() => setMobileMenuOpen(false)}>
                  Programs
                </MobileNavLink>
                <MobileNavLink to="/faculty" onClick={() => setMobileMenuOpen(false)}>
                  Faculty
                </MobileNavLink>
              </div>

              <div className="border-t border-slate-700 my-2 pt-2">
                <p className="text-xs text-gray-400 px-3 mb-2">ADMISSIONS</p>
                <MobileNavLink to="/how-to-apply" onClick={() => setMobileMenuOpen(false)}>
                  How to Apply
                </MobileNavLink>
                <MobileNavLink to="/requirements" onClick={() => setMobileMenuOpen(false)}>
                  Requirements
                </MobileNavLink>
                <MobileNavLink to="/fee-structure" onClick={() => setMobileMenuOpen(false)}>
                  Fee Structure
                </MobileNavLink>
              </div>

              <MobileNavLink to="/contact" onClick={() => setMobileMenuOpen(false)}>
                Contact Us
              </MobileNavLink>
              <MobileNavLink to="/downloads" onClick={() => setMobileMenuOpen(false)}>
                Downloads
              </MobileNavLink>

              {user && (
                <button
                  onClick={handleLogout}
                  className="mt-2 px-4 py-3 text-sm text-left text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Logout
                </button>
              )}

              {!user && (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className="mt-2 w-full px-4 py-3 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    Login
                  </button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// Desktop Nav Link Component
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-4 py-2 text-sm hover:text-blue-400 transition-colors relative group"
    >
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
    </Link>
  );
}

// Mobile Nav Link Component
function MobileNavLink({
  to,
  onClick,
  children
}: {
  to: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
    >
      {children}
    </Link>
  );
}
