'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Stack,
  Flex,
  Separator,
} from '@mp/dying';
import { useYouTubeAuthStore } from '../stores/youtubeAuthStore';
import { StageExtensionMissing } from './youtube/StageExtensionMissing';
import { StageSignedOut } from './youtube/StageSignedOut';
import { StageConnected } from './youtube/StageConnected';

export interface ConnectYouTubeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConnectYouTubeModal: React.FC<ConnectYouTubeModalProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    isExtensionInstalled,
    isYouTubeAuthenticated,
    youtubeAccount,
    syncedLikedTracks,
    syncedPlaylists,
    isChecking,
    isSyncing,
    checkStatus,
    syncLibrary,
  } = useYouTubeAuthStore();

  useEffect(() => {
    if (open) {
      checkStatus();
    }
  }, [open, checkStatus]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg select-none">
        <DialogHeader className="pr-8">
          <Stack gap="1">
            <Flex align="center" gap="2" wrap="wrap">
              <DialogTitle className="text-xl font-bold text-text-primary">
                YouTube Music Bridge
              </DialogTitle>
              {isExtensionInstalled ? (
                isYouTubeAuthenticated ? (
                  <Badge variant="success" dot size="sm">
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="info" dot size="sm">
                    Extension Active
                  </Badge>
                )
              ) : (
                <Badge variant="warning" dot size="sm">
                  Extension Missing
                </Badge>
              )}
            </Flex>
            <DialogDescription className="text-xs text-text-secondary">
              Connect your account to sync liked music and playlists
            </DialogDescription>
          </Stack>
        </DialogHeader>

        <Separator className="my-2" />

        {!isExtensionInstalled && (
          <StageExtensionMissing
            onVerify={checkStatus}
            onCancel={() => onOpenChange(false)}
            isChecking={isChecking}
          />
        )}

        {isExtensionInstalled && !isYouTubeAuthenticated && (
          <StageSignedOut
            onCheckStatus={checkStatus}
            isChecking={isChecking}
          />
        )}

        {isExtensionInstalled && isYouTubeAuthenticated && (
          <StageConnected
            youtubeAccount={youtubeAccount}
            syncedLikedTracks={syncedLikedTracks}
            syncedPlaylists={syncedPlaylists}
            isSyncing={isSyncing}
            isChecking={isChecking}
            onSync={syncLibrary}
            onCheckStatus={checkStatus}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
