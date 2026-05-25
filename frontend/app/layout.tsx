import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlphaResearch - Institutional Equity Intelligence",
  description: "Elite 3-Check equity screening for US and UK markets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh" }}>{children}</body>
    </html>
  );
}
