import type { Metadata } from "next";
import { Geist, Geist_Mono, Great_Vibes, Quicksand } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  weight: "400",
  variable: "--font-great-vibes",
  subsets: ["latin"],
});

const quicksand = Quicksand({
    variable: "--font-quicksand",
    subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SelfTest",
  description: "A study tool for converting notes into practice questions",
  icons: {
    icon: "/icon-dark.ico",
    shortcut: "/icon-dark.ico",
    apple: "/icon-dark.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${greatVibes.variable} ${quicksand.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
