'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2, Users2, Link as LinkIcon, Copy, Check } from 'lucide-react';
import Image from 'next/image';

export default function FamilyInviteModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Open modal
  const openModal = () => {
    setIsModalOpen(true);
    setClosing(false);
  };

  // Close modal with animation
  const closeModal = () => {
    setClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setClosing(false);
    }, 500); // Match transition duration
  };

  return (
    <>
      <Button onClick={openModal}>
        <span className="mr-2"><Users2 className="h-4 w-4" /></span>
        Invite Family Member
      </Button>

      {isModalOpen && (
        <div 
          className={`fixed inset-y-0 right-0 z-50 w-full ${isFullWidth ? 'md:w-full' : 'md:w-1/2'} bg-black/70 transition-all duration-700 ease-in-out
            ${closing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
          `}
          onClick={closeModal}
        >
          <div
            className="h-full bg-white flex flex-col overflow-hidden rounded-l-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-gray-900 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullWidth(!isFullWidth);
                  }}
                >
                  {isFullWidth ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden">
                  <Image
                    src="/logo.svg"
                    alt="Community logo"
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
                <span className="font-medium">Invite a Family Member</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-500 hover:text-gray-900" 
                onClick={closeModal}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Placeholder: Invite Link */}
            <div className="p-6 flex-grow overflow-y-auto text-center text-gray-600">
              <div className="text-lg font-medium mb-2">Family Invite Link</div>
              <div className="mb-2">Copy the link below to invite people to your family</div>
              <div
                className="flex items-center justify-center gap-2 bg-gray-100 border border-dashed border-gray-400 p-4 rounded-lg text-sm italic transition-colors cursor-pointer hover:bg-gray-200"
                onClick={() => {
                  navigator.clipboard.writeText('https://yourapp.com/invite/family/placeholder-link');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                title="Click to copy invite link"
              >
                <span className="break-all select-all" id="invite-link">https://yourapp.com/invite/family/placeholder-link</span>
                <LinkIcon className="h-5 w-5 text-gray-500" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="ml-2"
                  onClick={e => {
                    e.stopPropagation();
                    navigator.clipboard.writeText('https://yourapp.com/invite/family/placeholder-link');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  aria-label="Copy invite link"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Footer placeholder */}
            <div className="p-4 border-t text-center text-gray-400 text-sm italic">
              Footer placeholder
            </div>
          </div>
        </div>
      )}
    </>
  );
}
