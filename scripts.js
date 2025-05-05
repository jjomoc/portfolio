
window.addEventListener('DOMContentLoaded', function() {
  if (window.VANTA && window.VANTA.FOG) {
    VANTA.FOG({
      el: "#fog-background",
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.00,
      minWidth: 200.00,
      highlightColor: 0xe14ea4, 
      midtoneColor: 0x777777, 
      lowlightColor: 0x111111, 
      baseColor: 0x000000,     
      blurFactor: 0.60,        
      speed: 1.2,             
      zoom: 0.70               
    });
  }
});
