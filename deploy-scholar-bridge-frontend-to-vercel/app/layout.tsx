import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScholarBridge — Research Collaboration & Mentorship Platform',
  description: 'Connecting students and faculty for research collaboration, auto-categorized papers, and conference showcases.',
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 font-sans antialiased flex flex-col">
        <AuthProvider>
          <Navbar />
          <div className="flex-1">
            {children}
          </div>
          <footer className="border-t border-neutral-200 bg-white py-6 mt-12 text-center text-xs text-neutral-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>© 2026 ScholarBridge. Department of Computer Science, MITS DU.</p>
              <div className="flex items-center gap-4">
                <span>Next.js + Java Spring Boot</span>
                <span>•</span>
                <span>JWT Authentication</span>
              </div>
            </div>
          </footer>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
