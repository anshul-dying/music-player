'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import {
  CardContent,
  CardFooter,
  Button,
  SegmentedControl,
  Separator,
  Flex,
  Box,
  Text,
} from '@mp/dying';
import { AuthPageShell } from '../../components/auth/AuthPageShell';
import { useAuthStore } from '../../stores/authStore';
import { createDemoCredentials } from '../../stores/demoCredentials';
import { OAuthButtons } from './components/OAuthButtons';
import { enabledOAuthProviders, type OAuthProvider } from './oauthProviders';
import { AuthHeroFeatures } from './components/AuthHeroFeatures';
import { AuthAlerts } from './components/AuthAlerts';
import { EmailCredentialsForm } from './components/EmailCredentialsForm';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [oauthWarning, setOauthWarning] = useState<{ provider: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register, loginWithProvider, loginAsGuest } = useAuthStore();

  const handleProviderLogin = async (provider: OAuthProvider, label: string) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setOauthWarning(null);
    setIsLoading(true);

    const warnUnavailable = () =>
      setOauthWarning({
        provider: label,
        message: `${label} sign-in is not configured on this server.`,
      });

    try {
      const res = await loginWithProvider(provider);
      if (res?.error) warnUnavailable();
    } catch {
      warnUnavailable();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDemoAccount = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setOauthWarning(null);
    const demo = createDemoCredentials();
    const res = await register(demo.name, demo.email, demo.password);
    setIsLoading(false);
    if (res.success) {
      setStatusMessage('Demo account ready! Redirecting...');
      setTimeout(() => router.push('/'), 400);
    } else {
      setErrorMessage(res.error || 'Failed to create demo account.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setOauthWarning(null);
    setIsLoading(true);

    if (mode === 'register') {
      const displayName = name.trim() || email.split('@')[0];
      const res = await register(displayName, email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account.');
      } else {
        setStatusMessage('Account created successfully! Redirecting...');
        setTimeout(() => router.push('/'), 400);
      }
    } else {
      const res = await login(email, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid email or password.');
      } else {
        setStatusMessage('Signed in successfully! Redirecting...');
        setTimeout(() => router.push('/'), 400);
      }
    }
  };

  const handleGuestLogin = () => {
    setStatusMessage('Continuing as Guest...');
    loginAsGuest();
    setTimeout(() => router.push('/'), 300);
  };

  return (
    <AuthPageShell>
      <AuthHeroFeatures mode={mode} />

        <CardContent className="space-y-4">
          <SegmentedControl
            fullWidth
            value={mode}
            onValueChange={(nextMode) => {
              setMode(nextMode);
              setErrorMessage(null);
              setStatusMessage(null);
              setOauthWarning(null);
            }}
            options={[
              { value: 'login', label: 'Sign In', icon: <LogIn size={14} /> },
              { value: 'register', label: 'Create Account', icon: <UserPlus size={14} /> },
            ]}
          />

          <AuthAlerts
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
            oauthWarning={oauthWarning}
            onClearWarning={() => setOauthWarning(null)}
            onCreateDemoAccount={handleCreateDemoAccount}
            statusMessage={statusMessage}
            isLoading={isLoading}
          />

          {enabledOAuthProviders.length > 0 && (
            <>
              <OAuthButtons
                providers={enabledOAuthProviders}
                isLoading={isLoading}
                onProviderLogin={handleProviderLogin}
              />

              <Flex align="center" gap="3">
                <Separator className="flex-1" />
                <Text variant="kicker" size="xs">
                  OR EMAIL
                </Text>
                <Separator className="flex-1" />
              </Flex>
            </>
          )}

          <EmailCredentialsForm
            mode={mode}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
        </CardContent>

        <CardFooter className="flex-col gap-1.5 pt-1 text-center">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={isLoading}
            onClick={handleGuestLogin}
            className="text-text-secondary hover:text-text-primary"
          >
            Continue as Guest (Instant Playback)
          </Button>
          <Text variant="secondary" size="xs">
            Protected by GaneGan clean InnerTube audio engine.
          </Text>
        </CardFooter>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Box className="min-h-screen w-full bg-canvas" />}>
      <LoginForm />
    </Suspense>
  );
}
