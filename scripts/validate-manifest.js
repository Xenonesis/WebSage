#!/usr/bin/env node
// WebSage manifest and bundle validation — zero dependencies.
// Run: node scripts/validate-manifest.js   (from repo root)
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failures = 0;
const fail = (msg) => { failures++; console.error(`❌ ${msg}`); };
const ok = (msg) => console.log(`✅ ${msg}`);

const manifest = require(path.join(root, 'manifest.json'));

// 1. Version shape
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  fail(`bad version string: ${manifest.version}`);
} else {
  ok(`version ${manifest.version}`);
}

// 2. Icons: every referenced file must exist and be non-empty
const iconEntries = Object.entries(manifest.icons || {});
if (iconEntries.length === 0) fail('no icons declared');
for (const [size, file] of iconEntries) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) fail(`icon ${size} missing: ${file}`);
  else if (fs.statSync(full).size === 0) fail(`icon ${size} is 0 bytes: ${file}`);
  else ok(`icon ${size}: ${file}`);
}
const defaultIcon = (manifest.action && manifest.action.default_icon) || {};
for (const [size, file] of Object.entries(defaultIcon)) {
  if (!iconEntries.some(([s, f]) => s === size && f === file)) {
    fail(`action.default_icon ${size} not listed under icons: ${file}`);
  }
}

// 3. Every script/css/html file declared in the manifest must exist
const declared = [];
for (const cs of manifest.content_scripts || []) {
  for (const f of [...(cs.js || []), ...(cs.css || [])]) declared.push(f);
}
if (manifest.background && manifest.background.service_worker) declared.push(manifest.background.service_worker);
if (manifest.action && manifest.action.default_popup) declared.push(manifest.action.default_popup);
if (declared.length === 0) fail('no files declared in manifest');
for (const f of declared) {
  if (!fs.existsSync(path.join(root, f))) fail(`declared file missing: ${f}`);
  else ok(`file present: ${f}`);
}

// 4. host_permissions must be scoped — no all-URL wildcards
const hostPerms = manifest.host_permissions || [];
for (const hp of hostPerms) {
  if (hp === 'https://*/*' || hp === 'http://*/*' || hp === '<all_urls>') {
    fail(`unscoped host_permission: ${hp}`);
  }
}
ok(`host_permissions scoped (${hostPerms.length} entries)`);

// 5. No stale nlp-simple.js references anywhere in the manifest
if (JSON.stringify(manifest).includes('nlp-simple')) {
  fail('stale nlp-simple.js reference in manifest');
}

// 6. Required permissions still present
const required = ['storage', 'activeTab', 'scripting', 'contextMenus'];
for (const perm of required) {
  if (!(manifest.permissions || []).includes(perm)) fail(`missing permission: ${perm}`);
}
ok(`permissions: ${(manifest.permissions || []).join(', ')}`);

// 7. No inline event handler attributes in the popup HTML
if (manifest.action && manifest.action.default_popup) {
  const html = fs.readFileSync(path.join(root, manifest.action.default_popup), 'utf8');
  const m = html.match(/\son\w+\s*=/);
  if (m) fail(`inline event handler in ${manifest.action.default_popup}: ${m[0].trim()}`);
  else ok(`no inline event handlers in ${manifest.action.default_popup}`);
}

if (failures > 0) {
  console.error(`\n${failures} validation failure(s)`);
  process.exit(1);
}
console.log('\nAll manifest checks passed.');
