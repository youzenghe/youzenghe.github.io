import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {chooseMusicPanelPosition, overlapArea, shouldCloseMusicPanelOnEscape} from '../src/utils/music-panel-placement.ts';

const viewport = {width:1440,height:900};
const panel = {width:320,height:260};
const anchor = {left:1370,top:700,width:48,height:48};
test('a music panel selects unoccupied space near its entry', () => {
  const result = chooseMusicPanelPosition(viewport,panel,[],anchor);
  assert.equal(result.compact,false);
  assert.ok(result.left >= 16 && result.top >= 16);
  assert.ok(result.left+panel.width <= viewport.width-16);
  assert.ok(result.top+panel.height <= viewport.height-16);
});
test('overlapping content frosts an entry-anchored panel instead of moving it left', () => {
  const cards = [{left:1020,top:0,width:420,height:900}];
  const result = chooseMusicPanelPosition(viewport,panel,cards,anchor);
  assert.equal(result.compact,true);
  assert.equal(result.frosted,true);
  assert.equal(result.left+result.width,anchor.left+anchor.width);
  assert.ok(result.left>=1000);
});
test('a filled or narrow viewport uses a bounded compact fallback', () => {
  const small={width:375,height:600};
  const result=chooseMusicPanelPosition(small,panel,[{left:0,top:0,width:375,height:600}],anchor);
  assert.equal(result.compact,true);
  assert.ok(result.left>=16 && result.left+320<=small.width-16);
  assert.ok(result.top>=16 && result.top+156<=small.height-16);
});
test('a compact panel never covers reserved navigation or floating controls', () => {
  const small={width:375,height:600};
  const navbar={left:0,top:0,width:375,height:80};
  const result=chooseMusicPanelPosition(small,panel,[navbar,{left:0,top:88,width:375,height:512}],anchor,[navbar]);
  assert.equal(overlapArea({...result,width:320,height:156},navbar),0);
});
test('Escape closes only the focused music control and does not consume handled events', () => {
  assert.equal(shouldCloseMusicPanelOnEscape({key:'Escape',defaultPrevented:false},true),true);
  assert.equal(shouldCloseMusicPanelOnEscape({key:'Escape',defaultPrevented:true},true),false);
  assert.equal(shouldCloseMusicPanelOnEscape({key:'Escape',defaultPrevented:false},false),false);
  assert.equal(shouldCloseMusicPanelOnEscape({key:'Enter',defaultPrevented:false},true),false);
});
test('short viewports shrink the compact shell instead of covering reserved controls', () => {
  const small={width:375,height:300};
  const reserved=[{left:0,top:0,width:375,height:80},{left:312,top:128,width:48,height:108}];
  const result=chooseMusicPanelPosition(small,{width:320,height:332},[],{left:312,top:188,width:48,height:48},reserved);
  assert.equal(result.canPlace,true);
  for (const rect of reserved) assert.equal(overlapArea(result,rect),0);
});
test('a viewport occupied entirely by reserved controls refuses an unsafe placement', () => {
  const small={width:375,height:90};
  const result=chooseMusicPanelPosition(small,panel,[],anchor,[{left:0,top:0,width:375,height:90}]);
  assert.equal(result.canPlace,false);
});
test('the full music panel also obeys the chosen rectangle with internal scrolling', () => {
  const source=fs.readFileSync(new URL('../src/components/widgets/music-player/FabMusicPanel.svelte',import.meta.url),'utf8');
  const base=source.match(/\.fab-music-panel\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.match(base,/max-height:[^;]+--music-panel-height/);
  assert.match(base,/overflow-y:\s*auto/);
});
test('only an overlapping music panel uses a translucent backdrop',()=>{
  const clear=chooseMusicPanelPosition(viewport,panel,[],anchor);
  assert.equal(clear.frosted,false);
  const source=fs.readFileSync(new URL('../src/components/widgets/music-player/FabMusicPanel.svelte',import.meta.url),'utf8');
  assert.match(source,/class:frosted/);
  assert.match(source,/\.fab-music-panel\.frosted\s*\{[^}]*background:\s*color-mix/);
});
test('the animated shell does not isolate its child backdrop using opacity will-change',()=>{
  const source=fs.readFileSync(new URL('../src/components/widgets/music-player/MusicPlayer.svelte',import.meta.url),'utf8');
  const shell=source.match(/\.music-player-fab-shell\s*\{([^}]+)\}/)?.[1] ?? '';
  assert.doesNotMatch(shell,/will-change:[^;]*opacity/);
});
test('overlapping controls are subdued at rest and clear on hover or keyboard focus',()=>{
  const source=fs.readFileSync(new URL('../src/components/widgets/music-player/FabMusicPanel.svelte',import.meta.url),'utf8');
  assert.match(source,/--music-overlay-tint:\s*18%/);
  assert.match(source,/--music-overlay-blur:\s*2px/);
  assert.match(source,/\.frosted:focus-within/);
  assert.match(source,/\.frosted:hover/);
  assert.match(source,/@media\s*\(hover:\s*none\)/);
  assert.doesNotMatch(source,/\.fab-music-panel\.frosted\s*\{[^}]*opacity:/);
});
