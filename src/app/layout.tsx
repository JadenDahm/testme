import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TestMe Security – Website-Sicherheit prüfen',
  description:
    'Prüfe deine Website auf Sicherheitslücken. Einfach, verständlich und vertrauenswürdig.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
