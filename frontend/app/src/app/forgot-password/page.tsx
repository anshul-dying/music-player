'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const res = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo,
      });
      if (res?.error) {
        setError(res.error.message || 'Unable to send reset link.');
      } else {
        setSent(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-canvas select-none">
      <AmbientAura intensity={0.45} blur={120} />
      <Card variant="glass" className="relative z-10 w-full max-w-md border-border-subtle">
        <CardContent className="p-6 sm:p-8">
          <Stack gap="5">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors">
              <ArrowLeft size={14} />
              Back to Sign In
            </Link>

            <Stack gap="1">
              <Text size="xl" weight="bold">Forgot Password</Text>
              <Text size="xs" color="secondary">
                Enter your account email and we will send you a password reset link.
              </Text>
            </Stack>

            {error && <Alert variant="error" title="Request Failed">{error}</Alert>}
            {sent ? (
              <Alert variant="success" title="Check your inbox">
                If an account exists for {email}, a reset link has been sent.
              </Alert>
            ) : (
              <form onSubmit={handleSubmit}>
                <Stack gap="4">
                  <FormField label="Email Address" id="forgot-email" required>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      leftIcon={<Mail size={15} />}
                      required
                    />
                  </FormField>
                  <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
                    Send Reset Link
                  </Button>
                </Stack>
              </form>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
