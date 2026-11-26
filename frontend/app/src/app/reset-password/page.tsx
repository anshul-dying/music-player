'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import {
  AmbientAura,
  Card,
  CardContent,
  Button,
  FormField,
  Input,
  Alert,
  Stack,
  Box,
  Text,
} from '@mp/dying';
import { authClient } from '../../lib/auth-client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const urlError = searchParams.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === 'INVALID_TOKEN' ? 'This reset link is invalid or expired.' : null
  );
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Missing reset token. Please request a new reset link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res?.error) {
        setError(res.error.message || 'Failed to reset password.');
      } else {
        setDone(true);
        setTimeout(() => router.push('/login'), 1200);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack gap="5">
      <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft size={14} />
        Back to Sign In
      </Link>

      <Stack gap="1">
        <Text size="xl" weight="bold">Reset Password</Text>
        <Text size="xs" color="secondary">Choose a new password for your GaneGan account.</Text>
      </Stack>

      {error && <Alert variant="error" title="Reset Error">{error}</Alert>}
      {done ? (
        <Alert variant="success" title="Password Updated">
          Your password has been reset. Redirecting to sign in...
        </Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack gap="4">
            <FormField label="New Password" id="new-password" required>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                leftIcon={<Lock size={15} />}
                required
              />
            </FormField>
            <FormField label="Confirm Password" id="confirm-password" required>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                leftIcon={<Lock size={15} />}
                required
              />
            </FormField>
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Update Password
            </Button>
          </Stack>
        </form>
      )}
    </Stack>
  );
}

export default function ResetPasswordPage() {
  return (
    <Box className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-canvas select-none">
      <AmbientAura intensity={0.45} blur={120} />
      <Card variant="glass" className="relative z-10 w-full max-w-md border-border-subtle">
        <CardContent className="p-6 sm:p-8">
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </Box>
  );
}
