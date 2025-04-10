'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [userInitials, setUserInitials] = useState('');
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user profile
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
          
        if (data) {
          const initials = `${data.first_name?.charAt(0) || ''}${data.last_name?.charAt(0) || ''}`;
          setUserInitials(initials);
        }
      }
    };
    
    getUser();
  }, [supabase]);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };
  
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
            
            <div className="relative group">
              <button className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                {userInitials || 'U'}
              </button>
              
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}