import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const srcDir = resolve(__dirname, '../node_modules/stockfish/src');
  const destDir = resolve(__dirname, '../public');
  await mkdir(destDir, { recursive: true });
  try {
    const files = await readdir(srcDir);
    const asm = files.find((f) => /asm.*\.js$/i.test(f));
    if (!asm) throw new Error('No asm.js stockfish build found in stockfish/src');
    await copyFile(resolve(srcDir, asm), resolve(destDir, 'stockfish.js'));
    console.log(`Copied ${asm} to public/stockfish.js`);
  } catch (err) {
    console.warn('Skipping copy of stockfish asm.js:', err?.message || err);
  }
}

main();


