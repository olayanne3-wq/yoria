// Test du module fit-detection.js sur des fichiers .fit réels, comparé
// à la vérité terrain Strava déjà collectée (cf. conversation du
// 02-03/08/2026). Exécution : node test-fit-detection.mjs

import { readFile } from 'node:fs/promises';
import FitParser from 'fit-file-parser';
import { possedeMarqueursNatifs, construireLapsDepuisFit } from './fit-detection.js';

function fmtPace(speedMs) {
  if (!speedMs || speedMs <= 0.3) return '  -  ';
  const paceMin = 1000 / speedMs / 60;
  const m = Math.floor(paceMin);
  let s = Math.round((paceMin - m) * 60);
  let mm = m;
  if (s === 60) { mm++; s = 0; }
  return `${mm}:${String(s).padStart(2, '0')}`;
}

async function parseFit(path) {
  const buffer = await readFile(path);
  const fitParser = new FitParser({ force: true, speedUnit: 'm/s', lengthUnit: 'm', mode: 'cascade' });
  return new Promise((resolve, reject) => {
    fitParser.parse(buffer, (error, data) => error ? reject(error) : resolve(data));
  });
}

async function testerFichier(path, verite, structureAttendue) {
  console.log(`\n=== ${path} ===`);
  const fitData = await parseFit(path);
  const session = fitData?.activity?.sessions?.[0] || fitData?.sessions?.[0];
  if (!session) { console.log('Session introuvable'); return; }

  const lapsFit = session.laps || [];
  console.log(`Marqueurs natifs présents : ${possedeMarqueursNatifs(lapsFit)}`);

  const laps = construireLapsDepuisFit(session, structureAttendue);
  if (laps === null) { console.log('(pas de repli nécessaire, laps natifs exploitables)'); return; }

  console.log(`${laps.length} intervalles détectés (attendu: ${verite.length})`);
  laps.forEach((lap, i) => {
    const ref = verite[i];
    const pace = fmtPace(lap.average_speed);
    const fc = lap.average_heartrate != null ? Math.round(lap.average_heartrate) : '-';
    const refStr = ref ? `Strava=${ref.pace} (${ref.hr}bpm)` : 'Strava=(pas de référence)';
    console.log(`  R${i+1}: detect=${pace} (${fc}bpm) | ${refStr}`);
  });
}

// Vérité terrain collectée pendant la conversation (comparaisons Strava/Yoria)
const veriteSeuilTest2 = [
  { pace: '4:55', hr: 148 },
  { pace: '4:52', hr: 154 },
  { pace: '4:55', hr: 160 },
];

const veriteVma1 = [
  { pace: '4:32', hr: 142 },
  { pace: '4:10', hr: 150 },
  { pace: '3:51', hr: 157 },
  { pace: '4:10', hr: 158 },
  { pace: '4:10', hr: 160 },
];

const veriteVma2 = [
  { pace: '3:51', hr: 153 },
  { pace: '4:10', hr: 161 },
  { pace: '4:10', hr: 164 },
  { pace: '4:10', hr: 164 },
  { pace: '4:10', hr: 166 },
  { pace: '4:10', hr: 169 },
];

async function main() {
  await testerFichier('/mnt/user-data/uploads/seuil.fit', veriteSeuilTest2, { dureeEffortSec: 360 });
  await testerFichier('/mnt/user-data/uploads/VMA_30-30.fit', veriteVma1, { dureeEffortSec: 30 });
  await testerFichier('/mnt/user-data/uploads/VMA_24-07.fit', veriteVma2, { dureeEffortSec: 30 });
}

main().catch(console.error);
