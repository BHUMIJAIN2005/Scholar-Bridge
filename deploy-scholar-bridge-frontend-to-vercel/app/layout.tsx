import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { SiteFooter } from '@/components/SiteFooter';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScholarBridge | MITS Gwalior',
  description: 'Madhav Institute of Technology & Science, Gwalior — connecting students and faculty through research, mentorship, and conferences.',
  icons: {
    icon: '/mits-gwalior-logo.png',
  },
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
          <SiteFooter />
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
