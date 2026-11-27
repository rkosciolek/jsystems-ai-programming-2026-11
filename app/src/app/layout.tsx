import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Hardware Service Decision Copilot",
  description:
    "Asystent decyzji serwisowych dla zgłoszeń reklamacyjnych i zwrotów sprzętu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${notoSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
