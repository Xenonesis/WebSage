#!/usr/bin/env node
// WebSage secret / inline-handler scan — zero dependencies.
// Catches real API keys or event-handler attributes accidentally committed.
// Run: node scripts/scan-secrets.js   (from repo root)
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const FILES = ['background.js', 'content.js', 'popup.js', 'popup.html', 'manifest.json'];

const PATTERNS = [
  { re: /sk-[A-Za-z0-9_-]{20,}/g, name: 'OpenAI API key' },
  { re: /AIza[0-9A-Za-z_-]{20,}/g, name: 'Google/Gemini API key' },
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g, name: 'private key block' },
  { re: /\bapiKey\s*[:=]\s*['"][^'"]{16,}['"]/g, name: 'hardcoded API key literal' },
  { re: /\son(?:click|load|error|submit|change|keydown|keyup|input|focus|blur|dblclick|contextmenu|drag|drop|mouseover|mouseout)\s*=/g, name: 'inline event handler' }
];

let failures = 0;
for (const file of FILES) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    console.error(`❌ ${file}: missing`);
    failures++;
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');
  const lines = content.split('\n');
  for (const { re, name } of PATTERNS) {
    re.lastIndex = 0;
    for (const line of lines) {
      re.lastIndex = 0;
      const match = re.exec(line);
      if (match) {
        console.error(`❌ ${file}:${lines.indexOf(line) + 1}: ${name} (${match[0].slice(0, 40)}${match[0].length > 40 ? '…' : ''})`);
        failures++;
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} finding(s) — fix before committing.`);
  process.exit(1);
}
console.log('✅ No secrets or inline event handlers found.');
