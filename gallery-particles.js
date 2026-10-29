(async () => {
  const host = document.querySelector('#gallery-particles');
  if (!host || typeof window.particlesJS !== 'function') return;

  let config = window.portfolioParticleConfig;
  if (location.protocol !== 'file:') {
    try {
      const response = await fetch('particlesjs-config.json');
      if (!response.ok) throw new Error('Particle configuration unavailable');
      config = await response.json();
    } catch {
      // The bundled settings also support offline and direct-file viewing.
    }
  }
  if (!config) {
    host.dataset.state = 'unavailable';
    return;
  }

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const settings = JSON.parse(JSON.stringify(config));
  if (motion.matches) {
    settings.particles.move.enable = false;
    settings.particles.size.anim.enable = false;
    settings.particles.opacity.anim.enable = false;
  }
  window.particlesJS(host.id, settings);
  host.dataset.state = 'ready';

  const engine = window.pJSDom?.find(item => item.pJS.canvas.el.parentElement === host)?.pJS;
  if (!engine) return;

  function updateMotion() {
    cancelAnimationFrame(engine.fn.drawAnimFrame);
    if (document.hidden) return;
    engine.particles.move.enable = !motion.matches && config.particles.move.enable;
    engine.particles.size.anim.enable = !motion.matches && config.particles.size.anim.enable;
    engine.particles.opacity.anim.enable = !motion.matches && config.particles.opacity.anim.enable;
    engine.fn.particlesRefresh();
  }
  motion.addEventListener?.('change', updateMotion);
  document.addEventListener('visibilitychange', updateMotion);
  if (document.hidden) cancelAnimationFrame(engine.fn.drawAnimFrame);
})();
