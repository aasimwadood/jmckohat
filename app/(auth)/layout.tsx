import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <GraduationCap className="h-12 w-12 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">College Portal</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
