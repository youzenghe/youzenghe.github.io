import assert from 'node:assert/strict';
import { test } from 'node:test';
import { musicTitle, scanLocalMusic } from '../scripts/prepare-local-music.mjs';

test('music titles prefer embedded title, then filename, with explicit overrides', () => {
  assert.equal(musicTitle('track.mp3', '鸟之诗 (钢琴纯音乐)'), '鸟之诗 (钢琴纯音乐)');
  assert.equal(musicTitle('未闻花名.钢琴版.m4a', ''), '未闻花名.钢琴版');
  assert.equal(musicTitle('background.mp3', '', '我忘了歌的名字'), '我忘了歌的名字');
  assert.equal(musicTitle('白金disco.mp3', '  '), '白金disco');
});

test('local metadata scan produces five ordered playable tracks without an artist placeholder', async () => {
  const songs = await scanLocalMusic();
  assert.equal(songs.length, 5);
  assert.equal(songs[0].title, '我忘了歌的名字');
  assert.equal(songs[1].title, '神的随波逐流');
  assert.equal(songs[4].title, '鸟之诗 (钢琴纯音乐)');
  for (const song of songs) {
    assert.ok(song.duration > 0);
    assert.ok(song.url.startsWith('/assets/music/'));
    assert.equal(song.artist, '');
  }
});
