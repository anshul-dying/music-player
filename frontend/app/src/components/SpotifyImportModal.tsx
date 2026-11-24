'use client';

import React, { useEffect, useState } from 'react';
import { Disc3, Heart, Link2, ListMusic, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Button,
  Input,
  ProgressBar,
  Stack,
  Flex,
  Text,
  Alert,
  Spinner,
  Separator,
} from '@mp/dying';
import { useSpotifyImportStore } from '@/stores/spotifyImportStore';

export interface SpotifyImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
}

export const SpotifyImportModal: React.FC<SpotifyImportModalProps> = ({
  open,
  onOpenChange,
  isAuthenticated,
}) => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const {
    loadingStatus,
    configured,
    connected,
    job,
    error,
    checkStatus,
    connectSpotify,
    disconnectSpotify,
    startImport,
  } = useSpotifyImportStore();

  useEffect(() => {
    if (open && isAuthenticated) {
      checkStatus();
    }
  }, [open, isAuthenticated, checkStatus]);

  const isRunning = job?.status === 'queued' || job?.status === 'running';
  const total = job?.stats?.total ?? 0;
  const processed = job?.stats?.processed ?? 0;
  const matched = job?.stats?.matched ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg select-none">
        <DialogHeader className="pr-8">
          <Stack gap="1">
            <Flex align="center" gap="2" wrap="wrap">
              <DialogTitle className="text-xl font-bold text-text-primary">
                Spotify Import
              </DialogTitle>
              {connected ? (
                <Badge variant="success" dot size="sm">Connected</Badge>
              ) : (
                <Badge variant="neutral" dot size="sm">Not Connected</Badge>
              )}
            </Flex>
            <DialogDescription className="text-xs text-text-secondary">
              Import your Spotify Liked Songs and playlists into your GaneGan library
            </DialogDescription>
          </Stack>
        </DialogHeader>

        <Separator className="my-2" />

        {!isAuthenticated ? (
          <Alert variant="warning" title="Sign in required">
            Sign in to your GaneGan account first to import playlists.
          </Alert>
        ) : loadingStatus ? (
          <Flex align="center" justify="center" className="py-8">
            <Spinner size="md" />
          </Flex>
        ) : (
          <Stack gap="4">
            {error && (
              <Alert variant="error" title="Import error">
                {error}
              </Alert>
            )}

            <Stack gap="2">
              <Text size="xs" className="text-text-secondary font-medium">
                Public Playlist URL (no Spotify Premium required)
              </Text>
              <Flex gap="2" align="center">
                <Input
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                  disabled={isRunning}
                />
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Link2 size={14} />}
                  onClick={() => startImport('playlists', playlistUrl.trim())}
                  disabled={isRunning || !playlistUrl.trim()}
                >
                  Import URL
                </Button>
              </Flex>
            </Stack>

            <Separator />

            {!connected ? (
              <Button
                variant="secondary"
                leftIcon={<Disc3 size={16} />}
                onClick={connectSpotify}
                disabled={!configured}
              >
                Connect Spotify Account (OAuth)
              </Button>
            ) : (
              <Flex gap="2" wrap="wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Heart size={15} />}
                  onClick={() => startImport('liked_songs')}
                  disabled={isRunning}
                >
                  Import Liked Songs
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ListMusic size={15} />}
                  onClick={() => startImport('playlists')}
                  disabled={isRunning}
                >
                  Import Playlists
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RefreshCw size={14} />}
                  onClick={disconnectSpotify}
                  disabled={isRunning}
                >
                  Disconnect
                </Button>
              </Flex>
            )}

            {job && (
              <Stack gap="2" className="rounded-xl border border-border-subtle bg-surface/60 p-3.5">
                <ProgressBar
                  label={
                    job.status === 'queued'
                      ? 'Queued for import...'
                      : job.status === 'running'
                      ? 'Matching & importing tracks...'
                      : job.status === 'done'
                      ? 'Import complete'
                      : 'Import failed'
                  }
                  value={job.progress ?? 0}
                  max={100}
                  size="md"
                  showValue
                  indeterminate={job.status === 'queued'}
                />
                <Text size="xs" className="text-text-secondary">
                  {isRunning
                    ? `Processed ${processed} of ${total} tracks • ${matched} matched`
                    : `Matched ${matched} of ${total} tracks${
                        job.stats?.unmatched ? ` (${job.stats.unmatched} unmatched)` : ''
                      }`}
                  {job.error ? ` — ${job.error}` : ''}
                </Text>
                {isRunning && (
                  <Text size="xs" className="text-text-tertiary">
                    You can safely close this dialog — songs will keep importing in the background and a toast notification will appear when finished.
                  </Text>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};
