import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/layout/Layout";

export const metadata: Metadata = {
  title: "AlphaResearch — Institutional Equity Intelligence",
  description: "3-Check institutional equity scanner: Fundamentals · Technical Phase · Smart Money",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
