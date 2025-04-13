import type { Metadata } from 'next';
import Link from 'next/link';
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
        <header className="bg-blue-600 text-white shadow-md">
          <div className="container mx-auto p-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">YouTube Summarizer</Link>
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <Link href="/" className="hover:underline">Home</Link>
                </li>
                <li>
                  <Link href="/subscriptions" className="hover:underline">Subscriptions</Link>
                </li>
                <li>
                  <Link href="/summaries" className="hover:underline">Summaries</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="container mx-auto py-8 px-4">
          {children}
        </main>
        <footer className="bg-gray-100 border-t mt-12">
          <div className="container mx-auto p-4 text-center text-gray-600">
            <p>YouTube Summarizer &copy; {new Date().getFullYear()}</p>
          </div>
        </footer>
      </body>
    </html>
  );
} 