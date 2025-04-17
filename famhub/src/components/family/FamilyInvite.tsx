'use client';

import { useState, useEffect } from 'react';
import { FamilyInviteService } from '@/services/familyInviteService';
import { FamilyService } from '@/services/familyService';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2, Users2, Link as LinkIcon, Copy, Check } from 'lucide-react';
import Image from 'next/image';

export default function FamilyInviteModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Open modal
  const openModal = async () => {
    setIsModalOpen(true);
    setClosing(false);
    setLoading(true);
    setError("");
    setInviteLink("");
    try {
      // Get current user
      const user = await FamilyService.getCurrentUser();
      if (!user.family_id) throw new Error("No family_id found for current user");
      // Create invite
      const invite = await FamilyInviteService.createInvite(user.family_id);
      if (!invite) throw new Error("Failed to generate invite link");
      const url = `${window.location.origin}/invite-register?token=${invite.invite_token}`;
      setInviteLink(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate invite link");
    } finally {
      setLoading(false);
    }
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
            className="h-full flex flex-col overflow-hidden rounded-l-2xl"
            style={{ background: '#181926', color: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 group mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullWidth(!isFullWidth);
                  }}
                  style={{ background: 'transparent', transition: 'box-shadow 0.2s' }}
                >
                  {isFullWidth ? (
                    <Minimize2 className="h-4 w-4 group-hover:text-cyan-400" style={{ transition: 'color 0.2s, box-shadow 0.2s' }} />
                  ) : (
                    <Maximize2 className="h-4 w-4 group-hover:text-cyan-400" style={{ transition: 'color 0.2s, box-shadow 0.2s' }} />
                  )}
                </Button>
                <div className="w-8 h-8 rounded-full overflow-hidden" style={{ background: '#232336' }}>
                  <Image
                    src="/logo.svg"
                    alt="Community logo"
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
                <span className="font-medium" style={{ color: '#e5e7eb' }}>Invite a Family Member</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-400 group"
                onClick={closeModal}
                style={{ background: 'transparent', transition: 'box-shadow 0.2s' }}
              >
                <X className="h-5 w-5 group-hover:text-cyan-400" style={{ transition: 'color 0.2s, box-shadow 0.2s' }} />
              </Button>
              <style>{`
                .group:hover {
                  background: transparent !important;
                }
                .group:hover .group-hover\:text-cyan-400 {
                  color: #22d3ee !important;
                  filter: drop-shadow(0 0 6px #22d3ee);
                }
              `}</style>
            </div>

            {/* Dynamic Invite Link */}
            <div className="p-6 flex-grow overflow-y-auto text-center" style={{ color: '#e5e7eb' }}>
              <div className="text-lg font-medium mb-2" style={{ color: '#fff' }}>Family Invite Link</div>
              <div className="mb-2" style={{ color: '#cbd5e1' }}>Copy the link below to invite people to your family</div>
              {loading ? (
                <div className="py-6 text-blue-400">Generating link...</div>
              ) : error ? (
                <div className="py-6 text-red-400">{error}</div>
              ) : inviteLink ? (
                <div
                  className="flex items-center justify-center gap-2 border border-dashed p-4 rounded-lg text-sm italic transition-colors cursor-pointer"
                  style={{ background: '#232336', borderColor: '#35364a', color: '#e5e7eb' }}
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  title="Click to copy invite link"
                >
                  <span className="break-all select-all" id="invite-link" style={{ color: '#fff' }}>{inviteLink}</span>
                  <LinkIcon className="h-5 w-5" style={{ color: '#a1a1aa' }} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-2"
                    onClick={e => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(inviteLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    aria-label="Copy invite link"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" style={{ color: '#a1a1aa' }} />}
                  </Button>
                </div>
              ) : null}
              {copied && <div className="mt-2 text-green-400">Copied to clipboard!</div>}
            </div>

            {/* Footer placeholder */}
            <div className="p-4 border-t text-center text-gray-400 text-sm italic" style={{ borderTop: '1px solid #232336', background: '#181926', color: '#a1a1aa' }}>
              Footer placeholder
            </div>
          </div>
        </div>
      )}
    </>
  );
}
