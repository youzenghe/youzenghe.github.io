import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {siteConfig} from '../src/config/siteConfig.ts';
import {profileConfig} from '../src/config/profileConfig.ts';
import {sidebarLayoutConfig} from '../src/config/sidebarConfig.ts';

test('site branding and typewriter copy belong to the current site',()=>{
  assert.equal(siteConfig.title,'次元日记');
  assert.equal(siteConfig.navbarTitle?.text,'次元日记');
  assert.equal(siteConfig.navbarTitle?.icon,'');
  assert.equal(profileConfig.bio,'天天开心，亲爱的陌生人');
  assert.equal(profileConfig.typewriter?.enable,true);
});
test('home banner uses the site name and only the requested greeting',()=>{
  assert.equal(siteConfig.banner.homeText?.title,siteConfig.title);
  assert.deepEqual(siteConfig.banner.homeText?.subtitle,['天天开心，亲爱的陌生人']);
  assert.equal(siteConfig.banner.homeText?.typewriter?.enable,true);
  assert.equal(siteConfig.subtitle,'天天开心，亲爱的陌生人');
  assert.equal(profileConfig.bio,siteConfig.subtitle);
});
test('only the left article TOC is enabled without right or floating TOC entries',()=>{
  assert.equal(siteConfig.toc.enable,true);
  assert.equal(siteConfig.toc.desktopSidebar,false);
  assert.equal(siteConfig.toc.floating,false);
  assert.equal(siteConfig.toc.mobileTop,false);
  assert.ok(sidebarLayoutConfig.components?.left?.includes('card-toc'));
  assert.ok(!sidebarLayoutConfig.components?.right?.some(type=>type.includes('toc')));
});
test('text navbar title does not render an empty icon image',()=>{
  const source=fs.readFileSync(new URL('../src/components/organisms/navigation/Navbar.astro',import.meta.url),'utf8');
  assert.match(source,/iconSrc\s*&&/);
});
test('a text-only brand remains readable on mobile instead of an empty home link',()=>{
  const css=fs.readFileSync(new URL('../src/styles/mobile-navbar.css',import.meta.url),'utf8');
  const navbar=fs.readFileSync(new URL('../src/components/organisms/navigation/Navbar.astro',import.meta.url),'utf8');
  assert.match(navbar,/data-text-only=/);
  assert.match(css,/\.navbar-brand:not\(\[data-text-only="true"\]\) span/);
});
test('client-only header controls reserve their dimensions before hydration',()=>{
  const source=fs.readFileSync(new URL('../src/components/organisms/navigation/Navbar.astro',import.meta.url),'utf8');
  assert.match(source,/<div id="search-container" class="w-11 h-11 shrink-0">/);
  assert.match(source,/<div class="navbar-theme-slot w-11 h-11 shrink-0">\s*<ThemeSwitch/);
});
