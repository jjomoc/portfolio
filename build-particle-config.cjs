const fs = require('node:fs');
const path = require('node:path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'particlesjs-config.json'), 'utf8'));
fs.writeFileSync(
  path.join(__dirname, 'particles-config.js'),
  '// Generated from particlesjs-config.json by npm run build.\nwindow.portfolioParticleConfig = ' + JSON.stringify(config, null, 2) + ';\n'
);
