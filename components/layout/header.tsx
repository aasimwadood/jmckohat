"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Search, ChevronDown } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

type SearchResult = { title: string; path: string };

const SEARCHABLE_PAGES: { title: string; path: string; keywords: string[] }[] = [
  { title: "Home", path: "/", keywords: ["home", "main", "index"] },
  { title: "About Us", path: "/about", keywords: ["about", "information", "history"] },
  {
    title: "Departments",
    path: "/departments",
    keywords: ["departments", "computer science", "mathematics", "physics", "chemistry"],
  },
  { title: "Programs", path: "/programs", keywords: ["programs", "courses", "degree", "masters", "msc", "ma"] },
  { title: "Faculty", path: "/faculty", keywords: ["faculty", "teachers", "professors", "staff"] },
  { title: "How to Apply", path: "/how-to-apply", keywords: ["apply", "admission", "application"] },
  { title: "Requirements", path: "/requirements", keywords: ["requirements", "eligibility", "criteria"] },
  { title: "Fee Structure", path: "/fee-structure", keywords: ["fee", "fees", "cost", "tuition", "charges"] },
  { title: "Contact Us", path: "/contact", keywords: ["contact", "email", "phone", "address"] },
  { title: "Downloads", path: "/downloads", keywords: ["downloads", "forms", "documents", "prospectus"] },
  { title: "Login", path: "/login", keywords: ["login", "signin", "portal"] },
  { title: "Register", path: "/register", keywords: ["register", "signup", "create account"] },
];

export function Header({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const searchLower = query.toLowerCase();
    const results = SEARCHABLE_PAGES.filter(
      (page) =>
        page.title.toLowerCase().includes(searchLower) ||
        page.keywords.some((keyword) => keyword.includes(searchLower)),
    );
    setSearchResults(results.slice(0, 5));
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="group flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center transition-all duration-300 group-hover:scale-105">
                <Image src="/images/logo.png" alt="GPGC Kohat Logo" width={48} height={48} className="h-full w-full object-contain" />
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-sm font-light tracking-wider text-gray-300">Government Postgraduate</span>
                <span className="text-lg leading-tight tracking-wide">College Kohat</span>
              </div>
              <div className="lg:hidden">
                <span className="text-lg tracking-wide">GPC Kohat</span>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              <NavLink href="/">Home</NavLink>
              <NavLink href="/about">About</NavLink>

              <div className="group relative">
                <button className="flex items-center gap-1 px-4 py-2 text-sm transition-colors hover:text-blue-400">
                  Academics
                  <ChevronDown className="h-3 w-3" />
                </button>
                <div className="invisible absolute top-full left-0 mt-1 w-48 rounded-lg bg-white text-gray-800 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  <Link href="/departments" className="block px-4 py-3 text-sm transition-colors hover:bg-blue-50">
                    Departments
                  </Link>
                  <Link href="/programs" className="block px-4 py-3 text-sm transition-colors hover:bg-blue-50">
                    Programs
                  </Link>
                  <Link href="/faculty" className="block px-4 py-3 text-sm transition-colors hover:bg-blue-50">
                    Faculty
                  </Link>
                </div>
              </div>

              <div className="group relative">
                <button className="flex items-center gap-1 px-4 py-2 text-sm transition-colors hover:text-blue-400">
                  Admissions
                  <ChevronDown className="h-3 w-3" />
                </button>
                <div className="invisible absolute top-full left-0 mt-1 w-48 rounded-lg bg-white text-gray-800 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  <Link href="/how-to-apply" className="block px-4 py-3 text-sm transition-colors hover:bg-blue-50">
                    How to Apply
                  </Link>
                  <Link href="/requirements" className="block px-4 py-3 text-sm transition-colors hover:bg-blue-50">
                    Requirements
                  </Link>
                  <Link href="/fee-structure" className="block px-4 py-3 text-sm transition-colors hover:bg-blue-50">
                    Fee Structure
                  </Link>
                </div>
              </div>

              <NavLink href="/contact">Contact</NavLink>
              <NavLink href="/downloads">Downloads</NavLink>

              {isAuthenticated ? (
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="ml-2 rounded-lg bg-red-600 px-4 py-2 text-sm transition-colors hover:bg-red-700"
                  >
                    Logout
                  </button>
                </form>
              ) : (
                <Link href="/login">
                  <button className="ml-2 rounded-lg bg-blue-600 px-4 py-2 text-sm transition-colors hover:bg-blue-700">
                    Login
                  </button>
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 shadow-lg transition-all hover:scale-105 hover:bg-yellow-400"
                aria-label="Search"
              >
                <Search className="h-5 w-5 text-slate-900" />
              </button>

              <button
                className="flex h-10 w-10 items-center justify-center lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="animate-in slide-in-from-top py-4 duration-200">
              <div className="relative mx-auto max-w-2xl">
                <input
                  type="text"
                  placeholder="Search for programs, faculty, resources..."
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 pl-12 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
                <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-lg bg-white text-gray-900 shadow-lg">
                    <ul className="divide-y divide-gray-200">
                      {searchResults.map((result) => (
                        <li key={result.path}>
                          <Link
                            href={result.path}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery("");
                              setSearchResults([]);
                            }}
                            className="block px-4 py-3 transition-colors hover:bg-blue-50"
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
                  <div className="absolute top-full left-0 z-50 mt-2 w-full rounded-lg bg-white p-4 text-gray-900 shadow-lg">
                    <p className="text-sm text-gray-500">No results found for &quot;{searchQuery}&quot;</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="animate-in slide-in-from-top border-b border-slate-700 bg-slate-900 duration-200 lg:hidden">
          <nav className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex flex-col gap-2">
              <MobileNavLink href="/" onClick={() => setMobileMenuOpen(false)}>
                Home
              </MobileNavLink>
              <MobileNavLink href="/about" onClick={() => setMobileMenuOpen(false)}>
                About Us
              </MobileNavLink>

              <div className="my-2 border-t border-slate-700 pt-2">
                <p className="mb-2 px-3 text-xs text-gray-400">ACADEMICS</p>
                <MobileNavLink href="/departments" onClick={() => setMobileMenuOpen(false)}>
                  Departments
                </MobileNavLink>
                <MobileNavLink href="/programs" onClick={() => setMobileMenuOpen(false)}>
                  Programs
                </MobileNavLink>
                <MobileNavLink href="/faculty" onClick={() => setMobileMenuOpen(false)}>
                  Faculty
                </MobileNavLink>
              </div>

              <div className="my-2 border-t border-slate-700 pt-2">
                <p className="mb-2 px-3 text-xs text-gray-400">ADMISSIONS</p>
                <MobileNavLink href="/how-to-apply" onClick={() => setMobileMenuOpen(false)}>
                  How to Apply
                </MobileNavLink>
                <MobileNavLink href="/requirements" onClick={() => setMobileMenuOpen(false)}>
                  Requirements
                </MobileNavLink>
                <MobileNavLink href="/fee-structure" onClick={() => setMobileMenuOpen(false)}>
                  Fee Structure
                </MobileNavLink>
              </div>

              <MobileNavLink href="/contact" onClick={() => setMobileMenuOpen(false)}>
                Contact Us
              </MobileNavLink>
              <MobileNavLink href="/downloads" onClick={() => setMobileMenuOpen(false)}>
                Downloads
              </MobileNavLink>

              {isAuthenticated ? (
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="mt-2 w-full rounded-lg bg-red-600 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-red-700"
                  >
                    Logout
                  </button>
                </form>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm text-white transition-colors hover:bg-blue-700">
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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group relative px-4 py-2 text-sm transition-colors hover:text-blue-400">
      {children}
      <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-blue-400 transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-lg px-3 py-3 text-sm text-gray-300 transition-colors hover:bg-slate-800 hover:text-white"
    >
      {children}
    </Link>
  );
}
