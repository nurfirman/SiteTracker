import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/components/RoleContext";
import { Navbar } from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SiteTracker CMD - Sistem Pencatatan Patroli & Pelacakan Temuan",
  description:
    "Aplikasi pencatatan patroli lapangan, pelacakan temuan K3 & Kualitas, dan validasi perbaikan konstruksi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable}`}>
      <body className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased pb-20 md:pb-8">
        <RoleProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </RoleProvider>
      </body>
    </html>
  );
}
