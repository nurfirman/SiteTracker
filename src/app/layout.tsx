import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/components/RoleContext";
import { ThemeProvider } from "@/components/ThemeContext";
import { AppLayoutShell } from "@/components/AppLayoutShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SiteTracker CMD - Sistem Patroli & Pelacakan Temuan Konstruksi",
  description:
    "Aplikasi manajemen patroli konstruksi, pelacakan temuan K3 & Kualitas, serta validasi perbaikan Side-by-Side.",
};

const themeScript = `
  (function() {
    try {
      const savedTheme = localStorage.getItem('sitetracker_theme');
      const isDark = savedTheme === 'dark' || (!savedTheme && true) || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.style.colorScheme = 'light';
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-violet-600 selection:text-white transition-colors duration-150">
        <ThemeProvider>
          <RoleProvider>
            <AppLayoutShell>{children}</AppLayoutShell>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
