import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {BLOG_HOME_PATH} from '../src/constants/constants.ts';
import {siteConfig} from '../src/config/siteConfig.ts';

const root=new URL('../',import.meta.url),read=(name:string)=>fs.readFileSync(new URL(name,root),'utf8');
test('entry homepage is separate from the existing blog homepage',()=>{
  assert.equal(BLOG_HOME_PATH,'/blog/');
  assert.ok(read('src/pages/index.astro').includes('set:html'));
  assert.ok(read('src/pages/blog/[...page].astro').includes('getSortedPosts'));
  assert.ok(!fs.existsSync(new URL('src/pages/[...page].astro',root)));
  const entry=read('src/entry/landing.html');
  assert.match(entry,/href="pages\/blog\.html"/);
  assert.doesNotMatch(entry,/个人致敬|非官方/);
  for(const id of ['piano-toggle','music-toggle','desk-audio','about-open','services-open','terminal-open'])assert.ok(entry.includes(`id="${id}"`));
});
test('entry preserves other destinations and uses only its original local audio',()=>{
  const entry=read('src/entry/landing.html'),script=read('public/js/landing.js');
  for(const href of ['https://github.com/youzenghe/','pages/about.html','pages/projects.html','rss.xml','services/index.html','https://yzh1019.top/games/chat.html'])assert.ok(entry.includes(`href="${href}"`));
  assert.match(entry,/data-src="assets\/audio\/bg\.mp3"/);
  assert.doesNotMatch(script,/music\.163\.com|TRUTH_MUSIC_URL/);
  assert.doesNotMatch(entry,/<iframe/);
  const bytes=fs.readFileSync(new URL('public/assets/audio/bg.mp3',root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'4dfccecd3fa6e895f717e04ead1647c3a7bf02ff0b786956955cea324637b113');
});
test('old local entry URLs remain available and lead to the current blog pages',()=>{
  for(const [file,target]of [['blog','/blog/'],['posts','/archive/'],['about','/about-me/'],['projects','/archive/?category=%E9%A1%B9%E7%9B%AE']]){
    const html=read(`public/pages/${file}.html`);
    assert.ok(html.includes(target),file);
    assert.match(html,/location\.replace/);
  }
  assert.ok(read('public/services/index.html').includes('RESOURCE_GROUPS'));
  assert.ok(read('public/games/chat.html').includes("apiKey: ''"));
});
test('public origin is prepared without inheriting the reference author domain',()=>{
  assert.equal(siteConfig.siteURL,'https://yzh1019.top/');
  assert.equal(read('public/CNAME').trim(),'yzh1019.top');
});
test('blog shell navigation and home layout use the shared blog entry path',()=>{
  for(const file of ['src/constants/link-presets.ts','src/components/control/BackToHome.astro','src/components/features/posts/CategoryBar.astro','src/scripts/core/swup-hooks.ts','src/layouts/MainGridLayout.astro','src/components/organisms/navigation/Navbar.astro','src/layouts/partials/GridScripts.astro'])assert.match(read(file),/BLOG_HOME_PATH/,file);
});
test('blog pagination links do not return to the standalone paper homepage',()=>{
  const source=read('src/components/control/Pagination.astro');
  assert.match(source,/return BLOG_HOME_PATH/);
  assert.match(source,/BLOG_HOME_PATH.*\$\{p\}/);
});
