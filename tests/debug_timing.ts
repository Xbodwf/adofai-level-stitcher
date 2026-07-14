import { calculateTiming } from '../src/utils/stitcher.ts';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Level, Parsers } = require('adofai');

async function testTiming(filePath: string, tileIndex: number) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const level = new Level(content, new Parsers.StringParser());
    await level.load();

    console.log(`File: ${filePath}`);
    console.log(`Offset: ${level.settings.offset}, BPM: ${level.settings.bpm}, Pitch: ${level.settings.pitch}`);
    
    // 打印前几个砖块的角度来看看
    console.log('Sample tiles angles (first 5):', level.tiles.slice(0, 5).map(t => t.angle));
    
    const timing = calculateTiming(level);
    console.log(`Tile ${tileIndex} Time: ${timing.tileTimes[tileIndex]}`);
    console.log(`BPM at Tile ${tileIndex}: ${timing.bpmAtTiles[tileIndex]}`);
    console.log('---');
  } catch (e: any) {
    console.error(`Failed to parse ${filePath}:`);
    console.error(e?.message || e);
    if (e?.stack) console.error(e.stack);
  }
}

async function run() {
  try {
    await testTiming('tests/deltaLevels/level.adofai', 87);
    await testTiming('tests/deltaLevels/saved_processed.adofai', 103);
  } catch (e) {
    console.error(e);
  }
}

run();
