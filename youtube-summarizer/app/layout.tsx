import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YouTube Summarizer',
  description: 'Generate summaries of YouTube videos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="container mx-auto py-4 px-4">
          {children}
        </main>
      </body>
    </html>
  );
} 