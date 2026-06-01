const body = document.body;
const root = document.documentElement;

const terminalOpen = document.getElementById('terminal-open');
const truthLayer = document.getElementById('truth-layer');
const terminalInput = document.getElementById('terminal-input');
const terminalOutput = document.getElementById('terminal-output');
const terminalBody = document.getElementById('terminal-body');
const terminalWindow = document.getElementById('terminal-window');
const terminalTitle = document.getElementById('terminal-title');
const glitchField = document.getElementById('glitch-field');
const restoreField = document.getElementById('restore-field');
const truthFrame = document.getElementById('truth-frame');
const dataStream = document.getElementById('data-stream');
const matrixCanvas = document.getElementById('matrix-canvas');
const dreamParticles = document.getElementById('dream-particles');
const dateDisplay = document.getElementById('date-display');
const aboutOpen = document.getElementById('about-open');
const aboutClose = document.getElementById('about-close');
const profileNote = document.getElementById('profile-note');
const servicesOpen = document.getElementById('services-open');
const servicesClose = document.getElementById('services-close');
const servicesNote = document.getElementById('services-note');
const musicToggle = document.getElementById('music-toggle');
const musicPanel = document.getElementById('music-panel');
const musicProgress = document.getElementById('music-progress');
const musicTime = document.getElementById('music-time');
const deskAudio = document.getElementById('desk-audio');
const pianoToggle = document.getElementById('piano-toggle');
const stickyNote = document.getElementById('sticky-note');
const stickyText = document.getElementById('sticky-text');
const stickerHeart = document.getElementById('sticker-heart');
const heartBurst = document.getElementById('heart-burst');
const sayoriImg = document.getElementById('sayori-img');

const reduceMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const coarsePointerQuery = window.matchMedia?.('(pointer: coarse)');
const BLOG_URL = 'pages/blog.html';
const TRUTH_MUSIC_URL = 'https://music.163.com/outchain/player?type=2&id=523658877&auto=1&height=66';
const TRANSITION = {
  collapseMs: 4200,
  restoreMs: 5200,
};

let cmdData = null;
let currentLayer = 'dream';
let locked = false;
let matrixActive = false;
let matrixRaf = 0;
let pianoNotesTimer = 0;
let audioCtx = null;
let musicNoteAnchor = musicToggle;
let truthMusic = null;
let cmdDataPromise = null;

initDate();
spawnDreamParticles();
initParallax();
initProfileNote();
initServicesNote();
initMusic();
initHeartBurst();
initStickyNote();
initSayoriDrag();
initTerminal();

async function loadCmdData() {
  if (cmdData) return cmdData;
  if (cmdDataPromise) return cmdDataPromise;
  cmdDataPromise = (async () => {
    try {
      const res = await fetch('assets/data/landing-lines.json');
      if (res.ok) cmdData = await res.json();
    } catch {
      cmdData = null;
    }
    return cmdData;
  })();
  return cmdDataPromise;
}

async function ensureCmdData() {
  if (cmdData) return cmdData;
  try {
    return await loadCmdData();
  } catch {
    cmdData = null;
    return null;
  }
}

function initDate() {
  if (!dateDisplay) return;
  const now = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  dateDisplay.textContent = `${now.getMonth() + 1} / ${now.getDate()} · 星期${weekdays[now.getDay()]}`;
}

function prefersReducedMotion() {
  return reduceMotionQuery?.matches || false;
}

function spawnDreamParticles() {
  if (!dreamParticles || prefersReducedMotion()) return;
  const count = coarsePointerQuery?.matches ? 14 : 28;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement('i');
    const opacity = 0.14 + Math.random() * 0.24;
    dot.className = 'dream-dot';
    dot.style.setProperty('--x', `${(Math.random() * 100).toFixed(2)}%`);
    dot.style.setProperty('--y', `${(Math.random() * 100).toFixed(2)}%`);
    dot.style.setProperty('--s', `${(4 + Math.random() * 9).toFixed(1)}px`);
    dot.style.setProperty('--o', opacity.toFixed(2));
    dot.style.setProperty('--dx', `${((Math.random() - 0.5) * 4).toFixed(2)}rem`);
    dot.style.setProperty('--dy', `${((Math.random() - 0.5) * 3).toFixed(2)}rem`);
    dot.style.setProperty('--rot', `${((Math.random() - 0.5) * 140).toFixed(0)}deg`);
    dot.style.setProperty('--dur', `${(7 + Math.random() * 9).toFixed(2)}s`);
    dot.style.setProperty('--delay', `${(-Math.random() * 8).toFixed(2)}s`);
    frag.append(dot);
  }
  dreamParticles.append(frag);
}

function initParallax() {
  if (prefersReducedMotion()) return;
  let targetX = 0;
  let targetY = 0;
  let raf = 0;

  const apply = () => {
    raf = 0;
    root.style.setProperty('--motion-x', `${(targetX * -10).toFixed(2)}px`);
    root.style.setProperty('--motion-y', `${(targetY * -8).toFixed(2)}px`);
  };
  const queue = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };
  window.addEventListener('pointermove', (event) => {
    targetX = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth - 0.5) * 2));
    targetY = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight - 0.5) * 2));
    queue();
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
    queue();
  }, { passive: true });
}

function initProfileNote() {
  aboutOpen?.addEventListener('click', () => {
    if (currentLayer !== 'dream') return;
    closeServicesNote({ restoreFocus: false });
    body.classList.add('profile-open');
    profileNote?.setAttribute('aria-hidden', 'false');
    aboutOpen.setAttribute('aria-expanded', 'true');
    window.setTimeout(() => aboutClose?.focus({ preventScroll: true }), 260);
  });
  aboutClose?.addEventListener('click', closeProfileNote);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && body.classList.contains('profile-open')) closeProfileNote();
  });
}

function closeProfileNote(opts = {}) {
  body.classList.remove('profile-open');
  profileNote?.setAttribute('aria-hidden', 'true');
  aboutOpen?.setAttribute('aria-expanded', 'false');
  if (opts.restoreFocus !== false) aboutOpen?.focus({ preventScroll: true });
}

function initServicesNote() {
  servicesOpen?.addEventListener('click', () => {
    if (currentLayer !== 'dream') return;
    closeProfileNote({ restoreFocus: false });
    body.classList.add('services-open');
    servicesNote?.setAttribute('aria-hidden', 'false');
    servicesOpen.setAttribute('aria-expanded', 'true');
    window.setTimeout(() => servicesClose?.focus({ preventScroll: true }), 260);
  });
  servicesClose?.addEventListener('click', closeServicesNote);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && body.classList.contains('services-open')) closeServicesNote();
  });
}

function closeServicesNote(opts = {}) {
  body.classList.remove('services-open');
  servicesNote?.setAttribute('aria-hidden', 'true');
  servicesOpen?.setAttribute('aria-expanded', 'false');
  if (opts.restoreFocus !== false) servicesOpen?.focus({ preventScroll: true });
}

function initMusic() {
  if (!musicToggle || !deskAudio) return;
  deskAudio.volume = 0.5;
  musicToggle.addEventListener('click', toggleMusic);
  pianoToggle?.addEventListener('click', toggleMusicFromPiano);
  deskAudio.addEventListener('timeupdate', syncMusicProgress);
  deskAudio.addEventListener('loadedmetadata', syncMusicProgress);
}

function ensureDeskAudioSource() {
  if (!deskAudio) return;
  if (!deskAudio.getAttribute('src')) {
    const src = deskAudio.dataset.src;
    if (src) deskAudio.src = src;
  }
}

async function toggleMusic() {
  if (!deskAudio) return 'missing';
  if (deskAudio.paused) {
    try {
      ensureDeskAudioSource();
      await deskAudio.play();
      setMusicPlayingState(true, musicToggle);
      musicPanel?.classList.remove('is-open');
      musicPanel?.setAttribute('aria-hidden', 'true');
      startPianoNotes(musicToggle);
      return 'playing';
    } catch {
      musicPanel?.classList.add('is-open');
      musicPanel?.setAttribute('aria-hidden', 'false');
      return 'blocked';
    }
  }

  if (!musicPanel?.classList.contains('is-open')) {
    musicPanel?.classList.add('is-open');
    musicPanel?.setAttribute('aria-hidden', 'false');
    return 'panel';
  }

  deskAudio.pause();
  setMusicPlayingState(false);
  musicPanel?.classList.remove('is-open');
  musicPanel?.setAttribute('aria-hidden', 'true');
  stopPianoNotes();
  return 'paused';
}

async function toggleMusicFromPiano() {
  if (!deskAudio) return 'missing';
  if (deskAudio.paused) {
    try {
      ensureDeskAudioSource();
      await deskAudio.play();
      setMusicPlayingState(true, pianoToggle || musicToggle);
      musicPanel?.classList.remove('is-open');
      musicPanel?.setAttribute('aria-hidden', 'true');
      startPianoNotes(pianoToggle || musicToggle);
      return 'playing';
    } catch {
      musicPanel?.classList.add('is-open');
      musicPanel?.setAttribute('aria-hidden', 'false');
      return 'blocked';
    }
  }
  deskAudio.pause();
  setMusicPlayingState(false);
  musicPanel?.classList.remove('is-open');
  musicPanel?.setAttribute('aria-hidden', 'true');
  stopPianoNotes();
  return 'paused';
}

function setMusicPlayingState(isPlaying, anchor = musicNoteAnchor) {
  musicToggle?.classList.toggle('is-playing', isPlaying);
  pianoToggle?.classList.toggle('is-playing', isPlaying);
  if (isPlaying) musicNoteAnchor = anchor || musicToggle;
}

function syncMusicProgress() {
  if (!deskAudio) return;
  const duration = Number.isFinite(deskAudio.duration) ? deskAudio.duration : 0;
  const current = Number.isFinite(deskAudio.currentTime) ? deskAudio.currentTime : 0;
  const percent = duration ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
  if (musicProgress) musicProgress.style.width = `${percent}%`;
  if (musicTime) musicTime.textContent = duration ? `-${formatTime(Math.max(0, duration - current))}` : '--:--';
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playGlitchSfx(durationMs) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const duration = Math.min(durationMs / 1000, 6);
  const now = ctx.currentTime;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  noise.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2400, now);
  filter.frequency.exponentialRampToValueAtTime(130, now + duration);
  filter.Q.value = 4;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
  gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);

  const rumble = ctx.createOscillator();
  const rumbleGain = ctx.createGain();
  rumble.type = 'sawtooth';
  rumble.frequency.setValueAtTime(70, now);
  rumble.frequency.linearRampToValueAtTime(38, now + duration);
  rumbleGain.gain.setValueAtTime(0.07, now);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  rumble.connect(rumbleGain);
  rumbleGain.connect(ctx.destination);
  rumble.start(now);
  rumble.stop(now + duration);
}

function playRestoreSfx(durationMs) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const duration = Math.min(durationMs / 1000, 6);
  const now = ctx.currentTime;
  [330, 440, 660].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now + i * 0.18);
    gain.gain.linearRampToValueAtTime(0.07, now + i * 0.18 + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.18);
    osc.stop(now + duration);
  });
}

function startTruthMusic() {
  if (truthFrame && truthFrame.src !== TRUTH_MUSIC_URL) truthFrame.src = TRUTH_MUSIC_URL;
  if (truthMusic || prefersReducedMotion()) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const master = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const tremolo = ctx.createOscillator();
  const tremoloGain = ctx.createGain();
  const now = ctx.currentTime;
  const oscillators = [55, 110, 164.81].map((freq, index) => {
    const osc = ctx.createOscillator();
    osc.type = index === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(index === 2 ? -14 : 0, now);
    return osc;
  });

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(680, now);
  filter.Q.value = 1.8;
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.032, now + 1.2);
  tremolo.frequency.setValueAtTime(0.18, now);
  tremoloGain.gain.setValueAtTime(0.018, now);
  tremolo.connect(tremoloGain);
  tremoloGain.connect(master.gain);
  oscillators.forEach((osc) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(osc.frequency.value === 55 ? 0.55 : 0.25, now);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(now);
  });
  filter.connect(master);
  master.connect(ctx.destination);
  tremolo.start(now);

  const notes = [220, 246.94, 261.63, 329.63, 293.66, 246.94, 220, 196];
  let step = 0;
  const playNote = () => {
    if (!truthMusic) return;
    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(notes[step % notes.length], start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.026, start + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 1.2);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(start);
    osc.stop(start + 1.25);
    step += 1;
  };
  playNote();
  const noteTimer = window.setInterval(playNote, 960);
  truthMusic = { ctx, master, oscillators, tremolo, noteTimer };
}

function stopTruthMusic(durationMs = 1600) {
  if (truthFrame) {
    window.setTimeout(() => {
      truthFrame.src = 'about:blank';
    }, Math.min(900, Math.max(0, durationMs)));
  }
  if (!truthMusic) return;
  const music = truthMusic;
  truthMusic = null;
  window.clearInterval(music.noteTimer);
  const now = music.ctx.currentTime;
  const fade = Math.max(0.2, durationMs / 1000);
  music.master.gain.cancelScheduledValues(now);
  music.master.gain.setValueAtTime(Math.max(0.0001, music.master.gain.value || 0.04), now);
  music.master.gain.exponentialRampToValueAtTime(0.001, now + fade);
  [...music.oscillators, music.tremolo].forEach((osc) => {
    try { osc.stop(now + fade + 0.05); } catch { /* already stopped */ }
  });
}

function startPianoNotes(anchor = musicNoteAnchor) {
  if (!anchor || prefersReducedMotion()) return;
  musicNoteAnchor = anchor;
  spawnPianoNote();
  window.clearInterval(pianoNotesTimer);
  pianoNotesTimer = window.setInterval(spawnPianoNote, 520);
}

function stopPianoNotes() {
  window.clearInterval(pianoNotesTimer);
  pianoNotesTimer = 0;
}

function spawnPianoNote() {
  const anchor = musicNoteAnchor || musicToggle;
  if (!anchor || !musicToggle?.classList.contains('is-playing')) return;
  const note = document.createElement('span');
  note.className = 'floating-note';
  note.textContent = ['♪', '♫', '♬', '♩'][Math.floor(Math.random() * 4)];
  const rect = anchor.getBoundingClientRect();
  note.style.setProperty('--note-left', `${(rect.left + rect.width * 0.45).toFixed(1)}px`);
  note.style.setProperty('--note-top', `${(rect.top + rect.height * 0.45).toFixed(1)}px`);
  note.style.setProperty('--note-x', `${((Math.random() - 0.5) * 56).toFixed(1)}px`);
  note.style.setProperty('--note-y', `${(-58 - Math.random() * 58).toFixed(1)}px`);
  note.style.setProperty('--note-r', `${((Math.random() - 0.5) * 38).toFixed(0)}deg`);
  note.style.setProperty('--note-s', `${(0.85 + Math.random() * 0.45).toFixed(2)}`);
  document.body.append(note);
  setTimeout(() => note.remove(), 1500);
}

function initHeartBurst() {
  if (!stickerHeart || !heartBurst) return;
  stickerHeart.addEventListener('click', () => {
    if (currentLayer !== 'dream') return;
    heartBurst.replaceChildren();
    const count = 8 + Math.floor(Math.random() * 5);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const h = document.createElement('span');
      h.className = 'mini-heart';
      h.textContent = '♡';
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = 30 + Math.random() * 50;
      h.style.setProperty('--tx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
      h.style.setProperty('--ty', `${(Math.sin(angle) * dist).toFixed(1)}px`);
      h.style.setProperty('--rot', `${((Math.random() - 0.5) * 60).toFixed(0)}deg`);
      h.style.setProperty('--size', `${(0.7 + Math.random() * 0.8).toFixed(2)}rem`);
      h.style.setProperty('--delay', `${(Math.random() * 0.15).toFixed(2)}s`);
      frag.append(h);
    }
    heartBurst.append(frag);
    setTimeout(() => heartBurst.replaceChildren(), 1400);
  });
}

function initStickyNote() {
  if (!stickyNote || !stickyText) return;
  const quotes = [
    '今天也把接口测完。',
    '缓存别忘了过期时间。',
    '先写测试，再去喝水。',
    'RabbitMQ 正在排队。',
    'Neo4j 关系图谱很适合讲故事。',
    '输入 /blog 进入博客。'
  ];
  stickyText.textContent = quotes[Math.floor(Math.random() * quotes.length)];

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let origLeft = 0;
  let origTop = 0;
  stickyNote.addEventListener('pointerdown', (event) => {
    if (currentLayer !== 'dream') return;
    dragging = true;
    stickyNote.classList.add('is-dragging');
    const rect = stickyNote.getBoundingClientRect();
    const parentRect = stickyNote.offsetParent.getBoundingClientRect();
    origLeft = rect.left - parentRect.left;
    origTop = rect.top - parentRect.top;
    startX = event.clientX;
    startY = event.clientY;
    event.preventDefault();
  });
  document.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    stickyNote.style.left = `${origLeft + event.clientX - startX}px`;
    stickyNote.style.top = `${origTop + event.clientY - startY}px`;
    stickyNote.style.right = 'auto';
    stickyNote.style.bottom = 'auto';
  }, { passive: true });
  document.addEventListener('pointerup', () => {
    dragging = false;
    stickyNote.classList.remove('is-dragging');
  });
}

function initSayoriDrag() {
  if (!sayoriImg) return;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let origLeft = 0;
  let origTop = 0;

  sayoriImg.addEventListener('pointerdown', (event) => {
    if (currentLayer !== 'dream') return;
    dragging = true;
    sayoriImg.classList.add('is-dragging');
    sayoriImg.setPointerCapture(event.pointerId);
    const rect = sayoriImg.getBoundingClientRect();
    const parentRect = sayoriImg.offsetParent.getBoundingClientRect();
    origLeft = rect.left - parentRect.left;
    origTop = rect.top - parentRect.top;
    startX = event.clientX;
    startY = event.clientY;
    event.preventDefault();
  });
  sayoriImg.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    sayoriImg.style.left = `${origLeft + event.clientX - startX}px`;
    sayoriImg.style.top = `${origTop + event.clientY - startY}px`;
    sayoriImg.style.right = 'auto';
    sayoriImg.style.bottom = 'auto';
  });
  sayoriImg.addEventListener('pointerup', () => {
    dragging = false;
    sayoriImg.classList.remove('is-dragging');
  });
}

function initTerminal() {
  terminalOpen?.addEventListener('click', openTerminal);
  terminalInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const raw = terminalInput.value.trim();
    terminalInput.value = '';
    if (raw) handleCommand(raw);
  });
  truthLayer?.addEventListener('click', (event) => {
    if (currentLayer !== 'truth') return;
    if (event.target.closest('button, input')) return;
    terminalInput?.focus();
  });
  terminalWindow?.querySelector('.dot-close')?.addEventListener('click', restoreDream);
  terminalWindow?.querySelector('.dot-minimize')?.addEventListener('click', restoreDream);
  initTerminalDrag();
}

function openTerminal() {
  if (locked || currentLayer !== 'dream') return;
  locked = true;
  currentLayer = 'transition';
  ensureCmdData();
  closeProfileNote({ restoreFocus: false });
  closeServicesNote({ restoreFocus: false });
  terminalOpen?.setAttribute('aria-expanded', 'true');
  const durMs = prefersReducedMotion() ? 650 : TRANSITION.collapseMs;
  setCssTimeMs('--collapse-ms', durMs);
  setCssTimeMs('--glitch-ms', Math.round(durMs * 0.62));
  playGlitchSfx(durMs + 900);
  startTruthMusic();
  body.classList.add('is-collapsing', 'is-shaking');
  spawnGlitchBits(prefersReducedMotion() ? 0 : 180, durMs);
  setTimeout(() => body.classList.remove('is-shaking'), 420);
  setTimeout(spawnSecondShake, Math.round(durMs * 0.45));
  setTimeout(spawnSecondShake, Math.round(durMs * 0.75));
  setTimeout(() => {
    truthLayer?.removeAttribute('hidden');
    requestAnimationFrame(() => {
      body.classList.add('is-truth');
      body.classList.remove('is-collapsing');
      body.classList.remove('is-shaking');
      currentLayer = 'truth';
      locked = false;
      glitchField?.replaceChildren();
      spawnDataStream();
      bootTerminal();
    });
  }, durMs);
}

function restoreDream() {
  if (locked || currentLayer !== 'truth') return;
  locked = true;
  currentLayer = 'transition';
  stopMatrix();
  const durMs = prefersReducedMotion() ? 650 : TRANSITION.restoreMs;
  setCssTimeMs('--restore-ms', durMs);
  playRestoreSfx(durMs);
  stopTruthMusic(Math.min(2200, durMs));
  body.classList.add('is-restoring');
  body.classList.remove('is-truth');
  body.className = body.className.replace(/theme-\w+/g, '').trim();
  spawnPaperShards(prefersReducedMotion() ? 0 : 90, durMs);
  setTimeout(() => {
    body.classList.remove('is-restoring');
    truthLayer?.setAttribute('hidden', '');
    restoreField?.querySelectorAll('.paper-shard').forEach((node) => node.remove());
    dataStream?.replaceChildren();
    resetTerminalPosition();
    terminalOpen?.setAttribute('aria-expanded', 'false');
    currentLayer = 'dream';
    locked = false;
  }, durMs);
}

async function bootTerminal() {
  if (!terminalOutput) return;
  await ensureCmdData();
  terminalOutput.innerHTML = '';
  appendOutput(cmdData?.greeting || 'xiaoshi.exe 已启动。输入 /help 查看可用指令。', 'sayori-text');
  setTimeout(() => terminalInput?.focus(), 80);
}

function handleCommand(raw) {
  appendOutput(`> ${raw}`, 'cmd-echo');
  const lowered = raw.trim().toLowerCase();
  const cmd = lowered.replace(/^\//, '');

  if (cmd === 'help') {
    printLines(cmdData?.responses?.help || ['no help available.']);
  } else if (cmd === 'blog') {
    appendOutput('正在进入博客首页...', 'ok');
    setTimeout(() => { location.href = BLOG_URL; }, 450);
  } else if (cmd === 'github') {
    appendOutput('正在打开 GitHub 主页...', 'ok');
    setTimeout(() => { window.open('https://github.com/youzenghe/', '_blank', 'noopener,noreferrer'); }, 450);
  } else if (cmd === 'projects') {
    appendOutput('正在打开项目列表...', 'ok');
    setTimeout(() => { location.href = 'pages/projects.html'; }, 450);
  } else if (cmd === 'posts') {
    appendOutput('正在打开文章列表...', 'ok');
    setTimeout(() => { location.href = 'pages/posts.html'; }, 450);
  } else if (cmd === 'about') {
    printLines(cmdData?.responses?.about || []);
  } else if (cmd === 'skills') {
    printLines(cmdData?.responses?.skills || []);
  } else if (cmd === 'resume') {
    printLines(cmdData?.responses?.resume || []);
  } else if (cmd === 'classic') {
    printLines(cmdData?.responses?.classic || []);
  } else if (cmd === 'poem') {
    printLines(cmdData?.responses?.poem || []);
  } else if (cmd === 'music') {
    toggleMusic().then((state) => {
      const message = {
        playing: 'bg.mp3 播放中。',
        paused: '音乐已暂停。',
        panel: '音乐信息已展开。',
        blocked: '浏览器暂时拦截了播放，点击音乐按钮试试。'
      }[state] || '没有找到音乐播放器。';
      appendOutput(message, state === 'blocked' ? 'sayori-text' : 'ok');
    });
  } else if (cmd === 'restore' || cmd === 'exit' || cmd === 'quit' || cmd === 'y') {
    appendOutput(cmdData?.responses?.restore || 'restoring...', 'sayori-text');
    setTimeout(restoreDream, 800);
  } else if (cmd === 'clear' || cmd === 'cls') {
    terminalOutput.innerHTML = '';
  } else if (cmd === 'glitch') {
    appendOutput(cmdData?.responses?.glitch_msg || 'glitch.', 'system');
    spawnGlitchBits(60, 650);
    playGlitchSfx(700);
  } else if (cmd === 'matrix') {
    appendOutput(cmdData?.responses?.matrix_msg || 'matrix.', 'system');
    startMatrix();
  } else if (cmd.startsWith('color')) {
    handleColor(cmd);
  } else if (cmd === 'cat sayori.txt' || cmd === 'cat sayori') {
    appendOutput('这里没有删除按钮，只有通往博客的门。', 'sayori-text');
  } else if (tryEgg(lowered) || tryEgg(cmd)) {
    // handled
  } else {
    const fallbacks = cmdData?.fallback || ['?'];
    appendOutput(`xiaoshi.exe: ${fallbacks[Math.floor(Math.random() * fallbacks.length)]}`, 'sayori-text');
  }
  scrollTerminal();
}

function handleColor(cmd) {
  const color = cmd.split(/\s+/)[1];
  const valid = ['pink', 'green', 'amber', 'reset'];
  if (!color || !valid.includes(color)) {
    printLines(cmdData?.responses?.color_help || ['usage: /color <name>']);
    return;
  }
  body.className = body.className.replace(/theme-\w+/g, '').trim();
  if (color !== 'reset') body.classList.add(`theme-${color}`);
  appendOutput(cmdData?.responses?.color_changed || 'color changed.', 'ok');
}

function tryEgg(key) {
  const eggs = cmdData?.eggs || {};
  if (!Object.prototype.hasOwnProperty.call(eggs, key)) return false;
  const value = eggs[key];
  const lines = Array.isArray(value) ? value : [value];
  lines.forEach((line) => appendOutput(line, 'sayori-text'));
  return true;
}

function printLines(lines) {
  lines.forEach((line) => appendOutput(line, 'info'));
}

function appendOutput(text, cls) {
  const p = document.createElement('p');
  p.className = cls || '';
  p.textContent = text;
  terminalOutput?.append(p);
  scrollTerminal();
}

function scrollTerminal() {
  if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
}

function setCssTimeMs(name, value) {
  root.style.setProperty(name, `${Math.max(0, Math.round(value))}ms`);
}

function spawnSecondShake() {
  if (currentLayer !== 'transition') return;
  body.classList.add('is-shaking');
  setTimeout(() => body.classList.remove('is-shaking'), 360);
}

function spawnGlitchBits(count, totalMs) {
  if (!glitchField || prefersReducedMotion()) return;
  glitchField.replaceChildren();
  setCssTimeMs('--glitch-ms', Math.max(450, Math.round(totalMs * 0.62)));
  const colors = ['#ffffff', '#ff4f86', '#75e7ff', '#9dffbd', '#ffd278', '#11161c'];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const bit = document.createElement('i');
    bit.className = 'glitch-bit';
    bit.style.setProperty('--x', `${Math.random() * 100}%`);
    bit.style.setProperty('--y', `${Math.random() * 100}%`);
    bit.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}rem`);
    bit.style.setProperty('--dy', `${(Math.random() - 0.5) * 40}rem`);
    bit.style.setProperty('--s', `${(Math.random() * 0.9 + 0.22).toFixed(2)}rem`);
    bit.style.setProperty('--d', `${(Math.random() * (totalMs * 0.4) / 1000).toFixed(2)}s`);
    bit.style.setProperty('--c', colors[i % colors.length]);
    frag.append(bit);
  }
  glitchField.append(frag);
  setTimeout(() => glitchField.replaceChildren(), totalMs + 400);
}

function spawnPaperShards(count, totalMs) {
  if (!restoreField || prefersReducedMotion()) return;
  restoreField.querySelectorAll('.paper-shard').forEach((node) => node.remove());
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const shard = document.createElement('i');
    shard.className = 'paper-shard';
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 50;
    const sx = Math.cos(angle) * dist;
    const sy = Math.sin(angle) * dist;
    const w = 0.6 + Math.random() * 2.4;
    const h = 0.2 + Math.random() * 0.7;
    const rot = (Math.random() - 0.5) * 240;
    shard.style.setProperty('--sx', `${sx.toFixed(2)}vmax`);
    shard.style.setProperty('--sy', `${sy.toFixed(2)}vmax`);
    shard.style.setProperty('--sr', `${rot.toFixed(0)}deg`);
    shard.style.setProperty('--sx-soft', `${(sx * 0.15).toFixed(2)}vmax`);
    shard.style.setProperty('--sy-soft', `${(sy * 0.15).toFixed(2)}vmax`);
    shard.style.setProperty('--sr-soft', `${(rot * 0.2).toFixed(0)}deg`);
    shard.style.setProperty('--ss', `${(0.7 + Math.random() * 0.6).toFixed(2)}`);
    shard.style.setProperty('--d', `${(Math.random() * 0.4).toFixed(2)}s`);
    shard.style.width = `${w.toFixed(2)}rem`;
    shard.style.height = `${h.toFixed(2)}rem`;
    shard.style.marginLeft = `${(-w / 2).toFixed(2)}rem`;
    shard.style.marginTop = `${(-h / 2).toFixed(2)}rem`;
    frag.append(shard);
  }
  restoreField.append(frag);
}

function spawnDataStream() {
  if (!dataStream || prefersReducedMotion()) return;
  dataStream.replaceChildren();
  const chars = '01接口缓存队列图谱测试アイウエオ';
  const count = coarsePointerQuery?.matches ? 18 : 35;
  const colors = ['rgba(117,231,255,0.7)', 'rgba(154,255,187,0.6)', 'rgba(255,79,134,0.5)', 'rgba(255,210,120,0.5)'];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const bit = document.createElement('span');
    bit.className = 'data-bit';
    bit.textContent = chars[Math.floor(Math.random() * chars.length)];
    bit.style.setProperty('--x', `${(Math.random() * 100).toFixed(2)}%`);
    bit.style.setProperty('--size', `${(0.62 + Math.random() * 0.52).toFixed(2)}rem`);
    bit.style.setProperty('--c', colors[Math.floor(Math.random() * colors.length)]);
    bit.style.setProperty('--o', `${(0.2 + Math.random() * 0.4).toFixed(2)}`);
    bit.style.setProperty('--dur', `${(8 + Math.random() * 12).toFixed(2)}s`);
    bit.style.setProperty('--delay', `${(-Math.random() * 14).toFixed(2)}s`);
    frag.append(bit);
  }
  dataStream.append(frag);
}

function startMatrix() {
  if (!matrixCanvas) return;
  if (matrixActive) {
    stopMatrix();
    return;
  }
  matrixActive = true;
  matrixCanvas.classList.add('is-active');
  const ctx = matrixCanvas.getContext('2d');
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;

  const fontSize = 14;
  const cols = Math.floor(matrixCanvas.width / fontSize);
  const drops = Array(cols).fill(1);
  const chars = 'SPRINGBOOTREDISMYSQLNEO4J0123456789';
  const draw = () => {
    if (!matrixActive) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    ctx.font = `${fontSize}px monospace`;
    for (let i = 0; i < drops.length; i += 1) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillStyle = Math.random() > 0.96 ? '#fff' : `hsl(${120 + Math.random() * 40}, 100%, ${50 + Math.random() * 20}%)`;
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }
    matrixRaf = requestAnimationFrame(draw);
  };
  draw();
}

function stopMatrix() {
  if (!matrixActive) return;
  matrixActive = false;
  cancelAnimationFrame(matrixRaf);
  matrixCanvas?.classList.remove('is-active');
  const ctx = matrixCanvas?.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
}

function initTerminalDrag() {
  if (!terminalTitle || !terminalWindow) return;
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let posX = 0;
  let posY = 0;

  terminalTitle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.title-dot')) return;
    if (currentLayer !== 'truth') return;
    dragging = true;
    terminalTitle.classList.add('is-dragging');
    terminalTitle.setPointerCapture(event.pointerId);
    offsetX = event.clientX - posX;
    offsetY = event.clientY - posY;
  });
  terminalTitle.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    posX = event.clientX - offsetX;
    posY = event.clientY - offsetY;
    terminalWindow.style.transform = `translate(${posX}px, ${posY}px)`;
  });
  terminalTitle.addEventListener('pointerup', () => {
    dragging = false;
    terminalTitle.classList.remove('is-dragging');
  });
}

function resetTerminalPosition() {
  if (terminalWindow) terminalWindow.style.transform = '';
}
