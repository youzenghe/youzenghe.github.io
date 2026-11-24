import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';

const read=name=>fs.readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
test('every page layout owns required global color, spacing and radius variables',()=>{
  assert.match(read('src/layouts/Layout.astro'),/import\s+["']\.\.\/styles\/variables\.styl["']/);
});
test('Markdown owns its prose and repository card styles independently of encryption',()=>{
  const component=read('src/components/misc/Markdown.astro');
  for(const file of ['markdown.css','markdown-extend.styl'])assert.match(component,new RegExp(`import\\s+["'](?:\\.\\.\\/\\.\\.\\/styles\\/|@\\/styles\\/)${file.replace('.','\\.')}["']`));
});
test('navigation verification checks actual healthy CSS instead of only parity',()=>{
  const probe=read('tests/browser/navigation-style-parity.js');
  assert.match(probe,/--radius-large/);
  assert.match(probe,/--primary/);
  assert.match(probe,/getComputedStyle\(card\)\.borderRadius/);
  assert.match(probe,/gc-titlebar/);
});
