'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  FormField,
  Input,
  Alert,
  Stack,
  useToast,
} from '@mp/dying';
import { Trash2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({
  open,
  onOpenChange,
  onDeleted,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuthStore();
  const { toast } = useToast();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim() !== 'DELETE') {
      setError('Type DELETE in all caps to confirm.');
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirm: 'DELETE' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      await logout();
      toast({ title: 'Account deleted', description: 'Your account and library data have been removed.', variant: 'default' });
      onOpenChange(false);
      onDeleted?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md select-none">
        <DialogHeader>
          <DialogTitle>Delete Account Permanently</DialogTitle>
          <DialogDescription>
            This permanently deletes your profile, playlists, liked songs, and listening history. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDelete}>
          <Stack gap="4" className="py-2">
            {error && <Alert variant="error">{error}</Alert>}
            <FormField label="Type DELETE to confirm" id="delete-confirm-input" required>
              <Input
                id="delete-confirm-input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </FormField>
          </Stack>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              disabled={confirmText.trim() !== 'DELETE'}
              leftIcon={<Trash2 size={14} />}
            >
              Delete Forever
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
