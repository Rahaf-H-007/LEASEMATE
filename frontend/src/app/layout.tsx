import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { MessagesProvider } from "@/contexts/MessagesContext";
import BlockGuard from "@/components/BlockGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeaseMate - Smart Rentals, Simplified",
  description: "Simplify and digitize the rental process for landlords and tenants in Egypt",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          as="style" 
          href="https://fonts.googleapis.com/css2?display=swap&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800" 
          rel="stylesheet" 
        />
        <link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
  integrity="sha512-papm6Q+...=="
  crossOrigin="anonymous"
  referrerPolicy="no-referrer"
/>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <BlockGuard>
              <NotificationsProvider>
                <MessagesProvider>
                  {children}
                </MessagesProvider>
              </NotificationsProvider>
            </BlockGuard>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

