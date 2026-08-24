import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/components/RoleContext";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable}`}>
      <body className="min-h-screen bg-slate-950 font-sans antialiased selection:bg-yellow-500 selection:text-slate-950">
        <RoleProvider>
          <AppLayoutShell>{children}</AppLayoutShell>
        </RoleProvider>
      </body>
    </html>
  );
}
