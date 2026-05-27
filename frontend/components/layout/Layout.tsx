import React from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans antialiased">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
