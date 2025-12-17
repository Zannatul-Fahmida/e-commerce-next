"use client";

import { Suspense } from "react";
import { Sidebar } from "./Sidebar";

interface SidebarWrapperProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function SidebarSkeleton() {
  return (
    <div className="w-64 bg-white shadow-lg h-screen animate-pulse">
      <div className="p-4">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SidebarWrapper({ isOpen, onClose }: SidebarWrapperProps) {
  return (
    <Suspense fallback={<SidebarSkeleton />}>
      <Sidebar isOpen={isOpen} onClose={onClose} />
    </Suspense>
  );
}