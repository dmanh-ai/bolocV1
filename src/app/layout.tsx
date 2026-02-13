import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VN Sniper - Bộ lọc cổ phiếu Việt Nam",
  description: "Công cụ lọc và phân tích cổ phiếu Việt Nam thông minh. Tìm cổ phiếu tiềm năng theo P/E, P/B, ROE và các chỉ số tài chính khác.",
  keywords: ["VN Sniper", "cổ phiếu", "chứng khoán", "Việt Nam", "stock screener", "P/E", "ROE", "đầu tư"],
  authors: [{ name: "VN Sniper Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "VN Sniper - Bộ lọc cổ phiếu Việt Nam",
    description: "Công cụ lọc và phân tích cổ phiếu Việt Nam thông minh",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
