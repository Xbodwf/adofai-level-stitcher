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

  console.log(`源谱面: ${sourceLevel.tiles.length} 砖块, 初始BPM: ${sourceLevel.settings.bpm}, 初始角度: ${sourceLevel.tiles[0]?.angle || 0}`);
  console.log(`目标谱面: ${distLevel.tiles.length} 砖块, 初始BPM: ${distLevel.settings.bpm}, 初始角度: ${distLevel.tiles[0]?.angle || 0}`);

  console.log('\n--- 初始偏移 (Tile 0 击打时间) ---');
  console.log(`源谱面 Tile 0: ${sourceTiming.tileTimes[0].toFixed(6)}s`);
  console.log(`目标谱面 Tile 0: ${distTiming.tileTimes[0].toFixed(6)}s`);
  console.log(`偏移差异: ${((sourceTiming.tileTimes[0] - distTiming.tileTimes[0]) * 1000).toFixed(4)}ms`);

  console.log('\n--- 关键节点时间戳对比 (每 200 砖块) ---');
  const step = 200;
  const maxIdx = Math.min(sourceLevel.tiles.length, distLevel.tiles.length);
  for (let i = 0; i < maxIdx; i += step) {
    const sTime = sourceTiming.tileTimes[i];
    const dTime = distTiming.tileTimes[i];
    const diff = sTime - dTime;
    console.log(`Tile ${i.toString().padEnd(4)}: Diff=${(diff * 1000).toFixed(4).padStart(10)}ms (${diff.toFixed(4).padStart(8)}s)`);
  }

  // 检查最后一个砖块的时间戳差异
  const sLastIdx = sourceTiming.tileTimes.length - 1;
  const dLastIdx = distTiming.tileTimes.length - 1;
  const sFinal = sourceTiming.tileTimes[sLastIdx];
  const dFinal = distTiming.tileTimes[dLastIdx];
  const finalDiff = sFinal - dFinal;
  
  console.log('\n--- 最终时间戳对比 (相对于音乐起点) ---');
  console.log(`源谱面 (Tile ${sLastIdx}): ${sFinal.toFixed(6)}s`);
  console.log(`目标谱面 (Tile ${dLastIdx}): ${dFinal.toFixed(6)}s`);
  console.log(`最终时间差异: ${(finalDiff * 1000).toFixed(4)}ms (${Math.abs(finalDiff).toFixed(4)}s)`);

  // 额外：计算谱面总跨度 (从第一个击打到最后一个击打)
  const sDuration = sFinal - sourceTiming.tileTimes[0];
  const dDuration = dFinal - distTiming.tileTimes[0];
  console.log(`\n--- 谱面总跨度 (Duration) ---`);
  console.log(`源谱面跨度: ${sDuration.toFixed(6)}s`);
  console.log(`目标谱面跨度: ${dDuration.toFixed(6)}s`);
  console.log(`跨度差异: ${((sDuration - dDuration) * 1000).toFixed(4)}ms`);

  if (Math.abs(finalDiff) < 1.0) {
    console.log('\n✅ 成功: 两个谱面最终时间戳差异小于 1 秒。');
  } else {
    console.warn('\n❌ 失败: 两个谱面最终时间戳差异大于 1 秒，可能会导致特效明显偏移。');
  }
}

runTest().catch(console.error);
