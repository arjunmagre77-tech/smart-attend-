import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "SmartAttend — RFID Attendance Management",
    template: "%s | SmartAttend",
  },
  description:
    "SmartAttend is a smart RFID-based attendance management system for schools. Track student attendance in real-time, notify parents, and generate reports.",
  keywords: ["attendance", "RFID", "school", "students", "management", "ESP32"],
  robots: "noindex, nofollow", // School management — not for public indexing
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.variable} suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "10px",
              fontSize: "13.5px",
            },
          }}
        />
      </body>
    </html>
  );
}
