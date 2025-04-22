import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Use the Inter font
const inter = Inter({ subsets: ["latin"] });

// Metadata for SEO and browser tab
export const metadata: Metadata = {
  title: "Stock Exchange Platform",
  description: "A modern platform for trading stocks and managing portfolios",
};

// Root layout component that wraps all pages
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
