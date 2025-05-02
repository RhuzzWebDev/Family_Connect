"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FamilyService } from "@/services/familyService";

interface CreateFamilyModalProps {
  onFamilyCreated?: (familyId: string) => void;
  trigger?: React.ReactNode;
  forceOpen?: boolean;
}

export function CreateFamilyModal({ onFamilyCreated, trigger, forceOpen = false }: CreateFamilyModalProps) {
  const [open, setOpen] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateFamily = async () => {
    setLoading(true);
    setError(null);
    try {
      const userEmail = sessionStorage.getItem("userEmail");
      const userId = sessionStorage.getItem("userId");
      if (!userEmail || !userId) {
        setError("User not authenticated.");
        setLoading(false);
        return;
      }
      const familyId = await FamilyService.createFamily(familyName, userId, userEmail);
      // Update sessionStorage with new family_id so client always has latest
      sessionStorage.setItem('familyId', familyId);
      setLoading(false);
      setOpen(false);
      setFamilyName("");
      if (onFamilyCreated) onFamilyCreated(familyId);
      // Force a page reload to refresh all state and close modal
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to create family.");
      setLoading(false);
    }
  };

  // If forceOpen is true, modal is always open and cannot be closed
  const dialogOpen = forceOpen ? true : open;
  const onOpenChange = forceOpen ? undefined : setOpen;

  return (
    <Dialog open={dialogOpen} onOpenChange={onOpenChange} modal={true}>
      {!forceOpen && (trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline">Create Family</Button>
        </DialogTrigger>
      ))}
      <DialogContent
        onInteractOutside={forceOpen ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={forceOpen ? (e) => e.preventDefault() : undefined}
        className={
          (forceOpen ? 'pointer-events-auto ' : '') +
          'p-0 bg-[#181926] text-white rounded-xl shadow-2xl max-w-md w-full'
        }
      >
        {/* Accessibility: hidden DialogTitle for screen readers */}
        <DialogTitle>
          <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
            Create Your Family
          </span>
        </DialogTitle>
        <div className="flex flex-col items-center justify-center py-8 px-6">
          <div className="flex items-center justify-center mb-4 bg-[#232336] rounded-full w-16 h-16">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-blue-400"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3a1 1 0 001 1h14a1 1 0 001-1v-3c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{color:'#fff'}}>Create Your Family</h2>
          <p className="text-base text-gray-300 mb-6 text-center max-w-xs">
            Welcome! To get started, please enter your family last name. This will create your family group so you can invite members and access all features.
          </p>
          <div className="w-full space-y-2 mb-4">
            <Label htmlFor="familyName" className="block text-gray-200 text-sm font-semibold mb-1">Family Last Name</Label>
            <Input
              id="familyName"
              className="bg-[#232336] border border-[#35364a] text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 text-lg px-4 py-3 rounded-md w-full"
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              placeholder="E.g. Smith, Garcia, Lee..."
              disabled={loading}
              autoFocus
            />
            {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
          </div>
          <Button
            onClick={handleCreateFamily}
            disabled={loading || !familyName}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md text-base mt-2"
            size="lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Creating...</span>
            ) : (
              'Create Family'
            )}
          </Button>
          {/* Remove Cancel button if forceOpen is true */}
          {!forceOpen && (
            <DialogFooter className="w-full mt-2">
              <DialogClose asChild>
                <Button variant="ghost" className="w-full">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
