"use client"

import { ReactNode } from "react";

interface ModalLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function ModalLayout({ isOpen, onClose, children }: ModalLayoutProps) {
  return (
    <div>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={onClose}
        >
          {children}
        </div>
      )}
    </div>
  )
}