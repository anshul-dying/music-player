'use client';

import React from 'react';
import Link from 'next/link';
import { Stack, FormField, Input, Button, Flex } from '@mp/dying';
import { User, Mail, Lock } from 'lucide-react';

export interface EmailCredentialsFormProps {
  mode: 'login' | 'register';
  name: string;
  setName: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function EmailCredentialsForm({
  mode,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  isLoading,
  onSubmit,
}: EmailCredentialsFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <Stack gap="3">
        {mode === 'register' && (
          <FormField label="Your Name" id="name-input" required>
            <Input
              id="name-input"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              leftIcon={<User size={15} />}
              required={mode === 'register'}
            />
          </FormField>
        )}

        <FormField label="Email Address" id="email-input" required>
          <Input
            id="email-input"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            leftIcon={<Mail size={15} />}
            required
          />
        </FormField>

        <FormField label="Password" id="password-input" required>
          <Input
            id="password-input"
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock size={15} />}
            required
          />
        </FormField>

        {mode === 'login' && (
          <Flex justify="end">
            <Link
              href="/forgot-password"
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Forgot password?
            </Link>
          </Flex>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          fullWidth
          disabled={isLoading}
          className="mt-1"
        >
          {isLoading
            ? 'Processing...'
            : mode === 'login'
            ? 'Sign In with Email'
            : 'Create GaneGan Account'}
        </Button>
      </Stack>
    </form>
  );
}
