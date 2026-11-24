import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFile } from 'music-metadata';

const root = fileURLToPath(new URL('../', import.meta.url));
const extensions = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.opus', '.flac', '.wav']);

export function musicTitle(filename, embeddedTitle, override) {
  for (const value of [override, embeddedTitle, path.parse(filename).name]) {
    if (typeof value === 'string' && value.trim()) {
      const title = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
      if (title) return title;
    }
  }
  return path.parse(filename).name;
}

export async function scanLocalMusic(directory = path.join(root, 'public/assets/music'), settings) {
  settings ??= JSON.parse(await fs.readFile(path.join(root, 'src/data/music-library.json'), 'utf8'));
  const entries = (await fs.readdir(directory, {withFileTypes:true}))
    .filter(entry => entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase()))
    .map(entry => entry.name);
  const order = settings.order ?? [];
  entries.sort((a,b) => {
    const ai = order.indexOf(a), bi = order.indexOf(b);
    return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi) || a.localeCompare(b, 'zh-CN');
  });
  const songs = [];
  for (const [index, filename] of entries.entries()) {
    const metadata = await parseFile(path.join(directory, filename), {duration:true,skipCovers:true});
    songs.push({
      id: index + 1,
      title: musicTitle(filename, metadata.common.title, settings.titles?.[filename]),
      artist: '',
      url: `/assets/music/${encodeURIComponent(filename)}`,
      duration: metadata.format.duration ?? 0,
    });
  }
  return songs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const songs = await scanLocalMusic();
  const output = path.join(root, 'src/data/local-music.json');
  const bytes = JSON.stringify(songs, null, 2) + '\n';
  let previous = '';
  try { previous = await fs.readFile(output, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous !== bytes) await fs.writeFile(output, bytes);
  console.log(`Prepared ${songs.length} local music tracks.`);
}
