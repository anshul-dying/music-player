'use client';

import React from 'react';
import { Container, PageHeader, Tabs, TabsList, TabsTrigger, TabsContent } from '@mp/dying';
import { SettingsAppearanceSection } from './components/SettingsAppearanceSection';
import { SettingsPlaybackSection } from './components/SettingsPlaybackSection';
import { SettingsAccountSection } from './components/SettingsAccountSection';

export default function SettingsPage() {
  return (
    <Container size="lg" className="py-6 px-4 sm:px-6 pb-28 max-w-4xl">
      <PageHeader title="Settings" kicker="Preferences" />

      <Tabs defaultValue="appearance" variant="pill" className="mt-6">
        <TabsList variant="pill" className="mb-6">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="playback">Playback</TabsTrigger>
          <TabsTrigger value="account">Connections &amp; Data</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <SettingsAppearanceSection />
        </TabsContent>
        <TabsContent value="playback">
          <SettingsPlaybackSection />
        </TabsContent>
        <TabsContent value="account">
          <SettingsAccountSection />
        </TabsContent>
      </Tabs>
    </Container>
  );
}
