// Initialize Vanta.js fog effect
window.addEventListener('DOMContentLoaded', function() {
  if (window.VANTA && window.VANTA.FOG) {
    VANTA.FOG({
      el: "#fog-background",
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.00,
      minWidth: 200.00,
      highlightColor: 0xe14ea4, // Pink fog
      midtoneColor: 0x777777,  // Mid gray
      lowlightColor: 0x111111, // Dark gray
      baseColor: 0x000000,     // Black
      blurFactor: 0.60,        // Increased blur
      speed: 1.2,              // Slightly faster
      zoom: 0.70               // Better zoom level
    });
  }
});