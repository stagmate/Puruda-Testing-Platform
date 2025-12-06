import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Puruda Classes Testing Platform",
  description: "The official testing platform for Puruda Classes",
};

import { Chatbot } from "@/components/chatbot"

import { GlobalHeader } from "@/components/global-header"
import { GlobalFooter } from "@/components/global-footer"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <GlobalHeader />
            <div className="flex-1">
              {children}
            </div>
            <GlobalFooter />
          </div>
          <Chatbot />
        </Providers>
      </body>
    </html>
  )
}
