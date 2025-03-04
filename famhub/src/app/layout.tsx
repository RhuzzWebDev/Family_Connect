import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FamilyConnect - Private Family Social Platform",
  description: "A private social platform for families to share memories and stay connected through multimedia interactions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geist.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
