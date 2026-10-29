(() => {
  const root = document.documentElement;
  const sections = [...document.querySelectorAll('[data-section]')];
  const gallery = document.querySelector('#gallery');
  const cards = [...document.querySelectorAll('[data-gallery-section]')];
  const menuButton = document.querySelector('#menu-toggle');
  const menu = document.querySelector('#site-menu');
  const backdrop = document.querySelector('#menu-backdrop');
  const themeButton = document.querySelector('#theme-toggle');
  const portrait = document.querySelector('#about-portrait');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeId = 'about';
  let position = 0;
  let targetPosition = 0;
  let velocity = 0;
  let frame = null;
  let lastFrameTime = null;
  let settleTimer;
  let pointer = null;
  let ignoreClicksUntil = 0;
  let cardStep = 286;

  const wrap = value => ((value % cards.length) + cards.length) % cards.length;
  const circularDistance = value => wrap(value + cards.length / 2) - cards.length / 2;

  function measureCarousel() {
    const gap = Number.parseFloat(getComputedStyle(gallery).columnGap);
    cardStep = (cards[0].offsetWidth || 230) + (Number.isFinite(gap) ? gap : 56);
  }

  function renderCarousel() {
    const radius = cardStep / Math.sin(0.48);
    cards.forEach((card, index) => {
      const visual = card.closest('.gallery-card');
      const distance = circularDistance(index - position);
      const depth = Math.abs(distance);
      const angle = distance * 0.48;
      const visibility = Math.max(0, Math.min(1, 2.5 - depth));
      visual.style.setProperty('--carousel-x', `${Math.sin(angle) * radius}px`);
      visual.style.setProperty('--carousel-y', `${Math.min(depth, 3) ** 2 * 5}px`);
      visual.style.setProperty('--carousel-z', `${(Math.cos(angle) - 1) * radius * 0.25}px`);
      visual.style.setProperty('--carousel-angle', `${-distance * 16}deg`);
      visual.style.setProperty('--carousel-scale', 1 - Math.min(depth, 3) * 0.1);
      visual.style.setProperty('--carousel-opacity', (1 - Math.min(depth, 1.5) * 0.35) * visibility);
      visual.style.setProperty('--carousel-saturation', 1 - Math.min(depth, 2) * 0.2);
      visual.style.zIndex = String(Math.round(100 - depth * 10));
      visual.style.pointerEvents = depth >= 2.5 ? 'none' : 'auto';
    });
  }

  function animateCarousel(time) {
    const dt = lastFrameTime === null ? 1 / 60 : Math.min((time - lastFrameTime) / 1000, 1 / 30);
    lastFrameTime = time;
    velocity += ((targetPosition - position) * 120 - velocity * 22) * dt;
    position += velocity * dt;
    if (Math.abs(targetPosition - position) < 0.0005 && Math.abs(velocity) < 0.005) {
      position = targetPosition;
      velocity = 0;
      frame = null;
      lastFrameTime = null;
      renderCarousel();
      return;
    }
    renderCarousel();
    frame = requestAnimationFrame(animateCarousel);
  }

  function moveCarousel(animate) {
    if (!animate || reducedMotion.matches) {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastFrameTime = null;
      velocity = 0;
      position = targetPosition;
      renderCarousel();
    } else if (frame === null) {
      lastFrameTime = null;
      frame = requestAnimationFrame(animateCarousel);
    }
  }

  function setMenu(open, restoreFocus = false) {
    menu.hidden = !open;
    backdrop.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    if (open) (menu.querySelector('[aria-current="page"]') || menu.querySelector('a')).focus();
    else if (restoreFocus) menuButton.focus();
  }
  function centerCard(card, animate) {
    if (!card) return;
    clearTimeout(settleTimer);
    measureCarousel();
    targetPosition += circularDistance(cards.indexOf(card) - targetPosition);
    moveCarousel(animate);
  }
  function showSection(id, navigate = false, source = 'menu') {
    const target = sections.find(section => section.id === id) || sections.find(section => section.id === 'about');
    const changed = target.id !== activeId;
    activeId = target.id;
    sections.forEach(section => { section.hidden = section !== target; section.classList.remove('panel-enter'); });
    if (changed && navigate && !reducedMotion.matches) { void target.offsetWidth; target.classList.add('panel-enter'); }
    cards.forEach(card => { const selected = card.dataset.gallerySection === activeId; card.setAttribute('aria-selected', String(selected)); card.tabIndex = selected ? 0 : -1; card.closest('.gallery-card').dataset.active = String(selected); });
    if (activeId !== 'about') {
      portrait.classList.remove('is-open','is-dismissed');
      if (portrait.contains(document.activeElement)) document.querySelector('#main-content').focus({preventScroll:true});
    }
    document.querySelector('#current-section-label').textContent = target.dataset.label;
    menu.querySelectorAll('a').forEach(link => { if (link.hash === `#${activeId}`) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    document.querySelector('#gallery-position').textContent = `${String(cards.findIndex(card => card.dataset.gallerySection === activeId) + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    document.title = `Justine Jomoc — ${target.dataset.label}`;
    const manualInput = source === 'wheel' || source === 'drag';
    if (!manualInput) centerCard(cards.find(card => card.dataset.gallerySection === activeId), navigate);
    if (!manualInput) setMenu(false);
    if (changed) document.querySelector('#main-content').scrollTop = 0;
    if (navigate && source === 'menu') { document.querySelector('#main-content').focus({ preventScroll: true }); if (window.innerWidth <= 900) window.scrollTo({top:0, behavior:'instant'}); }
  }
  function navigateTo(id, source = 'menu') {
    const valid = sections.some(section => section.id === id) ? id : 'about';
    if (location.hash !== `#${valid}`) history.pushState(null, '', `#${valid}`);
    showSection(valid, true, source);
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    if (link.hash === '#main-content') { link.addEventListener('click', event => { event.preventDefault(); const main = document.querySelector('#main-content'); main.focus({preventScroll:true}); main.scrollIntoView?.({block:'start',behavior:'instant'}); }); return; }
    if (sections.some(section => `#${section.id}` === link.hash)) link.addEventListener('click', event => { event.preventDefault(); navigateTo(link.hash.slice(1)); });
  });
  cards.forEach((card, index) => {
    const panel = sections.find(section => section.id === card.dataset.gallerySection);
    card.setAttribute('aria-label', panel.id === 'about' ? 'About Justine Jomoc' : panel.dataset.label);
    card.addEventListener('click', event => {
      if (performance.now() < ignoreClicksUntil) return;
      navigateTo(card.dataset.gallerySection, 'gallery');
      if (card.dataset.gallerySection === 'about' && (event.pointerType === 'touch' || matchMedia('(hover: none)').matches)) {
        portrait.classList.remove('is-dismissed');
        portrait.classList.add('is-open');
      }
    });
    card.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % cards.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + cards.length) % cards.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = cards.length - 1;
      if (next === undefined) return;
      event.preventDefault(); navigateTo(cards[next].dataset.gallerySection, 'gallery'); cards[next].focus({preventScroll:true});
    });
  });
  function stepGallery(direction) { const index = cards.findIndex(card => card.dataset.gallerySection === activeId); navigateTo(cards[(index + direction + cards.length) % cards.length].dataset.gallerySection, 'gallery'); }
  document.querySelector('#gallery-prev').addEventListener('click', () => stepGallery(-1));
  document.querySelector('#gallery-next').addEventListener('click', () => stepGallery(1));
  function manualTarget(next, source) {
    targetPosition = next;
    const id = cards[wrap(Math.round(next))].dataset.gallerySection;
    if (id !== activeId) {
      history.replaceState(null, '', `#${id}`);
      showSection(id, true, source);
    }
    moveCarousel(source !== 'drag');
  }

  function settleCarousel() {
    manualTarget(Math.round(targetPosition), 'wheel');
  }

  gallery.addEventListener('wheel', event => {
    if (event.ctrlKey) return;
    measureCarousel();
    const input = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const delta = input * (event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? gallery.clientWidth : 1);
    event.preventDefault();
    manualTarget(targetPosition + delta / cardStep, 'wheel');
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settleCarousel, 140);
  }, {passive:false});

  gallery.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('[data-carousel-interactive] a, [data-carousel-interactive] button')) return;
    measureCarousel();
    pointer = {id:event.pointerId, x:event.clientX, y:event.clientY, position, lastX:event.clientX, time:event.timeStamp, speed:0, dragging:false};
  });
  gallery.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.dragging) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 7) return;
      if (Math.abs(dy) > Math.abs(dx)) { pointer = null; return; }
      clearTimeout(settleTimer);
      pointer.position = position;
      pointer.dragging = true;
      gallery.setPointerCapture(event.pointerId);
    }
    const elapsed = event.timeStamp - pointer.time;
    if (elapsed > 0) pointer.speed = (event.clientX - pointer.lastX) / elapsed;
    pointer.lastX = event.clientX;
    pointer.time = event.timeStamp;
    manualTarget(pointer.position - dx / cardStep, 'drag');
  });
  function finishDrag(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const drag = pointer;
    pointer = null;
    if (!drag.dragging) { settleCarousel(); return; }
    ignoreClicksUntil = performance.now() + 250;
    if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    const recent = event.timeStamp - drag.time < 100;
    const momentum = event.type === 'pointercancel' || !recent ? 0 : Math.max(-2, Math.min(2, -drag.speed * 140 / cardStep));
    manualTarget(Math.round(targetPosition + momentum), 'wheel');
  }
  gallery.addEventListener('pointerup', finishDrag);
  gallery.addEventListener('pointercancel', finishDrag);
  gallery.addEventListener('pointerleave', () => { if (pointer && !pointer.dragging) pointer = null; });
  gallery.addEventListener('dragstart', event => event.preventDefault());
  window.addEventListener('resize', () => centerCard(cards.find(card => card.dataset.gallerySection === activeId), false));
  window.addEventListener('popstate', () => showSection(location.hash.slice(1), true, 'history'));
  window.addEventListener('hashchange', () => showSection(location.hash.slice(1), true, 'history'));
  menuButton.addEventListener('click', () => setMenu(menu.hidden));
  document.querySelector('#menu-close').addEventListener('click', () => setMenu(false, true));
  backdrop.addEventListener('click', () => setMenu(false, true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.hidden && (portrait.classList.contains('is-open') || portrait.contains(document.activeElement))) {
      event.preventDefault(); closePortrait(); return;
    }
    if (menu.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
    if (event.key === 'Tab') { const controls = [...menu.querySelectorAll('button,a')], first = controls[0], last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
  });
  function applyTheme(theme) { root.dataset.theme = theme; themeButton.setAttribute('aria-pressed', String(theme === 'dark')); const next = theme === 'dark' ? 'light' : 'dark'; themeButton.setAttribute('aria-label', `Switch to ${next} mode`); document.querySelector('#theme-label').textContent = `${next[0].toUpperCase() + next.slice(1)} mode`; }
  let saved;
  try { saved = localStorage.getItem('portfolio-theme'); } catch {}
  applyTheme(['light','dark'].includes(saved) ? saved : 'light');
  themeButton.addEventListener('click', () => { const next = root.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(next); try { localStorage.setItem('portfolio-theme',next); } catch {} });
  function closePortrait() {
    portrait.classList.remove('is-open');
    portrait.classList.add('is-dismissed');
    document.querySelector('#main-content').focus({preventScroll:true});
  }
  document.querySelector('#about-photo-overlay').addEventListener('click',event=>{
    if (event.target.closest('a') || performance.now() < ignoreClicksUntil) return;
    if (event.pointerType === 'touch' || matchMedia('(hover: none)').matches) closePortrait();
  });
  portrait.addEventListener('pointerleave',()=>portrait.classList.remove('is-dismissed'));
  document.querySelector('#gallery-about').addEventListener('focus',()=>portrait.classList.remove('is-dismissed'));

  const socialProfiles = [
    ['GitHub','https://github.com/jjomoc','github'],
    ['LinkedIn','https://www.linkedin.com/in/justine-jomoc/','linkedin'],
    ['Facebook','https://www.facebook.com/justine.jomoc.21','facebook'],
    ['Instagram','https://www.instagram.com/jstn_jj?cplk=NjJsMTI4ZWR6ejBr','instagram']
  ];
  document.querySelectorAll('[data-social-links]').forEach(container=>{
    container.setAttribute('role','group');
    socialProfiles.forEach(([name,url,icon])=>{
      const link=document.createElement('a');
      link.href=url; link.target='_blank'; link.rel='noopener noreferrer'; link.title=name; link.setAttribute('aria-label',name);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
      const use=document.createElementNS('http://www.w3.org/2000/svg','use'); use.setAttribute('href',`#icon-${icon}`);
      svg.append(use); link.append(svg);
      if(container.dataset.socialLinks!=='portrait') { const label=document.createElement('span'); label.textContent=name; link.append(label); }
      container.append(link);
    });
  });
  const requirements = [
    ['About & OJT interests','Fourth-year BSIT; seeking Quality Assurance or IT Support OJT. Personal introduction added.',true],['Social profile links','GitHub, LinkedIn, Facebook, and Instagram added using your supplied URLs.',true],['OJT schedule','Confirm start date, required hours, and availability.'],['Certifications','Verify titles, issuers, earned dates; add new certificates.'],['Course completions','Titles, providers, completion dates, and evidence.'],['IoT project','Description, objectives, components, your role, result, and evidence.'],['Capstone project','Title, objectives, technologies, team, role, status, and evidence.'],['Third-year projects','Selected course outputs and individual contributions.'],['Other achievements','Recognition, scholarships, trainings, or workshops.'],['Competitions & awards','Event, organizer, date, result, submitted work, and evidence.'],['Leadership','Organization, position, academic year, contributions, and documents.'],['Tech stack','Confirm your current tools and specific Cisco skills.'],['Final review','Proofread, check evidence, and verify the accessible public link.'],['Canvas submission','Submit the portfolio link before the instructor’s deadline.']
  ];
  requirements.forEach(([title,detail,complete=false]) => { const li=document.createElement('li'),box=document.createElement('span'),text=document.createElement('div'),small=document.createElement('small'),status=document.createElement('span'); li.classList.toggle('requirement-complete',complete); box.setAttribute('aria-hidden','true'); box.textContent=complete?'✓':''; status.className='sr-only'; status.textContent=complete?'Complete: ':'Pending: '; text.append(status,document.createTextNode(title)); small.textContent=detail; text.append(small); li.append(box,text); document.querySelector('#requirements-list').append(li); });
  const dialog=document.querySelector('#certificate-dialog');
  document.querySelectorAll('[data-certificate]').forEach(button => button.addEventListener('click', () => { document.querySelector('#certificate-title').textContent=button.dataset.title; const image=document.querySelector('#certificate-full'); image.src=button.dataset.certificate; image.alt=button.dataset.title; document.querySelector('#certificate-original').href=button.dataset.certificate; if (typeof dialog.showModal==='function') dialog.showModal(); else window.open(button.dataset.certificate,'_blank','noopener,noreferrer'); }));
  document.querySelector('#certificate-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{ if(event.target===dialog){ const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close(); } });
  showSection(location.hash.slice(1));
})();
