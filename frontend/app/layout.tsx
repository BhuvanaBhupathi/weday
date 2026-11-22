import type { Metadata } from 'next';
import { Inter, Inconsolata } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400'],
  variable: '--font-inter',
  display: 'swap',
});

const inconsolata = Inconsolata({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inconsolata',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WEday - Collaborative Software Development Workspace(week end day)',
  description:
    'Connect project planning, visual design, architecture, code discussions, and GitHub workflows in one persistent environment.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full ${inter.variable} ${inconsolata.variable}`}>
      <body className="h-full w-full bg-[#030509] text-slate-100 antialiased font-sans select-none overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
