const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
const buildGradle = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

let content = fs.readFileSync(buildGradle, 'utf-8');

const [major, minor, patch] = pkg.version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;
const versionName = pkg.version;

content = content.replace(/versionCode \d+/, `versionCode ${versionCode}`);
content = content.replace(/versionName ".*?"/, `versionName "${versionName}"`);

fs.writeFileSync(buildGradle, content, 'utf-8');
console.log(`Android version synced: ${versionName} (code ${versionCode})`);
