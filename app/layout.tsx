import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'SENTINEL — AI Incident Intelligence & Autonomous Response Platform',
  description:
    'Production-grade SRE incident intelligence platform powered by Amazon Bedrock, Bedrock Knowledge Bases, DynamoDB single-table, and cryptographic human-in-the-loop remediation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink-primary antialiased selection:bg-amber-accent selection:text-ink-primary">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
