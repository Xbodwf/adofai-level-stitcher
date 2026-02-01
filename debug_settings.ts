
import pkg from 'adofai';
const { Level, Parsers } = pkg;
import fs from 'fs';

async function debug() {
  const content = fs.readFileSync('tests/source.adofai', 'utf-8');
  const level = new Level(content, new Parsers.StringParser());
  await level.load();
  console.log('--- Settings ---');
  console.log(JSON.stringify(level.settings, null, 2));
  
  console.log('\n--- Tile 0 ---');
  console.log(JSON.stringify(level.tiles[0], null, 2));
  
  console.log('\n--- Tile 1 ---');
  console.log(JSON.stringify(level.tiles[1], null, 2));
}

debug().catch(console.error);
