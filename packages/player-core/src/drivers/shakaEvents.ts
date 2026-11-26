import { AudioDriverEvents, AudioPlaybackState, ShakaPlayerInstance } from './types';

export interface BoundListener {
  type: string;
  listener: EventListener;
}

export function attachShakaEventListeners(
  mediaElement: HTMLMediaElement,
  player: ShakaPlayerInstance | null,
  callbacks: {
    emit: <E extends keyof AudioDriverEvents>(event: E, ...args: Parameters<AudioDriverEvents[E]>) => void;
    setState: (state: AudioPlaybackState) => void;
    getState: () => AudioPlaybackState;
    onRateChange: (rate: number) => void;
  }
): BoundListener[] {
  const bound: BoundListener[] = [];

  const addEl = (type: string, listener: EventListener) => {
    mediaElement.addEventListener(type, listener);
    bound.push({ type, listener });
  };

  addEl('timeupdate', () => callbacks.emit('timeUpdate', mediaElement.currentTime));
  addEl('durationchange', () => callbacks.emit('durationChange', mediaElement.duration || 0));
  addEl('ratechange', () => {
    if (mediaElement.playbackRate <= 0) return;
    callbacks.onRateChange(mediaElement.playbackRate);
    callbacks.emit('rateChange', mediaElement.playbackRate);
  });
  addEl('play', () => callbacks.setState('playing'));
  addEl('pause', () => {
    const s = callbacks.getState();
    if (s !== 'ended' && s !== 'error') callbacks.setState('paused');
  });
  addEl('waiting', () => callbacks.setState('buffering'));
  addEl('playing', () => callbacks.setState('playing'));
  addEl('ended', () => {
    callbacks.setState('ended');
    callbacks.emit('ended');
  });
  addEl('error', () => {
    const mediaErr = mediaElement.error;
    const error = new Error(`[MediaElement Error] Code ${mediaErr?.code}: ${mediaErr?.message}`);
    callbacks.setState('error');
    callbacks.emit('error', error);
  });

  if (player) {
    (player as any).addEventListener('error', (event: any) => {
      const detail = event?.detail;
      const err = new Error(`[Shaka Error ${detail?.code}] ${detail?.message || 'Playback error'}`);
      callbacks.setState('error');
      callbacks.emit('error', err);
    });

    (player as any).addEventListener('buffering', (event: any) => {
      if (event?.buffering) {
        callbacks.setState('buffering');
      } else if (!mediaElement.paused) {
        callbacks.setState('playing');
      }
    });
  }

  return bound;
}

export function detachShakaEventListeners(
  mediaElement: HTMLMediaElement | null,
  boundListeners: BoundListener[]
): void {
  if (mediaElement) {
    for (const { type, listener } of boundListeners) {
      mediaElement.removeEventListener(type, listener);
    }
  }
}

/** Snaps currentTime to buffered.start(0) when MSE starts slightly after 0. */
export function snapToBufferedStart(mediaElement: HTMLMediaElement | null): void {
  if (!mediaElement || !mediaElement.buffered?.length) return;
  const firstStart = mediaElement.buffered.start(0);
  if (mediaElement.currentTime < firstStart && firstStart - mediaElement.currentTime < 1) {
    try { mediaElement.currentTime = firstStart; } catch {}
  }
}
