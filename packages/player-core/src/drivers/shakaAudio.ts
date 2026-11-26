import { SabrStreamingAdapter } from 'googlevideo/sabr-streaming-adapter';
import {
  AudioDriver,
  AudioDriverEvents,
  AudioPlaybackState,
  SabrStreamConfig,
  ShakaPlayerInstance,
} from './types';
import { buildSabrFormat, getShaka, ShakaPlayerAdapter } from './sabrUtils';
import {
  attachShakaEventListeners,
  detachShakaEventListeners,
  snapToBufferedStart,
  BoundListener,
} from './shakaEvents';

export class ShakaMseAudioDriver implements AudioDriver {
  readonly name = 'shaka-mse';

  private player: ShakaPlayerInstance | null = null;
  private mediaElement: HTMLMediaElement | null = null;
  private isHeadlessMedia = false;
  private state: AudioPlaybackState = 'idle';
  private listeners: { [E in keyof AudioDriverEvents]?: Set<AudioDriverEvents[E]> } = {};
  private activeBlobUrl: string | null = null;
  private boundElementListeners: BoundListener[] = [];
  private volume = 1;
  private playbackRate = 1;

  private sabrAdapter: SabrStreamingAdapter | null = null;
  private sabrPlayerAdapter: ShakaPlayerAdapter | null = null;
  private initPromise: Promise<void> | null = null;

  /** Initializes Shaka Player and SABR adapter once, coalescing concurrent callers. */
  async initialize(mediaElement?: HTMLMediaElement): Promise<void> {
    if (this.player) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.performInitialize(mediaElement).catch((err) => {
      this.initPromise = null;
      throw err;
    });
    return this.initPromise;
  }

  private async performInitialize(mediaElement?: HTMLMediaElement): Promise<void> {
    if (this.player) return;

    if (mediaElement) {
      this.mediaElement = mediaElement;
      this.isHeadlessMedia = false;
    } else if (typeof document !== 'undefined') {
      this.mediaElement = document.createElement('audio');
      this.mediaElement.preload = 'auto';
      this.isHeadlessMedia = true;
    } else {
      this.state = 'idle';
      return;
    }

    this.mediaElement.volume = this.volume;
    this.mediaElement.playbackRate = this.playbackRate;

    const shaka = await getShaka();
    if (typeof shaka.polyfill !== 'undefined' && typeof shaka.polyfill.installAll === 'function') {
      shaka.polyfill.installAll();
    }

    if (typeof shaka.Player?.isBrowserSupported === 'function' && !shaka.Player.isBrowserSupported()) {
      const err = new Error('[ShakaMseAudioDriver] Browser does not support Shaka Player MSE');
      this.emit('error', err);
      throw err;
    }

    const player = new shaka.Player();
    this.player = player;
    await (player as any).attach(this.mediaElement);

    this.sabrPlayerAdapter = new ShakaPlayerAdapter(player, () => this.mediaElement);
    this.sabrAdapter = new SabrStreamingAdapter({
      playerAdapter: this.sabrPlayerAdapter,
      enableCaching: true,
      maxCacheSizeMB: 10,
      maxCacheAgeSeconds: 600,
    });
    this.sabrPlayerAdapter.setSabrAdapter(this.sabrAdapter);
    this.sabrAdapter.attach(player);
    this.sabrPlayerAdapter.attachFiltersToPlayer(player);

    (this.player as any).configure({
      streaming: {
        bufferingGoal: 60,
        rebufferingGoal: 0.3,
        bufferBehind: 30,
        retryParameters: {
          maxAttempts: 1,
          baseDelay: 300,
          backoffFactor: 1.5,
          fuzzFactor: 0.2,
          timeout: 10000,
        },
      },
      manifest: {
        dash: {
          ignoreMinBufferTime: true,
          autoCorrectDrift: true,
          clockSyncUri: '',
        },
      },
    });

    this.boundElementListeners = attachShakaEventListeners(this.mediaElement, this.player, {
      emit: (evt, ...args) => this.emit(evt, ...args),
      setState: (s) => this.setState(s),
      getState: () => this.state,
      onRateChange: (r) => { if (r > 0) this.playbackRate = r; },
    });
    this.setState('idle');
  }

  configureSabr(config: SabrStreamConfig): void {
    if (!this.sabrAdapter) return;
    if (config.serverAbrStreamingUrl) this.sabrAdapter.setStreamingURL(config.serverAbrStreamingUrl);
    if (config.ustreamerConfig) this.sabrAdapter.setUstreamerConfig(config.ustreamerConfig);
    if (config.formats?.length) {
      this.sabrAdapter.setServerAbrFormats(config.formats.map((f) => buildSabrFormat(f as any)));
    }
  }

  getSabrAdapter(): SabrStreamingAdapter | null {
    return this.sabrAdapter;
  }

  private setState(newState: AudioPlaybackState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('stateChange', newState);
    }
  }

  async load(src: string, startTime: number = 0, sabrConfig?: SabrStreamConfig): Promise<void> {
    if (!this.player) await this.initialize();
    if (!this.player) throw new Error('[ShakaMseAudioDriver] Player is not initialized');

    if (sabrConfig) this.configureSabr(sabrConfig);

    if (this.state === 'error' && this.player && this.mediaElement) {
      try {
        await (this.player as any).unload();
        await (this.player as any).detach();
        await (this.player as any).attach(this.mediaElement);
        if (this.sabrPlayerAdapter) this.sabrPlayerAdapter.attachFiltersToPlayer(this.player!);
      } catch {}
    }

    if (this.activeBlobUrl?.startsWith('blob:') && typeof URL !== 'undefined') {
      try { URL.revokeObjectURL(this.activeBlobUrl); } catch {}
      this.activeBlobUrl = null;
    }

    if (src.startsWith('blob:')) this.activeBlobUrl = src;
    this.setState('loading');

    try {
      await (this.player as any).load(src, startTime);
      if (this.mediaElement) {
        if (startTime === 0) snapToBufferedStart(this.mediaElement);
        this.mediaElement.playbackRate = this.playbackRate > 0 ? this.playbackRate : 1;
      }
      this.setState('paused');
    } catch (err: any) {
      this.setState('error');
      const error = new Error(`[ShakaMseAudioDriver] Failed to load stream: ${err?.message || err}`);
      this.emit('error', error);
      throw error;
    }
  }

  async play(): Promise<void> {
    if (!this.mediaElement) return;
    snapToBufferedStart(this.mediaElement);
    try {
      await this.mediaElement.play();
    } catch (err: any) {
      if (err?.name === 'AbortError') { if (this.mediaElement.paused) this.setState('paused'); return; }
      if (err?.name === 'NotAllowedError') { this.setState('paused'); throw err; }
      this.setState('error');
      this.emit('error', err);
      throw err;
    }
  }

  async pause(): Promise<void> {
    if (!this.mediaElement) return;
    this.setState('paused');
    this.mediaElement.pause();
  }

  async seek(time: number): Promise<void> {
    if (!this.mediaElement) return;
    const duration = this.getDuration();
    const clampedTime = Math.max(0, duration > 0 ? Math.min(time, duration) : time);
    this.mediaElement.currentTime = clampedTime;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.mediaElement) this.mediaElement.volume = this.volume;
  }

  getVolume(): number { return this.volume; }

  setPlaybackRate(rate: number): void {
    const safeRate = rate > 0 ? rate : 1;
    this.playbackRate = safeRate;
    if (this.mediaElement) this.mediaElement.playbackRate = safeRate;
  }

  getPlaybackRate(): number {
    return this.mediaElement ? this.mediaElement.playbackRate : this.playbackRate;
  }

  getCurrentTime(): number {
    return this.mediaElement ? this.mediaElement.currentTime : 0;
  }

  getDuration(): number {
    return this.mediaElement && !isNaN(this.mediaElement.duration) ? this.mediaElement.duration : 0;
  }

  isPaused(): boolean {
    return this.mediaElement ? this.mediaElement.paused : true;
  }

  getState(): AudioPlaybackState { return this.state; }

  hasLoadedStream(): boolean {
    return Boolean(this.mediaElement && this.player && this.state !== 'idle' && this.state !== 'error');
  }

  on<E extends keyof AudioDriverEvents>(event: E, listener: AudioDriverEvents[E]): () => void {
    if (!this.listeners[event]) this.listeners[event] = new Set() as any;
    this.listeners[event]!.add(listener);
    return () => this.off(event, listener);
  }

  off<E extends keyof AudioDriverEvents>(event: E, listener: AudioDriverEvents[E]): void {
    this.listeners[event]?.delete(listener);
  }

  private emit<E extends keyof AudioDriverEvents>(event: E, ...args: Parameters<AudioDriverEvents[E]>): void {
    const handlers = this.listeners[event];
    if (handlers) {
      for (const handler of handlers) {
        try {
          (handler as any)(...args);
        } catch (e) {
          console.error(`[ShakaMseAudioDriver] Error in event listener for ${event}:`, e);
        }
      }
    }
  }

  async destroy(): Promise<void> {
    this.initPromise = null;
    detachShakaEventListeners(this.mediaElement, this.boundElementListeners);
    this.boundElementListeners = [];

    if (this.activeBlobUrl?.startsWith('blob:') && typeof URL !== 'undefined') {
      try { URL.revokeObjectURL(this.activeBlobUrl); } catch {}
      this.activeBlobUrl = null;
    }

    if (this.sabrAdapter) {
      try { this.sabrAdapter.dispose(); } catch {}
      this.sabrAdapter = null;
    }

    if (this.sabrPlayerAdapter) {
      this.sabrPlayerAdapter.dispose();
      this.sabrPlayerAdapter = null;
    }

    if (this.player) {
      try { await (this.player as any).destroy(); } catch {}
      this.player = null;
    }

    if (this.mediaElement && this.isHeadlessMedia) {
      this.mediaElement.src = '';
      this.mediaElement.load();
      this.mediaElement = null;
    }

    this.listeners = {};
    this.setState('idle');
  }
}
