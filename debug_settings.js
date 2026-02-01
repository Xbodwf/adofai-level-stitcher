
import pkg from 'adofai';
const { Level, Parsers } = pkg;
import fs from 'fs';

async function debug() {
  const content = fs.readFileSync('tests/source.adofai', 'utf-8');
  // 简单的正则提取 settings 块，防止 parser 报错
  const settingsMatch = content.match(/"settings":\s*\{[\s\S]*?\}/);
  if (settingsMatch) {
    console.log('--- Raw Settings ---');
    console.log(settingsMatch[0]);
  }

  try {
    const level = new Level(content, new Parsers.StringParser());
    await level.load();
    console.log('\n--- Parsed Settings ---');
    console.log('bpm:', level.settings.bpm);
    console.log('offset:', level.settings.offset);
    console.log('countdownTicks:', level.settings.countdownTicks);
  } catch (e) {
    console.log('Parser error:', e);
  }
}

debug().catch(console.error);
