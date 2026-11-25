import { RepeatMode, Track } from '../types';

const MAX_HISTORY = 100;

function isSameTrack(a: Track | undefined, b: Track | undefined): boolean {
  if (!a || !b) return false;
  const keyA = a.videoId || a.id;
  const keyB = b.videoId || b.id;
  return Boolean(keyA && keyB && keyA === keyB);
}

export class QueueManager {
  private queue: Track[] = [];
  private currentIndex = -1;
  private repeatMode: RepeatMode = 'off';
  private isShuffle = false;
  /** Per queue entry: already played in the current shuffle cycle. */
  private played: boolean[] = [];
  /** Indices of tracks played before the current one, most recent last. */
  private history: number[] = [];
  /** Next shuffled index, picked once so prefetch and next() agree. */
  private upcoming: number | null = null;

  getQueue(): Track[] {
    return [...this.queue];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  setCurrentIndex(index: number): void {
    const moved = index !== this.currentIndex;
    const goingBack = moved && index !== this.upcoming && this.history[this.history.length - 1] === index;
    if (goingBack) {
      this.history.pop();
    } else if (moved && this.getTrackAt(this.currentIndex)) {
      this.history.push(this.currentIndex);
      if (this.history.length > MAX_HISTORY) this.history.shift();
    }
    if (!goingBack && this.played.every(Boolean)) this.played.fill(false);
    this.currentIndex = index;
    this.upcoming = null;
    if (index >= 0 && index < this.played.length) this.played[index] = true;
  }

  getCurrentTrack(): Track | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  getTrackAt(index: number): Track | null {
    if (index >= 0 && index < this.queue.length) {
      return this.queue[index];
    }
    return null;
  }

  setQueue(
    tracks: Track[],
    startIndex = 0
  ): { selectedIndex: number; selectedTrack: Track | null } {
    this.queue = [...tracks];
    this.played = new Array(this.queue.length).fill(false);
    this.history = [];
    this.upcoming = null;
    if (this.queue.length > 0) {
      this.currentIndex = Math.max(0, Math.min(startIndex, this.queue.length - 1));
      this.played[this.currentIndex] = true;
      return { selectedIndex: this.currentIndex, selectedTrack: this.queue[this.currentIndex] };
    }
    this.currentIndex = -1;
    return { selectedIndex: -1, selectedTrack: null };
  }

  addToQueue(track: Track): { isFirst: boolean } {
    if (isSameTrack(this.queue[this.queue.length - 1], track)) {
      return { isFirst: false };
    }
    this.queue.push(track);
    this.played.push(false);
    if (this.currentIndex === -1) {
      this.currentIndex = 0;
      this.played[0] = true;
      this.upcoming = null;
      return { isFirst: true };
    }
    return { isFirst: false };
  }

  removeFromQueue(index: number): {
    removed: boolean;
    nextAction: 'none' | 'stop' | 'playNext' | 'shifted';
    nextIndex: number;
  } {
    if (index < 0 || index >= this.queue.length) {
      return { removed: false, nextAction: 'none', nextIndex: this.currentIndex };
    }
    this.queue.splice(index, 1);
    this.played.splice(index, 1);
    this.history = this.history
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i));
    this.upcoming = null;

    if (index === this.currentIndex) {
      this.currentIndex = -1;
      if (this.queue.length === 0) {
        return { removed: true, nextAction: 'stop', nextIndex: -1 };
      }
      const nextIndex = Math.min(index, this.queue.length - 1);
      return { removed: true, nextAction: 'playNext', nextIndex };
    } else if (index < this.currentIndex) {
      this.currentIndex--;
      return { removed: true, nextAction: 'shifted', nextIndex: this.currentIndex };
    }
    return { removed: true, nextAction: 'none', nextIndex: this.currentIndex };
  }

  clear(): void {
    this.queue = [];
    this.currentIndex = -1;
    this.played = [];
    this.history = [];
    this.upcoming = null;
  }

  findIndexByVideoId(videoId: string): number {
    return this.queue.findIndex((t) => t.videoId === videoId);
  }

  insertAfterCurrent(track: Track): number {
    const insertIdx = this.currentIndex + 1;
    if (isSameTrack(this.queue[insertIdx - 1], track)) {
      return insertIdx - 1;
    }
    if (isSameTrack(this.queue[insertIdx], track)) {
      return insertIdx;
    }
    this.queue.splice(insertIdx, 0, track);
    this.played.splice(insertIdx, 0, false);
    this.history = this.history.map((i) => (i >= insertIdx ? i + 1 : i));
    this.upcoming = null;
    return insertIdx;
  }

  hasNext(): boolean {
    if (this.isShuffle) return this.pickShuffleNext() !== null;
    return this.currentIndex < this.queue.length - 1;
  }

  hasPrevious(): boolean {
    if (this.isShuffle) return this.history.length > 0;
    return this.currentIndex > 0;
  }

  /**
   * Shuffle plays every track once per cycle. When the cycle is done it ends,
   * or starts a new one with repeat 'all'. The pick is cached until the
   * queue or position changes.
   */
  private pickShuffleNext(): number | null {
    if (this.upcoming !== null) return this.upcoming;
    const others = this.queue.map((_, i) => i).filter((i) => i !== this.currentIndex);
    const unplayed = others.filter((i) => !this.played[i]);
    const candidates = unplayed.length > 0 || this.repeatMode !== 'all' ? unplayed : others;
    if (candidates.length === 0) return null;
    this.upcoming = candidates[Math.floor(Math.random() * candidates.length)];
    return this.upcoming;
  }

  getNextIndex(): number | null {
    if (this.queue.length === 0) return null;
    if (this.isShuffle) return this.pickShuffleNext();
    if (this.currentIndex < this.queue.length - 1) {
      return this.currentIndex + 1;
    }
    if (this.repeatMode === 'all') {
      return 0;
    }
    return null;
  }

  getPreviousIndex(): number | null {
    if (this.queue.length === 0) return null;
    if (this.isShuffle) return this.history[this.history.length - 1] ?? null;
    if (this.currentIndex > 0) {
      return this.currentIndex - 1;
    }
    if (this.repeatMode === 'all' && this.queue.length > 0) {
      return this.queue.length - 1;
    }
    return null;
  }

  getNextUpcomingTrack(): Track | null {
    if (this.isShuffle) {
      const shuffled = this.pickShuffleNext();
      return shuffled === null ? null : this.queue[shuffled];
    }
    const nextIndex = this.currentIndex + 1;
    return (
      this.queue[nextIndex] ||
      (this.repeatMode === 'all' && this.queue.length > 1 ? this.queue[0] : null)
    );
  }

  setRepeatMode(mode: RepeatMode): void {
    this.repeatMode = mode;
    this.upcoming = null;
  }

  getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  setShuffle(shuffle: boolean): void {
    if (shuffle && !this.isShuffle) {
      this.played.fill(false);
      if (this.currentIndex >= 0 && this.currentIndex < this.played.length) {
        this.played[this.currentIndex] = true;
      }
    }
    this.isShuffle = shuffle;
    this.upcoming = null;
  }

  getShuffle(): boolean {
    return this.isShuffle;
  }

  getLength(): number {
    return this.queue.length;
  }
}
