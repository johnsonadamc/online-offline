'use client';

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-primary-600">
            Magazine Creator
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link 
              href="/dashboard" 
              className="text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </nav>
        </div>
      </div>
    </header>
  );
}
