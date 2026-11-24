// Pull the design from the Eagle Eye app (READ-ONLY — nothing in the app repo is written).
//   node tools/sync-reference.mjs "<path to the app repo>/eagleeyes/ui/app"
// Copies dashboard.css (the whole welcome-page design) verbatim into src/app/, and extracts the
// app's ICONS table (lucide line icons, MIT — see LUCIDE-LICENSE in the app) into src/icons.json,
// which build.mjs uses for the static icons and inlines into site.js for the runtime art.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPDIR = process.argv[2];
if (!APPDIR) { console.error('usage: node tools/sync-reference.mjs <app>/eagleeyes/ui/app'); process.exit(1); }

copyFileSync(join(APPDIR, 'dashboard.css'), join(ROOT, 'src/app/dashboard.css'));

const js = readFileSync(join(APPDIR, 'dashboard.js'), 'utf8');
const a = js.indexOf('const ICONS = {');
const b = js.indexOf('\n};', a);
if (a < 0 || b < 0) throw new Error('ICONS table not found in dashboard.js');
// The table is a plain object literal of [tag, attrs] pairs — evaluate just that literal.
const ICONS = Function('"use strict"; return (' + js.slice(a + 'const ICONS = '.length, b + 2) + ');')();
writeFileSync(join(ROOT, 'src/icons.json'), JSON.stringify(ICONS) + '\n');
console.log(`synced dashboard.css + ${Object.keys(ICONS).length} icons`);

// three.js (r160, MIT — vendor/three/LICENSE) and the post-processing addons the app's feature
// worlds use; the content pages' worlds (src/app/world.js) run on the same build.
import { cpSync } from 'node:fs';
cpSync(join(APPDIR, 'vendor', 'three'), join(ROOT, 'src/app/vendor/three'), { recursive: true });
console.log('synced vendor/three');
