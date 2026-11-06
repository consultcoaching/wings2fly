/* Genereert geheel/LeefNu.jsx uit src/: één bestand met alle modules en de CSS,
 * voor een canvas/preview zonder bundler. Bron van waarheid blijft src/.
 *
 *   npm run geheel
 *
 * Werkwijze: modules in afhankelijkheidsvolgorde aan elkaar plakken, relatieve
 * imports en export-keywords strippen, React-imports samenvoegen, CSS als
 * <style> in App injecteren. Vereist unieke top-level namen over alle modules. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(root, 'src', p), 'utf8');

const ORDER = [
  'lib/config.js',
  'lib/device.js',
  'lib/storage.js',
  'lib/protocols.js',
  'lib/grounding.js',
  'lib/tiers.js',
  'lib/crisisLines.js',
  'hooks/useLocalData.js',
  'hooks/useOnline.js',
  'hooks/useBreathing.js',
  'components/BreathRings.jsx',
  'screens/Crisis.jsx',
  'screens/Start.jsx',
  'screens/Adem.jsx',
  'screens/Meer.jsx',
  'screens/Grounding.jsx',
  'screens/Dagboek.jsx',
  'screens/Privacy.jsx',
  'screens/Niveaus.jsx',
  'screens/Instellingen.jsx',
  'App.jsx',
];

const reactImports = new Set();
const seenNames = new Map();
const parts = [];

for (const file of ORDER) {
  let code = src(file);

  // React-imports verzamelen, relatieve imports verwijderen.
  code = code.replace(/^import\s*\{([^}]*)\}\s*from\s*'react';\s*$/gm, (_, names) => {
    names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => reactImports.add(n));
    return '';
  });
  code = code.replace(/^import\s+[^;]+from\s+'\.[^']*';\s*$/gm, '');

  // Exports strippen; App blijft de default export van het geheel.
  code = code.replace(/^export default function (\w+)/gm, (m, name) =>
    file === 'App.jsx' ? m : `function ${name}`
  );
  code = code.replace(/^export \{[^}]*\};\s*$/gm, '');
  code = code.replace(/^export (const|function|let) /gm, '$1 ');

  // Dubbele top-level namen opsporen (zouden elkaar stil overschrijven).
  for (const match of code.matchAll(/^(?:const|function|let) (\w+)/gm)) {
    const name = match[1];
    if (seenNames.has(name)) {
      throw new Error(`Naam "${name}" komt voor in ${seenNames.get(name)} én ${file}; hernoem één van beide.`);
    }
    seenNames.set(name, file);
  }

  if (file === 'App.jsx') {
    if (!code.includes('<div className="app">')) throw new Error('App.jsx: <div className="app"> niet gevonden.');
    code = code.replace('<div className="app">', '<div className="app">\n      <style>{LEEFNU_CSS}</style>');
  }

  parts.push(`/* ============================== ${file} ============================== */\n${code.trim()}\n`);
}

const css = src('index.css').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const header = `/* LeefNu – "Geheel": de volledige app in één bestand.
 *
 * GEGENEREERD door scripts/build-geheel.mjs uit ../src. Niet met de hand
 * bewerken: wijzig src/ en draai \`npm run geheel\`. Bedoeld voor een
 * canvas/preview zonder bundler (default export = App). Bevat geen service
 * worker: die vereist een apart bestand (zie ../public/sw.js).
 *
 * Gebruik: import LeefNu from './LeefNu.jsx'; <LeefNu />
 */
import { ${[...reactImports].sort().join(', ')} } from 'react';
`;

const out = `${header}\n${parts.join('\n')}\n/* ============================== index.css ============================== */\nconst LEEFNU_CSS = \`\n${css}\`;\n`;

mkdirSync(join(root, 'geheel'), { recursive: true });
writeFileSync(join(root, 'geheel', 'LeefNu.jsx'), out);
console.log(`geheel/LeefNu.jsx geschreven (${out.length} tekens, ${ORDER.length} modules).`);
