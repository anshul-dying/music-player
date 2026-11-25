import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { QueueManager, Track } from '../src/index';

const track = (id: string): Track => ({
  id,
  videoId: id,
  title: id,
  artist: 'Artist',
  duration: 100,
  thumbnail: '',
});

function shuffledQueue(size: number, start = 0): QueueManager {
  const queue = new QueueManager();
  queue.setQueue(Array.from({ length: size }, (_, i) => track(`q${i}`)), start);
  queue.setShuffle(true);
  return queue;
}

function playThrough(queue: QueueManager, limit = 100): number[] {
  const order = [queue.getCurrentIndex()];
  for (let next = queue.getNextIndex(); next !== null; next = queue.getNextIndex()) {
    assert.ok(order.length < limit, 'shuffle did not end');
    queue.setCurrentIndex(next);
    order.push(next);
  }
  return order;
}

describe('QueueManager shuffle', () => {
  it('plays every track once and then ends with repeat off', () => {
    for (let run = 0; run < 50; run++) {
      const queue = shuffledQueue(6, run % 6);
      const order = playThrough(queue);
      assert.equal(order.length, 6);
      assert.equal(new Set(order).size, 6);
      assert.equal(queue.hasNext(), false);
    }
  });

  it('starts a new cycle with repeat all', () => {
    for (let run = 0; run < 50; run++) {
      const queue = shuffledQueue(5);
      queue.setRepeatMode('all');
      const order = [queue.getCurrentIndex()];
      for (let i = 0; i < 9; i++) {
        assert.equal(queue.hasNext(), true);
        const next = queue.getNextIndex();
        assert.notEqual(next, null);
        queue.setCurrentIndex(next!);
        order.push(next!);
      }
      assert.equal(new Set(order.slice(0, 5)).size, 5);
      assert.equal(new Set(order.slice(5)).size, 5);
    }
  });

  it('treats a wrapped pick of the previous track as moving forward', (t) => {
    const queue = shuffledQueue(3);
    queue.setRepeatMode('all');
    const random = t.mock.method(Math, 'random', () => 0);
    queue.setCurrentIndex(queue.getNextIndex()!);
    queue.setCurrentIndex(queue.getNextIndex()!);
    assert.equal(queue.getCurrentIndex(), 2);

    random.mock.mockImplementation(() => 0.99);
    assert.equal(queue.getNextIndex(), 1);
    queue.setCurrentIndex(1);
    assert.equal(queue.getPreviousIndex(), 2);
    assert.notEqual(queue.getNextIndex(), 1);
  });

  it('keeps next index and upcoming track in agreement', () => {
    const queue = shuffledQueue(8);
    for (let steps = 0; queue.hasNext(); steps++) {
      assert.ok(steps < 8, 'shuffle did not end');
      const upcoming = queue.getNextUpcomingTrack();
      const next = queue.getNextIndex();
      assert.equal(queue.getNextIndex(), next);
      assert.equal(queue.getNextUpcomingTrack(), upcoming);
      assert.equal(queue.getTrackAt(next!), upcoming);
      queue.setCurrentIndex(next!);
    }
    assert.equal(queue.getNextUpcomingTrack(), null);
  });

  it('goes back through the tracks that were actually played', () => {
    const queue = shuffledQueue(8);
    const order = [queue.getCurrentIndex()];
    for (let i = 0; i < 4; i++) {
      const next = queue.getNextIndex()!;
      queue.setCurrentIndex(next);
      order.push(next);
    }
    for (let i = order.length - 1; i > 0; i--) {
      assert.equal(queue.hasPrevious(), true);
      assert.equal(queue.getPreviousIndex(), order[i - 1]);
      queue.setCurrentIndex(order[i - 1]);
    }
    assert.equal(queue.hasPrevious(), false);
    assert.equal(queue.getPreviousIndex(), null);
  });

  it('re-shuffles the whole queue when shuffle is switched on', () => {
    const queue = new QueueManager();
    queue.setQueue([track('a'), track('b'), track('c')], 0);
    queue.setCurrentIndex(1);
    queue.setCurrentIndex(2);
    queue.setShuffle(true);
    assert.equal(queue.hasNext(), true);
    assert.equal(playThrough(queue).length, 3);
  });

  it('never picks a removed track or a stale index', () => {
    for (let run = 0; run < 50; run++) {
      const queue = shuffledQueue(6);
      queue.setCurrentIndex(queue.getNextIndex()!);
      queue.setCurrentIndex(queue.getNextIndex()!);
      queue.removeFromQueue(0);
      const order = playThrough(queue);
      assert.ok(order.every((i) => i >= 0 && i < 5));
      assert.equal(new Set(order).size, order.length);
      assert.equal(queue.getNextUpcomingTrack(), null);
    }
  });

  it('keeps played tracks marked as played after an insert', () => {
    const queue = shuffledQueue(4);
    queue.setCurrentIndex(3);
    queue.setCurrentIndex(1);
    const inserted = queue.insertAfterCurrent(track('new'));
    assert.equal(inserted, 2);
    queue.setCurrentIndex(inserted);
    assert.equal(queue.getNextIndex(), 3);
    assert.equal(queue.getTrackAt(3)?.videoId, 'q2');
  });

  it('drops the removed current track from the history', () => {
    const queue = shuffledQueue(4);
    queue.setCurrentIndex(1);
    queue.setCurrentIndex(2);
    const result = queue.removeFromQueue(2);
    assert.equal(result.nextAction, 'playNext');
    assert.equal(queue.getCurrentIndex(), -1);
    queue.setCurrentIndex(result.nextIndex);
    assert.equal(queue.getPreviousIndex(), 1);
    queue.setCurrentIndex(1);
    assert.equal(queue.getPreviousIndex(), 0);
  });

  it('keeps sequential order when shuffle is off', () => {
    const queue = new QueueManager();
    queue.setQueue([track('a'), track('b'), track('c')], 1);
    assert.equal(queue.getNextIndex(), 2);
    assert.equal(queue.getPreviousIndex(), 0);
    assert.equal(queue.getNextUpcomingTrack()?.videoId, 'c');
    queue.setCurrentIndex(2);
    assert.equal(queue.hasNext(), false);
    queue.setRepeatMode('all');
    assert.equal(queue.getNextIndex(), 0);
  });
});

describe('QueueManager consecutive deduplication', () => {
  it('prevents adding the same track consecutively via addToQueue', () => {
    const queue = new QueueManager();
    assert.deepEqual(queue.addToQueue(track('a')), { isFirst: true });
    assert.deepEqual(queue.addToQueue(track('a')), { isFirst: false });
    assert.deepEqual(
      queue.getQueue().map((t) => t.videoId),
      ['a']
    );
  });

  it('allows duplicate tracks in addToQueue when at least one different track is in between', () => {
    const queue = new QueueManager();
    queue.addToQueue(track('a'));
    queue.addToQueue(track('b'));
    queue.addToQueue(track('a'));
    queue.addToQueue(track('a'));
    assert.deepEqual(
      queue.getQueue().map((t) => t.videoId),
      ['a', 'b', 'a']
    );
  });

  it('matches tracks by videoId even when id differs, and falls back to id when videoId is empty', () => {
    const queue = new QueueManager();
    queue.addToQueue({ ...track('a'), id: 'pl-1', videoId: 'vid-a' });
    queue.addToQueue({ ...track('a'), id: 'pl-2', videoId: 'vid-a' });
    queue.addToQueue({ ...track('b'), id: 'id-b', videoId: '' });
    queue.addToQueue({ ...track('b'), id: 'id-b', videoId: '' });
    assert.deepEqual(
      queue.getQueue().map((t) => t.id),
      ['pl-1', 'id-b']
    );
  });

  it('prevents inserting the same track adjacent to current or next via insertAfterCurrent', () => {
    const queue = new QueueManager();
    queue.setQueue([track('a'), track('b')], 0);

    assert.equal(queue.insertAfterCurrent(track('a')), 0);
    assert.equal(queue.insertAfterCurrent(track('b')), 1);
    assert.deepEqual(
      queue.getQueue().map((t) => t.videoId),
      ['a', 'b']
    );

    assert.equal(queue.insertAfterCurrent(track('c')), 1);
    assert.deepEqual(
      queue.getQueue().map((t) => t.videoId),
      ['a', 'c', 'b']
    );
  });

  it('allows insertAfterCurrent when duplicate is separated by at least one different track', () => {
    const queue = new QueueManager();
    queue.setQueue([track('a'), track('b')], 1);

    assert.equal(queue.insertAfterCurrent(track('a')), 2);
    assert.deepEqual(
      queue.getQueue().map((t) => t.videoId),
      ['a', 'b', 'a']
    );
  });
});
