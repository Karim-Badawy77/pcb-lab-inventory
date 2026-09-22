const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const frontendEntry = path.join(projectRoot, 'frontend', 'dist', 'index.html');

if (!fs.existsSync(frontendEntry)) {
  if (process.platform === 'win32') {
    execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run build'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } else {
    execFileSync('npm', ['run', 'build'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  }
}

process.env.NODE_ENV = 'production';
require('../src/server');
