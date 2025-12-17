"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { SidebarWrapper } from "@/components/common/SidebarWrapper";
import { Navbar } from "@/components/common/Navbar";
import { Hero } from "@/components/home/Hero";
import Footer from "@/components/common/Footer";

const Features = dynamic(() => import("@/components/home/Features").then(m => m.Features));
const DailyDeals = dynamic(() => import("@/components/home/DailyDeals"));

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary-50/60 to-secondary-50/60">
      <SidebarWrapper isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
        <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="p-4 sm:p-6">
          {/* Hero Section */}
          <Hero />

          {/* Features Section */}
          <Features />
          <DailyDeals />
        </main>
          <Footer />
      </div>
    </div>
  );
}
