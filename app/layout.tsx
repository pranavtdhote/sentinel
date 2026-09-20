import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/lib/auth/AuthContext';

export const viewport: Viewport = {
  themeColor: '#0B0F17',
};

export const metadata: Metadata = {
  title: 'SENTINEL — AI Incident Intelligence & Autonomous Response Platform',
  description:
    'Production-grade SRE incident intelligence platform powered by Amazon Bedrock, Bedrock Knowledge Bases, DynamoDB single-table, and cryptographic human-in-the-loop remediation.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/favicon.ico'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-canvas text-ink-primary antialiased selection:bg-amber-accent selection:text-ink-primary">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
