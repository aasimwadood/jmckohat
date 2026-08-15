import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_FOOTER = {
  location: "Main Campus, University Road, Kohat",
  phone_no: "+92-123-4567890",
  email: "info@gpgckohat.edu.pk",
  copyright: "GPGC Kohat. All rights reserved.",
};

export async function Footer() {
  const supabase = await createClient();
  const { data } = await supabase.from("footer_info").select("location, phone_no, email, copyright").limit(1);
  const footer = data?.[0] ?? DEFAULT_FOOTER;

  return (
    <footer className="mt-auto bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">About Us</h3>
            <p className="text-sm leading-relaxed">
              Leading educational institution committed to excellence in academics and character development.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="transition-colors duration-200 hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition-colors duration-200 hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/downloads" className="transition-colors duration-200 hover:text-white">
                  Downloads
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition-colors duration-200 hover:text-white">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Academics</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/departments" className="transition-colors duration-200 hover:text-white">
                  Departments
                </Link>
              </li>
              <li>
                <Link href="/programs" className="transition-colors duration-200 hover:text-white">
                  Programs
                </Link>
              </li>
              <li>
                <Link href="/faculty" className="transition-colors duration-200 hover:text-white">
                  Faculty
                </Link>
              </li>
              <li>
                <Link href="/fee-structure" className="transition-colors duration-200 hover:text-white">
                  Fee Structure
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">Contact Info</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                <span className="leading-relaxed">{footer.location}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 flex-shrink-0 text-gray-400" />
                <span>{footer.phone_no}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 flex-shrink-0 text-gray-400" />
                <a href={`mailto:${footer.email}`} className="transition-colors duration-200 hover:text-white">
                  {footer.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-800 pt-8 text-center text-sm">
          <p className="text-gray-400">
            &copy; {new Date().getFullYear()} {footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
