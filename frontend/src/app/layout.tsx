import '../styles/globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'Manpower Agency ERP | Workforce & Operations Management',
  description: 'Enterprise resource planning platform for manpower staffing, dispatch, Indian statutory payroll, and client billing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
