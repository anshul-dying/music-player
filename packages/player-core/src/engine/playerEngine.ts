import {
  AlbumDetails, ArtistDetails, HomeFeedData, InnerTubeClientName,
  NextRadioData, PlaybackState, RemotePlaylistDetails, RepeatMode, Track,
} from '../types';
import { NetworkAdapter, NativeHttpAdapter } from '../adapters/network';
import { InnerTubeClient, type SyntheticShelfOptions } from '../innertube/client';
import { invalidateStreamCache, prefetchAudioWarmup, VerdictCache } from '../walk/clientWalk';
import { AudioDriver, ShakaMseAudioDriver } from '../drivers/audio';
import { TypedEventEmitter } from './emitter';
import { QueueManager } from './queueManager';
import { PlayerEngineEvents, PlayerEngineOptions } from './types';
import { loadAndPlayPreparedTrack } from './streamHelper';
import { attachDriverCoordinator } from './driverSubscriptions';

export * from './emitter';
export * from './queueManager';
export * from './types';
export * from './streamHelper';
export * from './driverSubscriptions';

export class PlayerEngine extends TypedEventEmitter<PlayerEngineEvents> {
  private networkAdapter: NetworkAdapter;
  private innerTube: InnerTubeClient;
  private verdictCache: VerdictCache;
  private audioDriver: AudioDriver;
  private queueManager = new QueueManager();
  private driverCoordinator: { resetPrefetch: () => void; resetRecovery: () => void };

  private playbackState: PlaybackState = 'idle';
  private currentTime = 0;
  private duration = 0;
  private volume = 1;
  private playbackRate = 1.0;
  private activeClient: InnerTubeClientName | null = null;
  private playRequestId = 0;
  private loadedVideoId: string | null = null;
  private reportedErrors = new WeakSet<object>();

  constructor(options: PlayerEngineOptions = {}) {
    super();
    this.networkAdapter = options.networkAdapter || new NativeHttpAdapter();
    this.innerTube = new InnerTubeClient({ networkAdapter: this.networkAdapter });
    this.verdictCache = new VerdictCache();
    this.audioDriver = options.audioDriver || new ShakaMseAudioDriver();

    this.driverCoordinator = attachDriverCoordinator({
      audioDriver: this.audioDriver,
      innerTube: this.innerTube,
      verdictCache: this.verdictCache,
      networkAdapter: this.networkAdapter,
      queueManager: this.queueManager,
      onStateChange: (state) => { this.playbackState = state; this.emit('stateChange', state); },
      onTimeUpdate: (time) => { this.currentTime = time; this.emit('timeUpdate', time); },
      onRateChange: (rate) => { this.playbackRate = rate; this.emit('playbackRateChange', rate); },
      onDurationChange: (dur) => { this.duration = dur; this.emit('durationChange', dur); },
      onEnded: () => this.emit('ended'),
      onError: (err) => this.emitError(err),
      getActiveClient: () => this.activeClient,
      getCurrentTime: () => this.currentTime,
      getDuration: () => this.duration,
      getPlaybackRate: () => this.playbackRate,
      play: (idx, start) => this.play(idx, start),
      seek: (sec) => this.seek(sec),
      next: () => this.next(),
    });

    if (options.mediaElement) {
      this.audioDriver.initialize(options.mediaElement).catch((err) => { this.emitError(err); });
    }
  }

  /** Emits `error` once per Error object, however many callers surface it. */
  private emitError(err: Error): void {
    if (typeof err === 'object' && err !== null) {
      if (this.reportedErrors.has(err)) return;
      this.reportedErrors.add(err);
    }
    this.emit('error', err);
  }

  private isTrackLoaded(track: Track): boolean {
    return (this.audioDriver.hasLoadedStream?.() ?? true) && this.loadedVideoId === track.videoId;
  }

  private async resumeLoaded(): Promise<void> {
    this.playbackState = 'playing';
    this.emit('stateChange', 'playing');
    await this.audioDriver.play();
  }

  setNetworkAdapter(adapter: NetworkAdapter): void {
    this.networkAdapter = adapter;
    this.innerTube.setNetworkAdapter(adapter);
  }

  getNetworkAdapter(): NetworkAdapter { return this.networkAdapter; }
  getInnerTubeClient(): InnerTubeClient { return this.innerTube; }
  getVerdictCache(): VerdictCache { return this.verdictCache; }
  getAudioDriver(): AudioDriver { return this.audioDriver; }

  getQueue(): Track[] { return this.queueManager.getQueue(); }
  getCurrentIndex(): number { return this.queueManager.getCurrentIndex(); }
  getCurrentTrack(): Track | null { return this.queueManager.getCurrentTrack(); }

  setQueue(tracks: Track[], startIndex = 0, autoPlay = true): void {
    const { selectedIndex, selectedTrack } = this.queueManager.setQueue(tracks, startIndex);
    this.emit('queueChange', this.getQueue());
    if (selectedTrack) {
      if (autoPlay) this.play(selectedIndex).catch((err) => this.emitError(err));
      else this.emit('trackChange', selectedTrack, selectedIndex);
    } else {
      this.emit('trackChange', null, -1);
    }
  }

  addToQueue(track: Track): void {
    const { isFirst } = this.queueManager.addToQueue(track);
    this.emit('queueChange', this.getQueue());
    if (isFirst) this.emit('trackChange', track, 0);
  }

  removeFromQueue(index: number): void {
    const { removed, nextAction, nextIndex } = this.queueManager.removeFromQueue(index);
    if (!removed) return;
    this.emit('queueChange', this.getQueue());

    if (nextAction === 'stop') {
      this.pause();
      this.emit('trackChange', null, -1);
    } else if (nextAction === 'playNext') {
      this.play(nextIndex).catch((err) => this.emitError(err));
    } else if (nextAction === 'shifted') {
      this.emit('trackChange', this.getCurrentTrack(), nextIndex);
    }
  }

  clearQueue(): void {
    this.pause();
    this.queueManager.clear();
    this.emit('queueChange', []);
    this.emit('trackChange', null, -1);
  }

  async playTrack(track: Track): Promise<void> {
    const existingIndex = this.queueManager.findIndexByVideoId(track.videoId);
    if (existingIndex !== -1) {
      if (existingIndex === this.getCurrentIndex() && this.isTrackLoaded(track)) {
        return this.resumeLoaded();
      }
      await this.play(existingIndex);
    } else {
      const insertIdx = this.queueManager.insertAfterCurrent(track);
      this.emit('queueChange', this.getQueue());
      await this.play(insertIdx);
    }
  }

  async play(index?: number, startTime?: number): Promise<void> {
    if (typeof index === 'number') {
      const current = this.getCurrentTrack();
      if (index === this.getCurrentIndex() && current && startTime === undefined && this.isTrackLoaded(current)) {
        return this.resumeLoaded();
      }
      if (index < 0 || index >= this.queueManager.getLength()) return;
      this.queueManager.setCurrentIndex(index);
      this.driverCoordinator.resetPrefetch();
      this.driverCoordinator.resetRecovery();
    } else if (startTime === undefined) {
      const current = this.getCurrentTrack();
      if (current && this.isTrackLoaded(current)) return this.resumeLoaded();
    }

    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) return;

    const isNewTrack = this.loadedVideoId !== currentTrack.videoId;
    if (isNewTrack && startTime === undefined) {
      this.currentTime = 0;
      this.emit('timeUpdate', 0);
    }

    const startSeek = typeof startTime === 'number'
      ? startTime
      : (!isNewTrack && this.playbackState === 'error' ? Math.max(0, this.currentTime) : 0);

    if (this.playbackState === 'error') invalidateStreamCache(currentTrack.videoId);

    this.emit('trackChange', currentTrack, this.getCurrentIndex());
    const currentRequestId = ++this.playRequestId;
    this.playbackState = 'loading';
    this.emit('stateChange', 'loading');

    try {
      const prep = await loadAndPlayPreparedTrack(
        currentTrack,
        this.innerTube,
        this.verdictCache,
        this.networkAdapter,
        this.audioDriver,
        startSeek
      );
      if (currentRequestId !== this.playRequestId) return;

      this.loadedVideoId = currentTrack.videoId;
      this.activeClient = prep.client;
      this.emit('walkVerdict', prep.verdicts, prep.client);
      if (prep.updatedDuration) {
        this.duration = prep.updatedDuration;
        this.emit('durationChange', prep.updatedDuration);
      }
      this.emit('trackChange', currentTrack, this.getCurrentIndex());
      this.driverCoordinator.resetRecovery();

      const nextTrack = this.queueManager.getTrackAt(this.getCurrentIndex() + 1);
      if (nextTrack?.videoId) prefetchAudioWarmup(nextTrack, this.networkAdapter, this.verdictCache).catch(() => {});
    } catch (err: any) {
      if (currentRequestId !== this.playRequestId) return;
      this.playbackState = 'error';
      this.emit('stateChange', 'error');
      const error = new Error(`[PlayerEngine] Failed to play track "${currentTrack.title}": ${err?.message || err}`);
      this.emitError(error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    this.playbackState = 'paused';
    this.emit('stateChange', 'paused');
    await this.audioDriver.pause();
  }

  async togglePlay(): Promise<void> {
    if (this.playbackState === 'playing' || !this.audioDriver.isPaused()) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async seek(seconds: number): Promise<void> {
    this.currentTime = Math.max(0, seconds);
    await this.audioDriver.seek(this.currentTime);
    this.emit('timeUpdate', this.currentTime);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audioDriver.setVolume(this.volume);
    this.emit('volumeChange', this.volume);
  }

  getVolume(): number { return this.volume; }
  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    this.audioDriver.setPlaybackRate(rate);
    this.emit('playbackRateChange', rate);
  }

  getPlaybackRate(): number { return this.playbackRate; }
  getCurrentTime(): number { return this.currentTime; }
  getDuration(): number { return this.duration; }
  getPlaybackState(): PlaybackState { return this.playbackState; }
  getActiveClient(): InnerTubeClientName | null { return this.activeClient; }

  hasNext(): boolean { return this.queueManager.hasNext(); }
  hasPrevious(): boolean { return this.queueManager.hasPrevious(); }

  async next(): Promise<void> {
    const nextIdx = this.queueManager.getNextIndex();
    if (nextIdx !== null) await this.play(nextIdx);
  }

  async previous(): Promise<void> {
    if (this.currentTime > 3) { await this.seek(0); return; }
    const prevIdx = this.queueManager.getPreviousIndex();
    if (prevIdx !== null) await this.play(prevIdx);
    else await this.seek(0);
  }

  setRepeatMode(mode: RepeatMode): void { this.queueManager.setRepeatMode(mode); }
  getRepeatMode(): RepeatMode { return this.queueManager.getRepeatMode(); }
  setShuffle(shuffle: boolean): void { this.queueManager.setShuffle(shuffle); }
  getShuffle(): boolean { return this.queueManager.getShuffle(); }
  search(query: string, clientName?: InnerTubeClientName): Promise<Track[]> { return this.innerTube.search(query, clientName); }
  getHomeFeed(moodParam?: string, options?: SyntheticShelfOptions): Promise<HomeFeedData> { return this.innerTube.getHomeFeed(moodParam, options); }
  getExploreFeed(): Promise<HomeFeedData> { return this.innerTube.getExploreFeed(); }
  getNextRadio(videoId: string, playlistId?: string): Promise<NextRadioData> { return this.innerTube.getNextRadio(videoId, playlistId); }
  getArtist(browseId: string): Promise<ArtistDetails> { return this.innerTube.getArtist(browseId); }
  getAlbum(browseId: string): Promise<AlbumDetails> { return this.innerTube.getAlbum(browseId); }
  getPlaylist(playlistId: string): Promise<RemotePlaylistDetails> { return this.innerTube.getPlaylist(playlistId); }
  browse(browseId: string, params?: string): Promise<any> { return this.innerTube.browse(browseId, params); }

  async destroy(): Promise<void> {
    this.removeAllListeners();
    await this.audioDriver.destroy();
  }
}
