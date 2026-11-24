'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Disc3, Heart, ListMusic, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Button,
  Stack,
  Flex,
  Text,
  Alert,
  Spinner,
  Separator,
} from '@mp/dying';

export interface SpotifyImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  onImported?: () => void;
}

interface ImportJobState {
  id: string;
  kind: 'liked_songs' | 'playlists';
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: number;
  stats?: {
    total?: number;
    matched?: number;
    unmatched?: number;
    unmatchedTracks?: string[];
  };
  error?: string | null;
}

export const SpotifyImportModal: React.FC<SpotifyImportModalProps> = ({
  open,
  onOpenChange,
  isAuthenticated,
  onImported,
}) => {
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [connected, setConnected] = useState(false);
  const [job, setJob] = useState<ImportJobState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const checkStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingStatus(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/spotify/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setConfigured(Boolean(data.configured));
        setConnected(Boolean(data.connected));
      }
    } catch {
      setError('Could not reach Spotify auth status endpoint.');
    } finally {
      setLoadingStatus(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (open) checkStatus();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [open, checkStatus]);

  const handleConnect = async () => {
    setError(null);
    try {
      const res = await fetch('/api/auth/spotify/start?mode=json', {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.authorizeUrl) {
        setError(data?.error || 'Failed to start Spotify OAuth');
        return;
      }
      window.location.href = data.authorizeUrl;
    } catch {
      setError('Failed to start Spotify OAuth.');
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/auth/spotify/disconnect', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    setConnected(false);
    setJob(null);
  };

  const startImport = async (kind: 'liked_songs' | 'playlists') => {
    setError(null);
    esRef.current?.close();
    try {
      const res = await fetch('/api/import/spotify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok || !data.job) {
        setError(data?.error || 'Failed to queue Spotify import');
        return;
      }

      setJob(data.job);
      const es = new EventSource(`/api/import/${data.job.id}/events`, {
        withCredentials: true,
      });
      esRef.current = es;
      es.onmessage = (evt) => {
        try {
          const nextJob = JSON.parse(evt.data) as ImportJobState;
          setJob(nextJob);
          if (nextJob.status === 'done') {
            es.close();
            onImported?.();
          } else if (nextJob.status === 'failed') {
            es.close();
          }
        } catch {
          // Ignore parse errors
        }
      };
      es.onerror = () => {
        es.close();
      };
    } catch {
      setError('Failed to start Spotify import.');
    }
  };

  const isRunning = job?.status === 'queued' || job?.status === 'running';

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
            Sign in to your GaneGan account first to connect Spotify and save imported playlists.
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

            {!configured && (
              <Alert variant="warning" title="Spotify not configured">
                Set SPOTIFY_CLIENT_ID in the API environment to enable OAuth.
              </Alert>
            )}

            {!connected ? (
              <Button
                variant="primary"
                leftIcon={<Disc3 size={16} />}
                onClick={handleConnect}
                disabled={!configured}
              >
                Connect Spotify Account
              </Button>
            ) : (
              <Stack gap="3">
                <Flex gap="2" wrap="wrap">
                  <Button
                    variant="primary"
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
                    onClick={handleDisconnect}
                    disabled={isRunning}
                  >
                    Disconnect
                  </Button>
                </Flex>

                {job && (
                  <Alert
                    variant={
                      job.status === 'failed'
                        ? 'error'
                        : job.status === 'done'
                        ? 'success'
                        : 'info'
                    }
                    title={`Import ${job.status} (${job.progress ?? 0}%)`}
                  >
                    <Text size="xs">
                      Matched {job.stats?.matched ?? 0} of {job.stats?.total ?? 0} tracks
                      {job.stats?.unmatched ? ` (${job.stats.unmatched} unmatched)` : ''}
                      {job.error ? ` — ${job.error}` : ''}
                    </Text>
                  </Alert>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};
