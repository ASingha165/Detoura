import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translationsPath = path.resolve(__dirname, '../src/i18n/translations.ts');
const content = fs.readFileSync(translationsPath, 'utf-8');

// Simple parser for translations export from TS
const enMatch = content.match(/en:\s*({[\s\S]*?}),\s*hi:/);
const hiMatch = content.match(/hi:\s*({[\s\S]*?}),\s*bn:/);
const bnMatch = content.match(/bn:\s*({[\s\S]*?})\s*};/);

if (!enMatch || !hiMatch || !bnMatch) {
  console.error('Failed to parse translations from translations.ts');
  process.exit(1);
}

const en = JSON.parse(enMatch[1]);
const hi = JSON.parse(hiMatch[1]);
const bn = JSON.parse(bnMatch[1]);

function checkStructure(ref, target, lang, path = '') {
  const errors = [];
  for (const key of Object.keys(ref)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (!(key in target)) {
      errors.push(`Missing key in [${lang}]: ${fullPath}`);
    } else if (typeof ref[key] === 'object' && ref[key] !== null) {
      if (typeof target[key] !== 'object' || target[key] === null) {
        errors.push(`Type mismatch in [${lang}] for ${fullPath}: expected object, got ${typeof target[key]}`);
      } else {
        errors.push(...checkStructure(ref[key], target[key], lang, fullPath));
      }
    } else if (typeof target[key] !== 'string' || target[key].trim() === '') {
      errors.push(`Empty or invalid string in [${lang}] for ${fullPath}`);
    }
  }
  return errors;
}

const hiErrors = checkStructure(en, hi, 'HI');
const bnErrors = checkStructure(en, bn, 'BN');
const reverseHi = checkStructure(hi, en, 'EN_REVERSE_HI');
const reverseBn = checkStructure(bn, en, 'EN_REVERSE_BN');

const allErrors = [...hiErrors, ...bnErrors, ...reverseHi, ...reverseBn];

if (allErrors.length > 0) {
  console.error(`❌ Translation verification failed with ${allErrors.length} errors:`);
  allErrors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}

// Check place types
const placeTypeKeys = [
  'mountains', 'coast', 'beaches', 'forests', 'waterfalls',
  'wildlife', 'rivers_lakes', 'heritage', 'spiritual',
  'countryside', 'tea_gardens', 'islands'
];

for (const pt of placeTypeKeys) {
  if (!en.placeTypes[pt]) throw new Error(`EN missing placeType: ${pt}`);
  if (!hi.placeTypes[pt]) throw new Error(`HI missing placeType: ${pt}`);
  if (!bn.placeTypes[pt]) throw new Error(`BN missing placeType: ${pt}`);
}

// Check 12 months
for (let m = 1; m <= 12; m++) {
  if (!en.months[m]) throw new Error(`EN missing month: ${m}`);
  if (!hi.months[m]) throw new Error(`HI missing month: ${m}`);
  if (!bn.months[m]) throw new Error(`BN missing month: ${m}`);
}

console.log('✅ Translation Verification Passed: All keys strictly synchronized across EN, HI, BN.');
console.log(`Checked categories: ${Object.keys(en).join(', ')}`);
