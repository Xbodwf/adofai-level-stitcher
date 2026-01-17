import pkg from 'adofai';
const { Level, Parsers } = pkg;
import fs from 'fs';
import path from 'path';
import { calculateTiming } from '../src/utils/stitcher.js';

async function runTest() {
  const sourcePath = path.resolve('tests/source.adofai');
  const distPath = path.resolve('tests/dist.adofai');

  if (!fs.existsSync(sourcePath) || !fs.existsSync(distPath)) {
    console.error('错误: 请确保 tests/source.adofai 和 tests/dist.adofai 文件存在。');
    return;
  }

  console.log('--- 正在加载谱面 ---');
  const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
  const distContent = fs.readFileSync(distPath, 'utf-8');

  const sourceLevel = new Level(sourceContent, new Parsers.StringParser());
  const distLevel = new Level(distContent, new Parsers.StringParser());

  await sourceLevel.load();
  await distLevel.load();

  console.log('--- 正在计算时间戳 ---');
  const sourceTiming = calculateTiming(sourceLevel);
  const distTiming = calculateTiming(distLevel);

  console.log(`源谱面砖块数: ${sourceLevel.tiles.length}`);
  console.log(`目标谱面砖块数: ${distLevel.tiles.length}`);

  console.log('\n--- 比较前 10 个砖块的时间戳 ---');
  const compareCount = Math.min(10, sourceLevel.tiles.length, distLevel.tiles.length);
  for (let i = 0; i < compareCount; i++) {
    const sTime = sourceTiming.tileTimes[i];
    const dTime = distTiming.tileTimes[i];
    const diff = sTime - dTime;
    console.log(`Tile ${i}: Source=${sTime.toFixed(6)}s, Dist=${dTime.toFixed(6)}s, Diff=${(diff * 1000).toFixed(4)}ms`);
  }

  // 检查是否有明显的累计误差
  const lastIdx = Math.min(sourceLevel.tiles.length, distLevel.tiles.length) - 1;
  const sFinal = sourceTiming.tileTimes[lastIdx];
  const dFinal = distTiming.tileTimes[lastIdx];
  const finalDiff = sFinal - dFinal;
  console.log(`\n最后一个对应砖块 (${lastIdx}):`);
  console.log(`Source=${sFinal.toFixed(6)}s, Dist=${dFinal.toFixed(6)}s, Diff=${(finalDiff * 1000).toFixed(4)}ms`);

  if (Math.abs(finalDiff) > 0.001) {
    console.warn('\n⚠️ 警告: 发现明显的时间戳差异！这可能是导致特效偏移的原因。');
  } else {
    console.log('\n✅ 时间戳基本一致。');
  }
}

runTest().catch(console.error);
