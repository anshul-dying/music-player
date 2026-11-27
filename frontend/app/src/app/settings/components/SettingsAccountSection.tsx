'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  Stack,
  Flex,
  Text,
  Button,
  Badge,
  Separator,
  useToast,
} from '@mp/dying';
import { Youtube, Disc3, Trash2, Download, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useYouTubeAuthStore } from '@/stores/youtubeAuthStore';
import { useSpotifyImportStore } from '@/stores/spotifyImportStore';
import { ConnectYouTubeModal } from '@/components/ConnectYouTubeModal';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';

export function SettingsAccountSection() {
  const { user, isAuthenticated } = useAuthStore();
  const { isExtensionInstalled, isYouTubeAuthenticated, youtubeAccount } = useYouTubeAuthStore();
  const spotifyModalOpen = useSpotifyImportStore((s) => s.setModalOpen);
  const { toast } = useToast();

  const [ytModalOpen, setYtModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleClearCache = () => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('mp_') || k.includes('verdict'));
      keys.forEach((k) => localStorage.removeItem(k));
      toast({ title: 'Local cache cleared', description: `Cleared ${keys.length} cached entries.`, variant: 'success' });
    } catch {
      toast({ title: 'Unable to clear cache', variant: 'error' });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/account/export', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ganegan-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Data exported', description: 'Downloaded ganegan-export.json', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err?.message, variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Stack gap="4">
      <Card variant="default" className="border-border-subtle bg-surface">
        <CardContent className="p-6">
          <Stack gap="4">
            <Flex justify="between" align="center" className="flex-wrap gap-3">
              <Flex align="center" gap="3">
                <Youtube size={18} className="text-red-500" />
                <Stack gap="1">
                  <Text size="sm" weight="semibold">YouTube Music Bridge</Text>
                  <Text size="xs" color="secondary">
                    {isYouTubeAuthenticated
                      ? `Connected as ${youtubeAccount?.name || 'YouTube User'}`
                      : isExtensionInstalled
                      ? 'Extension active — sign in to YouTube to sync library'
                      : 'Install companion extension for direct CDN streaming'}
                  </Text>
                </Stack>
              </Flex>
              <Flex align="center" gap="2">
                <Badge variant={isYouTubeAuthenticated ? 'success' : 'glass'} size="sm">
                  {isYouTubeAuthenticated ? 'Connected' : isExtensionInstalled ? 'Ready' : 'Not Installed'}
                </Badge>
                <Button variant="secondary" size="xs" onClick={() => setYtModalOpen(true)}>
                  Manage
                </Button>
              </Flex>
            </Flex>

            <Separator />

            <Flex justify="between" align="center" className="flex-wrap gap-3">
              <Flex align="center" gap="3">
                <Disc3 size={18} className="text-emerald-400" />
                <Stack gap="1">
                  <Text size="sm" weight="semibold">Spotify Playlist Import</Text>
                  <Text size="xs" color="secondary">Import liked songs and playlists via OAuth or public URL.</Text>
                </Stack>
              </Flex>
              <Button variant="secondary" size="xs" onClick={() => spotifyModalOpen(true)}>
                Open Importer
              </Button>
            </Flex>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="default" className="border-border-subtle bg-surface">
        <CardContent className="p-6">
          <Stack gap="4">
            <Flex justify="between" align="center" className="flex-wrap gap-3">
              <Stack gap="1">
                <Text size="sm" weight="semibold">Stream Verdict & Local Cache</Text>
                <Text size="xs" color="secondary">Clear cached InnerTube client verdicts if playback behaves unexpectedly.</Text>
              </Stack>
              <Button variant="outline" size="xs" leftIcon={<Trash2 size={12} />} onClick={handleClearCache}>
                Clear Cache
              </Button>
            </Flex>

            {isAuthenticated && user && (
              <>
                <Separator />
                <Flex justify="between" align="center" className="flex-wrap gap-3">
                  <Stack gap="1">
                    <Text size="sm" weight="semibold">Your Data ({user.email})</Text>
                    <Text size="xs" color="secondary">Download a JSON copy of your library or permanently delete your account.</Text>
                  </Stack>
                  <Flex align="center" gap="2">
                    <Button variant="outline" size="xs" isLoading={isExporting} leftIcon={<Download size={12} />} onClick={handleExport}>
                      Export JSON
                    </Button>
                    <Button variant="danger" size="xs" leftIcon={<Trash2 size={12} />} onClick={() => setDeleteOpen(true)}>
                      Delete Account
                    </Button>
                  </Flex>
                </Flex>
              </>
            )}

            <Separator />

            <Flex align="center" gap="4">
              <Shield size={14} className="text-text-tertiary" />
              <Link href="/legal" className="text-xs text-text-secondary hover:text-text-primary underline">
                Legal &amp; Disclaimers
              </Link>
              <Link href="/privacy" className="text-xs text-text-secondary hover:text-text-primary underline">
                Privacy Policy
              </Link>
            </Flex>
          </Stack>
        </CardContent>
      </Card>

      <ConnectYouTubeModal open={ytModalOpen} onOpenChange={setYtModalOpen} />
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </Stack>
  );
}
