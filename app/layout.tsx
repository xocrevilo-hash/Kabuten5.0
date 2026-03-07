import type { Metadata } from 'next';
import './globals.css';
import PasswordGate from '@/components/PasswordGate';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Kabuten 5.0',
  description: 'AI-powered equity research platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PasswordGate>
          <div className="kanji-wallpaper">
            <NavBar />
            <main style={{ minHeight: 'calc(100vh - 56px)' }}>
              {children}
            </main>
          </div>
        </PasswordGate>
      </body>
    </html>
  );
}
