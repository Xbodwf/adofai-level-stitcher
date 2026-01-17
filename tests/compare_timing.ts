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

  // 检查最后一个砖块的时间戳差异
  const sLastIdx = sourceTiming.tileTimes.length - 1;
  const dLastIdx = distTiming.tileTimes.length - 1;
  const sFinal = sourceTiming.tileTimes[sLastIdx];
  const dFinal = distTiming.tileTimes[dLastIdx];
  const finalDiff = sFinal - dFinal;
  
  console.log('\n--- 最终时间戳对比 ---');
  console.log(`源谱面最后一个砖块 (${sLastIdx}): ${sFinal.toFixed(6)}s`);
  console.log(`目标谱面最后一个砖块 (${dLastIdx}): ${dFinal.toFixed(6)}s`);
  console.log(`最终时间差异: ${(finalDiff * 1000).toFixed(4)}ms (${Math.abs(finalDiff).toFixed(4)}s)`);

  if (Math.abs(finalDiff) < 1.0) {
    console.log('\n✅ 成功: 两个谱面最终时间戳差异小于 1 秒。');
  } else {
    console.warn('\n❌ 失败: 两个谱面最终时间戳差异大于 1 秒，可能会导致特效明显偏移。');
  }
}

runTest().catch(console.error);
