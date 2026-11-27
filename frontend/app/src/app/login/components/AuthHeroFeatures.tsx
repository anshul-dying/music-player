'use client';

import React from 'react';
import { CardHeader, CardTitle, CardDescription, Flex, Badge, BrandLogo } from '@mp/dying';
import { Sparkles } from 'lucide-react';

export interface AuthHeroFeaturesProps {
  mode: 'login' | 'register';
}

export function AuthHeroFeatures({ mode }: AuthHeroFeaturesProps) {
  return (
    <CardHeader className="text-center items-center pb-3">
      <Flex align="center" gap="2" justify="center" className="mb-1">
        <BrandLogo variant="app-icon" size={36} />
        <CardTitle className="text-2xl font-extrabold tracking-tight">
          <BrandLogo variant="wordmark" size="lg" />
        </CardTitle>
      </Flex>

      <Flex align="center" gap="2" justify="center" className="mt-1">
        <Badge variant="glass" size="sm">
          <Flex align="center" gap="1">
            <Sparkles size={11} className="shrink-0 text-brand-primary" />
            <span>Ad-Free InnerTube Streaming</span>
          </Flex>
        </Badge>
      </Flex>

      <CardDescription className="text-xs text-text-secondary mt-1.5">
        {mode === 'login'
          ? 'Sign in to sync your playlists and radio mixes.'
          : 'Create an account to save equalizer presets & favorites.'}
      </CardDescription>
    </CardHeader>
  );
}
