'use client';

import React, { useState } from 'react';
import {
  DialogFooter,
  Button,
  Badge,
  Stack,
  Flex,
  Box,
  Text,
  Separator,
  useToast,
} from '@mp/dying';
import { LogOut, Sparkles, MailCheck } from 'lucide-react';
import { type UserProfile } from '../../stores/authStore';
import { authClient } from '../../lib/auth-client';

export interface UserProfileViewProps {
  user: UserProfile | null;
  onLogout: () => void;
  onClose: () => void;
}

export function UserProfileView({ user, onLogout, onClose }: UserProfileViewProps) {
  const { toast } = useToast();
  const [sendingVerify, setSendingVerify] = useState(false);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setSendingVerify(true);
    try {
      const res = await authClient.sendVerificationEmail({
        email: user.email,
        callbackURL: window.location.origin,
      });
      if (res?.error) {
        toast({ title: 'Verification failed', description: res.error.message, variant: 'error' });
      } else {
        toast({ title: 'Verification email sent', description: `Check ${user.email}`, variant: 'success' });
      }
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err?.message, variant: 'error' });
    } finally {
      setSendingVerify(false);
    }
  };

  return (
    <Stack gap="4" className="py-4">
      <Flex
        justify="between"
        align="center"
        className="p-3 rounded-xl bg-surface-active border border-border-subtle"
      >
        <Flex align="center" gap="2">
          <Sparkles size={16} className="text-accent" />
          <Stack gap="1">
            <Text size="xs" weight="semibold">
              GaneGan Unlimited
            </Text>
            <Text size="xs" color="tertiary">
              Ad-free InnerTube streaming & cloud sync
            </Text>
          </Stack>
        </Flex>
        <Badge variant="glass" size="sm">
          Active
        </Badge>
      </Flex>

      <Box className="p-3 rounded-xl bg-surface border border-border-subtle">
        <Stack gap="2">
          <Flex justify="between" align="center">
            <Text size="xs" color="secondary">
              Account Name
            </Text>
            <Text size="xs" weight="medium">
              {user?.name}
            </Text>
          </Flex>
          <Separator />
          <Flex justify="between" align="center">
            <Text size="xs" color="secondary">
              Email Address
            </Text>
            <Flex align="center" gap="2">
              <Text size="xs" weight="medium">
                {user?.email}
              </Text>
              <Badge variant={user?.emailVerified ? 'success' : 'warning'} size="sm">
                {user?.emailVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </Flex>
          </Flex>
          {!user?.emailVerified && (
            <Flex justify="end">
              <Button
                type="button"
                variant="outline"
                size="xs"
                isLoading={sendingVerify}
                leftIcon={<MailCheck size={12} />}
                onClick={handleResendVerification}
              >
                Resend verification email
              </Button>
            </Flex>
          )}
        </Stack>
      </Box>

      <Separator className="my-1" />

      <DialogFooter className="pt-2 flex items-center justify-between">
        <Button
          type="button"
          variant="danger"
          size="sm"
          leftIcon={<LogOut size={14} />}
          onClick={onLogout}
        >
          Sign Out
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onClose}
        >
          Done
        </Button>
      </DialogFooter>
    </Stack>
  );
}
