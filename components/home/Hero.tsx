"use client";

import Link from "next/link";

export const Hero = () => {
  return (
    <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-secondary-600 text-white p-6 sm:p-8 rounded-2xl mb-8 shadow-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between">
        <div className="text-center sm:text-left mb-4 sm:mb-0">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-primary-100 bg-clip-text text-transparent">
            BUY ANYTHING FOR YOUR BABY
          </h1>
          <p className="text-base sm:text-lg opacity-90 text-white">
            Discover amazing products at great prices
          </p>
          <div className="mt-4">
            <Link href="/products">
              <button className="bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors shadow-md">
                Shop Now
              </button>
            </Link>
          </div>
        </div>
        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
          <span className="text-4xl sm:text-6xl">👶</span>
        </div>
      </div>
    </div>
  );
};
