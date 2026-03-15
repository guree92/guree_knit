import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const npsFont = localFont({
  src: [
    {
      path: "../public/fonts/NPSfont_regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/NPSfont_bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-nps",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knit.GUREE",
  description: "도안을 공유하고, 작품을 기록하고, 뜨개마당에서 소통하는 뜨개 아카이브 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${npsFont.className} ${npsFont.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
