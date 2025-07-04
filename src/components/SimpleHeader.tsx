'use client';

import { SignedIn, SignedOut, SignInButton, UserButton, useClerk } from '@clerk/nextjs';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SimpleHeader() {
  const { signOut } = useClerk();

  const handleLogout = () => {
    signOut();
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-slate-900/95 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19,22H5V20H19V22M18,14V10L17,10L15,10C15,8.3 13.7,7 12,7C10.3,7 9,8.3 9,10L7,10L6,10V14H7L8,14V18H16V14L17,14H18M15,10H9V11H15V10M14,12H10V13H14V12Z"/>
              </svg>
            </div>
            <span className="text-white text-xl font-bold">ChessMaster</span>
          </div>

          {/* Right side - Profile and Logout */}
          <div className="flex items-center space-x-3">
            <SignedIn>
              <div className="flex items-center space-x-3">
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8"
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="border-red-400 text-red-400 hover:bg-red-400/10 flex items-center gap-1"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline" size="sm" className="border-purple-400 text-purple-400 hover:bg-purple-400/10">
                  <User className="h-4 w-4 mr-1" />
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
} 