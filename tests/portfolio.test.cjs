const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');

function open(hash = '', storageBlocked = false, reduceMotion = false) {
  const html = fs.existsSync(path.join(root, 'index.html')) ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : '<html><body></body></html>';
  const dom = new JSDOM(html, { url: `https://portfolio.test/${hash}`, runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.matchMedia = query => ({ matches: query.includes('reduced-motion') && reduceMotion });
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollTo = () => {};
  if (storageBlocked) Object.defineProperty(dom.window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  const script = path.join(root, 'scripts.js');
  if (fs.existsSync(script)) dom.window.eval(fs.readFileSync(script, 'utf8'));
  return dom;
}

test('unknown section opens About; direct links open their named destination', () => {
  for (const [hash, expected] of [['#unknown', 'about'], ['#awards', 'awards'], ['#projects', 'projects']]) {
    const dom = open(hash);
    assert.equal(dom.window.document.querySelector('[data-section]:not([hidden])')?.id, expected);
    dom.window.close();
  }
});

test('menu navigation opens Awards and Escape closes the menu', () => {
  const dom = open();
  const d = dom.window.document;
  const menu = d.querySelector('#menu-toggle');
  assert.ok(menu, 'Hamburger menu must exist');
  menu.click();
  assert.equal(menu.getAttribute('aria-expanded'), 'true');
  d.querySelector('#site-menu a[href="#awards"]').click();
  assert.equal(d.querySelector('[data-section]:not([hidden])').id, 'awards');
  assert.equal(menu.getAttribute('aria-expanded'), 'false');
  menu.click();
  d.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(menu.getAttribute('aria-expanded'), 'false');
  dom.window.close();
});

test('theme switch persists and works when browser storage is blocked', () => {
  for (const blocked of [false, true]) {
    const dom = open('', blocked);
    const d = dom.window.document;
    assert.ok(d.querySelector('#theme-toggle'), 'Theme switch must exist');
    d.querySelector('#theme-toggle').click();
    assert.equal(d.documentElement.dataset.theme, 'dark');
    if (!blocked) assert.equal(dom.window.localStorage.getItem('portfolio-theme'), 'dark');
    d.querySelector('#theme-toggle').click();
    assert.equal(d.documentElement.dataset.theme, 'light');
    dom.window.close();
  }
});

test('rapid section changes end on the last requested section', () => {
  const dom = open();
  const d = dom.window.document;
  assert.ok(d.querySelector('#site-menu'), 'Navigation must exist');
  for (const section of ['projects', 'awards', 'leadership', 'about']) d.querySelector(`#site-menu a[href="#${section}"]`).click();
  assert.equal(d.querySelectorAll('[data-section]:not([hidden])').length, 1);
  assert.equal(d.querySelector('[data-section]:not([hidden])').id, 'about');
  dom.window.close();
});

test('Skip to content preserves the current section and focuses its content', async () => {
  const dom = open('#projects');
  const d = dom.window.document;
  d.querySelector('.skip-link').click();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(d.querySelector('[data-section]:not([hidden])').id, 'projects');
  assert.equal(d.activeElement.id, 'main-content');
  dom.window.close();
});

test('selecting a gallery item updates its text panel and selected tab', () => {
  const dom = open();
  const d = dom.window.document;
  const awards = d.querySelector('[data-gallery-section="awards"]');
  assert.ok(awards, 'Reference-style selectable gallery must exist');
  awards.click();
  assert.equal(d.querySelector('[data-section]:not([hidden])').id, 'awards');
  assert.equal(awards.getAttribute('aria-selected'), 'true');
  assert.equal(d.querySelectorAll('[data-gallery-section][aria-selected="true"]').length, 1);
  assert.equal(dom.window.location.hash, '#awards');
  dom.window.close();
});

test('gallery arrow keys select adjacent sections and preserve keyboard focus', () => {
  const dom = open();
  const d = dom.window.document;
  const about = d.querySelector('[data-gallery-section="about"]');
  assert.ok(about, 'About gallery tab must exist');
  about.focus();
  about.dispatchEvent(new dom.window.KeyboardEvent('keydown', {key:'ArrowRight',bubbles:true}));
  assert.equal(d.querySelector('[data-section]:not([hidden])').id, 'projects');
  assert.equal(d.activeElement.dataset.gallerySection, 'projects');
  dom.window.close();
});

test('wheel settling preserves an open menu and its visible focus', async () => {
  const dom = open();
  const d = dom.window.document;
  const gallery = d.querySelector('#gallery');
  [...d.querySelectorAll('[data-gallery-section]')].forEach(card => Object.defineProperty(card,'offsetWidth',{value:240}));
  gallery.dispatchEvent(new dom.window.WheelEvent('wheel',{deltaY:296,cancelable:true}));
  d.querySelector('#menu-toggle').click();
  await new Promise(resolve => setTimeout(resolve,180));
  assert.equal(d.querySelector('[data-section]:not([hidden])').id,'projects');
  assert.equal(d.querySelector('#site-menu').hidden,false);
  assert.equal(d.querySelector('#menu-toggle').getAttribute('aria-expanded'),'true');
  assert.ok(d.querySelector('#site-menu').contains(d.activeElement));
  dom.window.close();
});

test('gallery counter follows the visual order used by Home and arrow keys', () => {
  const dom = open();
  const d = dom.window.document;
  d.querySelector('#gallery-about').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
  assert.equal(d.querySelector('#gallery-position').textContent,'01 / 08');
  d.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(d.querySelector('#gallery-position').textContent,'02 / 08');
  dom.window.close();
});

test('opening the menu focuses its current section', () => {
  const dom = open('#awards');
  const d = dom.window.document;
  d.querySelector('#menu-toggle').click();
  assert.equal(d.activeElement.hash,'#awards');
  dom.window.close();
});

test('the first and last cards stay adjacent on both sides of the circular carousel', () => {
  for (const [section,left,right] of [['stack','checklist','about'],['checklist','contact','stack']]) {
    const dom = open(`#${section}`,false,true);
    const d = dom.window.document;
    const x = id => Number.parseFloat(d.querySelector(`#gallery-${id}`).closest('.gallery-card').style.getPropertyValue('--carousel-x'));
    assert.ok(Math.abs(x(section)) < 0.01,'Selected card must be centered');
    assert.ok(x(left) < 0,'Previous card must remain visible to the left across the loop');
    assert.ok(x(right) > 0,'Next card must remain visible to the right across the loop');
    d.querySelector('#gallery-next').click();
    assert.equal(d.querySelector('[data-section]:not([hidden])').id,right);
    assert.ok(Math.abs(x(right)) < 0.01,'Forward wrap centers the next card');
    d.querySelector('#gallery-prev').click();
    assert.equal(d.querySelector('[data-section]:not([hidden])').id,section);
    dom.window.close();
  }
});

test('carousel movement eases through frames and settles on the requested card', () => {
  const dom = open();
  const d = dom.window.document;
  const frames = [];
  dom.window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  const x = () => Number.parseFloat(d.querySelector('#gallery-projects').style.getPropertyValue('--carousel-x'));
  const initial = x();
  d.querySelector('#gallery-next').click();
  assert.ok(frames.length > 0,'Navigation must animate instead of jumping');
  frames.shift()(0);
  frames.shift()(16.67);
  assert.ok(x() > 0 && x() < initial,'Card must move toward the center over multiple frames');
  for (let time=33.34; frames.length && time<4000; time+=16.67) frames.shift()(time);
  assert.ok(Math.abs(x()) < 0.1,'Animation must finish exactly at the center');
  assert.equal(d.querySelector('[data-section]:not([hidden])').id,'projects');
  dom.window.close();
});

test('pointer taps and vertical gestures do not leave the carousel between cards', async () => {
  for (const vertical of [false,true]) {
    const dom = open('',false,true);
    const d = dom.window.document;
    const gallery = d.querySelector('#gallery');
    [...d.querySelectorAll('[data-gallery-section]')].forEach(card => Object.defineProperty(card,'offsetWidth',{value:240}));
    gallery.dispatchEvent(new dom.window.WheelEvent('wheel',{deltaY:148,cancelable:true}));
    gallery.dispatchEvent(new dom.window.MouseEvent('pointerdown',{button:0,clientX:100,clientY:100}));
    if (vertical) gallery.dispatchEvent(new dom.window.MouseEvent('pointermove',{button:0,clientX:100,clientY:150}));
    gallery.dispatchEvent(new dom.window.MouseEvent('pointerup',{button:0,clientX:100,clientY:100}));
    await new Promise(resolve => setTimeout(resolve,180));
    assert.ok(Math.abs(Number.parseFloat(d.querySelector('#gallery-projects').style.getPropertyValue('--carousel-x'))) < 0.01);
    dom.window.close();
  }
});

test('Home keeps keyboard focus on its destination while distant cards rotate in', () => {
  const dom = open('#awards');
  const d = dom.window.document;
  const nativeFocus = dom.window.HTMLElement.prototype.focus;
  // JSDOM does not enforce browser focus restrictions for visibility:hidden.
  dom.window.HTMLElement.prototype.focus = function(options) {
    if (dom.window.getComputedStyle(this).visibility !== 'hidden') nativeFocus.call(this,options);
  };
  d.querySelector('#gallery-awards').focus();
  d.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
  assert.equal(d.activeElement.id,'gallery-stack');
  dom.window.close();
});

test('starting a drag during an animation does not restore an old position', () => {
  const dom = open();
  const d = dom.window.document;
  const frames = [];
  dom.window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  const gallery = d.querySelector('#gallery');
  gallery.setPointerCapture = () => {};
  d.querySelector('#gallery-next').click();
  let time=0;
  for (let i=0;i<3;i++,time+=16.67) frames.shift()(time);
  gallery.dispatchEvent(new dom.window.MouseEvent('pointerdown',{button:0,clientX:200,clientY:100}));
  for (;frames.length && time<2000;time+=16.67) frames.shift()(time);
  const x = () => Number.parseFloat(d.querySelector('#gallery-projects').style.getPropertyValue('--carousel-x'));
  const before = x();
  gallery.dispatchEvent(new dom.window.MouseEvent('pointermove',{button:0,clientX:190,clientY:100}));
  assert.ok(Math.abs(x()-before)<30,'A small drag must not jump hundreds of pixels backward');
  dom.window.close();
});

test('the About photo exposes all four actual social profiles outside the gallery button', () => {
  const dom = open();
  const d = dom.window.document;
  const overlay = d.querySelector('#about-photo-overlay');
  assert.ok(overlay,'The About photo must have a caption and contact overlay');
  const profiles = {
    GitHub:'https://github.com/jjomoc',
    LinkedIn:'https://www.linkedin.com/in/justine-jomoc/',
    Facebook:'https://www.facebook.com/justine.jomoc.21',
    Instagram:'https://www.instagram.com/jstn_jj?cplk=NjJsMTI4ZWR6ejBr'
  };
  for(const [name,url] of Object.entries(profiles)) {
    const link=overlay.querySelector(`a[aria-label="${name}"]`);
    assert.equal(link?.href,url);
    assert.equal(link.closest('button'),null,'Social links must not be nested in a tab button');
    assert.equal(link.rel,'noopener noreferrer');
  }
  assert.equal(d.querySelectorAll('[role="tab"]').length,8);
  dom.window.close();
});

test('touch activation reveals the portrait caption and tapping its background dismisses it', () => {
  const dom=open();
  const d=dom.window.document;
  const portrait=d.querySelector('#about-portrait');
  assert.ok(portrait,'The About tab and its overlay need a shared visual wrapper');
  const tap=new dom.window.MouseEvent('click',{bubbles:true});
  Object.defineProperty(tap,'pointerType',{value:'touch'});
  d.querySelector('#gallery-about').dispatchEvent(tap);
  assert.equal(portrait.classList.contains('is-open'),true);
  const dismiss=new dom.window.MouseEvent('click',{bubbles:true});
  Object.defineProperty(dismiss,'pointerType',{value:'touch'});
  d.querySelector('#about-photo-overlay').dispatchEvent(dismiss);
  assert.equal(portrait.classList.contains('is-open'),false);
  assert.equal(d.activeElement.id,'main-content');
  dom.window.close();
});

test('interacting with portrait contact controls does not start a carousel drag', () => {
  const dom=open('',false,true);
  const d=dom.window.document;
  const link=d.querySelector('#about-photo-overlay a');
  assert.ok(link,'Portrait contact controls must exist');
  const gallery=d.querySelector('#gallery');
  let captured=false;
  gallery.setPointerCapture=()=>{captured=true;};
  link.dispatchEvent(new dom.window.MouseEvent('pointerdown',{button:0,clientX:100,clientY:100,bubbles:true}));
  link.dispatchEvent(new dom.window.MouseEvent('pointermove',{button:0,clientX:20,clientY:100,bubbles:true}));
  assert.equal(captured,false);
  assert.equal(d.querySelector('[aria-selected="true"]').dataset.gallerySection,'about');
  dom.window.close();
});

test('the visible portrait caption background still allows carousel dragging', () => {
  const dom=open('',false,true);
  const d=dom.window.document;
  const overlay=d.querySelector('#about-photo-overlay');
  const gallery=d.querySelector('#gallery');
  let captured=false;
  gallery.setPointerCapture=()=>{captured=true;};
  overlay.dispatchEvent(new dom.window.MouseEvent('pointerdown',{button:0,clientX:100,clientY:100,bubbles:true}));
  overlay.dispatchEvent(new dom.window.MouseEvent('pointermove',{button:0,clientX:20,clientY:100,bubbles:true}));
  assert.equal(captured,true,'Only actual contact controls should block carousel dragging');
  dom.window.close();
});

test('particle background sends the supplied configuration to the gallery layer and respects reduced motion', async () => {
  const config=JSON.parse(fs.readFileSync(path.join(root,'particlesjs-config.json'),'utf8'));
  for(const reduceMotion of [false,true]) {
    const dom=open('',false,reduceMotion);
    const d=dom.window.document;
    const host=d.querySelector('#gallery-particles');
    assert.ok(host?.closest('.gallery-stage'),'Particles must be inside the gallery background');
    assert.equal(host.getAttribute('aria-hidden'),'true');
    let received;
    dom.window.fetch=async()=>({ok:true,json:async()=>structuredClone(config)});
    dom.window.particlesJS=(id,settings)=>{received={id,settings};};
    const file=path.join(root,'gallery-particles.js');
    if(fs.existsSync(file)) await dom.window.eval(fs.readFileSync(file,'utf8'));
    assert.equal(received?.id,'gallery-particles');
    assert.equal(received.settings.particles.color.value,'#ed96d7');
    assert.equal(received.settings.particles.shape.polygon.nb_sides,6);
    assert.equal(received.settings.particles.move.enable,!reduceMotion);
    assert.equal(received.settings.particles.size.anim.enable,!reduceMotion);
    assert.equal(config.particles.move.enable,true,'Original configuration must remain unchanged');
    dom.window.close();
  }
});

test('a particle configuration load failure leaves carousel navigation working', async () => {
  const dom=open();
  const d=dom.window.document;
  assert.ok(d.querySelector('#gallery-particles'));
  dom.window.fetch=async()=>{throw new Error('Offline');};
  dom.window.particlesJS=()=>{throw new Error('Should not initialize without configuration');};
  const file=path.join(root,'gallery-particles.js');
  if(fs.existsSync(file)) await dom.window.eval(fs.readFileSync(file,'utf8'));
  d.querySelector('#gallery-next').click();
  assert.equal(d.querySelector('[aria-selected="true"]').dataset.gallerySection,'projects');
  dom.window.close();
});

test('enabling motion after a static start keeps real particle radii finite', async () => {
  const dom=open('',false,true);
  const w=dom.window;
  // JSDOM lacks canvas drawing and layout; retain the real vendor's particle math.
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({}, {get:(object,key)=>object[key]??(()=>{})});
  Object.defineProperty(w.HTMLCanvasElement.prototype,'offsetWidth',{get:()=>800});
  Object.defineProperty(w.HTMLCanvasElement.prototype,'offsetHeight',{get:()=>600});
  w.requestAnimationFrame=()=>1;
  w.cancelAnimationFrame=()=>{};
  let changeMotion;
  const motion={matches:true,addEventListener:(event,callback)=>{changeMotion=callback;}};
  w.matchMedia=()=>motion;
  const config=JSON.parse(fs.readFileSync(path.join(root,'particlesjs-config.json'),'utf8'));
  w.fetch=async()=>({ok:true,json:async()=>structuredClone(config)});
  w.eval(fs.readFileSync(path.join(root,'vendor/particles.js'),'utf8'));
  await w.eval(fs.readFileSync(path.join(root,'gallery-particles.js'),'utf8'));
  const engine=w.pJSDom[0].pJS;
  assert.ok(engine.particles.array.length>0,'The actual particle engine must create particles');
  motion.matches=false;
  changeMotion();
  assert.ok(engine.particles.array.every(p=>Number.isFinite(p.radius)),'Motion changes must not produce NaN radii');
  assert.equal(w.document.querySelectorAll('#gallery-particles canvas').length,1);
  dom.window.close();
});

test('opening index.html directly initializes particles without fetching a local JSON file', async () => {
  const dom=open();
  dom.reconfigure({url:'file:///C:/jj/portfolio/index.html#about'});
  const config=JSON.parse(fs.readFileSync(path.join(root,'particlesjs-config.json'),'utf8'));
  dom.window.portfolioParticleConfig=structuredClone(config);
  let fetches=0,received;
  dom.window.fetch=async()=>{fetches++;throw new Error('Local file fetch blocked');};
  dom.window.particlesJS=(id,settings)=>{received={id,settings};};
  await dom.window.eval(fs.readFileSync(path.join(root,'gallery-particles.js'),'utf8'));
  assert.equal(fetches,0,'Direct file pages must not depend on fetch');
  assert.equal(received?.id,'gallery-particles');
  assert.equal(received.settings.particles.color.value,'#ed96d7');
  assert.equal(dom.window.document.querySelector('#gallery-particles').dataset.state,'ready');
  dom.window.close();
});

test('bundled particle settings keep the background available when HTTP JSON loading fails', async () => {
  const dom=open();
  dom.window.portfolioParticleConfig=JSON.parse(fs.readFileSync(path.join(root,'particlesjs-config.json'),'utf8'));
  dom.window.fetch=async()=>{throw new Error('Offline');};
  let initialized=false;
  dom.window.particlesJS=()=>{initialized=true;};
  await dom.window.eval(fs.readFileSync(path.join(root,'gallery-particles.js'),'utf8'));
  assert.equal(initialized,true);
  dom.window.close();
});
