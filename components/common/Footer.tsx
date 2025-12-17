"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import logo from "@/public/assets/logo-2.png";
import PrivacyPolicyContent from "../home/PrivacyPolicyContent";
import TermsOfServiceContent from "../home/TermsOfServiceContent";
import ModalLayout from "./ModalLayout";
import { Instagram } from "lucide-react";

export default function Footer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<'privacy' | 'terms' | null>(null);
  const pathname = usePathname();

  const openModal = (content: 'privacy' | 'terms') => {
    setModalContent(content);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
  };

  return (
    <>
      <footer className="bg-white border-t border-[#E5E5E5B2] px-4 md:px-6">
        <div className="custom-navbar-width w-full mx-auto px-4 md:px-0 py-8 md:py-12 lg:py-16">
          {/* Main Footer Content */}
          <div className="flex w-full flex-col md:flex-row items-center justify-center text-center md:text-start md:justify-between md:mb-8 lg:mb-12">
            {/* Logo Section */}
            <div className={`${pathname === "/contact" ? "justify-between w-full" : "justify-center md:justify-start w-full md:w-auto"} flex flex-col md:flex-row gap-8 items-center`}>
              <Image
                src={logo}
                alt="Prinon"
                height={150}
                width={150}
                className="w-32 md:w-auto md:h-12"
              />

              {/* Follow Us Section */}
              <div className={`${pathname === "/contact" ? "" : "border-0 md:border-l border-[#E5E5E5B2] "} w-full md:w-auto flex items-center justify-center xl:justify-start gap-8 mb-6 md:mb-0  md:pl-8`}>
                <div>
                  <h4 className="text-lg font-semibold mb-3">Follow Us</h4>
                  <div className="flex items-center gap-3">
                    <Link
                      href="https://facebook.com"
                      aria-label="Facebook"
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors border border-[#E2E8F0]"
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </Link>
                    <Link
                      href="https://instagram.com"
                      aria-label="Instagram"
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors border border-[#E2E8F0]"
                    >
                      <Instagram className="w-4 h-4" />
                    </Link>
                    <Link
                      href="https://tiktok.com"
                      aria-label="TikTok"
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors border border-[#E2E8F0]"
                    >
                      <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </Link>
                    <Link
                      href="https://youtube.com"
                      aria-label="YouTube"
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors border border-[#E2E8F0]"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </Link>
                    <Link
                      href="https://twitter.com"
                      aria-label="Twitter"
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors border border-[#E2E8F0]"
                    >
                      <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Button */}
            {pathname !== "/contact" && (
              <button className="violet-gradient hover:scale-105 text-white px-10 py-3 rounded-full font-semibold transition-all cursor-pointer w-full md:w-fit mb-6 md:mb-0">
                Contact Us
              </button>
            )}
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-[#DBDBDB]">
            <p className="text-sm font-medium">
              Copyright © 2025. All right reserved.
            </p>
            <div className="flex items-center gap-6 mt-6 md:mt-0">
              <button
                onClick={() => openModal('privacy')}
                className="text-sm font-medium hover:text-gray-900 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => openModal('terms')}
                className="text-sm font-medium hover:text-gray-800 transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      <ModalLayout isOpen={isModalOpen} onClose={closeModal}>
        <div
          className="bg-white rounded-3xl md:rounded-[48px] w-full max-w-[1280px] mx-auto shadow-2xl relative overflow-y-scroll max-h-[95%] md:max-h-[90%] p-[32px]"
          onClick={(e) => e.stopPropagation()}
        >
          {modalContent === 'privacy' && <PrivacyPolicyContent />}
          {modalContent === 'terms' && <TermsOfServiceContent />}
        </div>
      </ModalLayout>
    </>
  );
}
