import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Level, Parsers } = require('adofai');
import fs from 'fs';
import path from 'path';
import { calculateTiming, stitchLevels } from '../src/utils/stitcher.js';

async function runTest() {
  const sourcePath = path.resolve('tests/source.adofai');
  const targetPath = path.resolve('tests/dist.adofai');

  if (!fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) {
    console.error('错误: 请确保 tests/source.adofai 和 tests/dist.adofai 文件存在。');
    return;
  }

  const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
  const targetContent = fs.readFileSync(targetPath, 'utf-8');

  const sourceLevel = new Level(sourceContent, new Parsers.StringParser());
  const targetLevel = new Level(targetContent, new Parsers.StringParser());

  await sourceLevel.load();
  await targetLevel.load();

  // 模拟从 source 的第 100 块开始，缝合 50 块到 target 的第 200 块
  const sourceRange: [number, number] = [100, 150];
  const targetStartIndex = 200;
  
  // 选择所有事件
  const allEvents = ['SetSpeed', 'Twirl', 'Pause', 'MoveTrack', 'MoveCamera', 'Flash', 'AddDecoration'];

  console.log(`--- 正在进行缝合测试 ---`);
  console.log(`源范围: ${sourceRange[0]} - ${sourceRange[1]}`);
  console.log(`目标起始点: ${targetStartIndex}`);

  // 执行缝合
  const result = stitchLevels(sourceLevel, sourceRange, targetLevel, targetStartIndex, allEvents, 'whitelist');
  const resultLevel = result.level;

  // 计算三者的正向时间
  const sourceTiming = calculateTiming(sourceLevel);
  const resultTiming = calculateTiming(resultLevel);

  // 找到缝合后的事件
  // 我们只关心那些从 source 迁移过来的事件
  // 逻辑：在 resultTiming.eventTimes 中找到 tileIndex >= targetStartIndex 的事件
  // 并且它们的时间应该与 sourceTiming.eventTimes 中对应的事件一致（相对位移后）

  const sourceStartTime = sourceTiming.tileTimes[sourceRange[0]];

  const targetTiming = calculateTiming(targetLevel);
  const expectedStartTime = targetTiming.tileTimes[targetStartIndex];
  
  console.log(`\n--- 验证迁移后的事件时间 ---`);
  
  // 获取 source 范围内的所有事件
  const sourceEvents = sourceTiming.eventTimes.filter(et => 
    et.tileIndex >= sourceRange[0] && et.tileIndex <= sourceRange[1]
  );

  // 用 transferredEvents debug 信息对比
  let matchCount = 0;
  let maxDiff = 0;
  let worst: any = null;

  result.transferredEvents.forEach((te, idx) => {
    const expectedTime = expectedStartTime + (te.sourceTime - sourceStartTime);
    const diff = Math.abs(te.targetTime - expectedTime);
    if (diff < 0.1) {
      matchCount++;
      maxDiff = Math.max(maxDiff, diff);
    }
    if (diff > maxDiff) {
      worst = { te, expectedTime, diff, idx };
    }
  });

  console.log(`成功匹配事件数: ${matchCount} / ${result.transferredEvents.length}`);
  console.log(`最大时间偏差: ${(maxDiff * 1000).toFixed(4)}ms`);

  if (worst && maxDiff > 0.001) {
    console.log(`\n最差偏差事件: ${worst.te.eventType} sourceTile=${worst.te.sourceTileIndex} targetTile=${worst.te.targetTileIndex}`);
    console.log(`  期望时间: ${worst.expectedTime.toFixed(6)}s, 实际: ${worst.te.targetTime.toFixed(6)}s`);
    console.log(`  sourceTime: ${worst.te.sourceTime.toFixed(6)}s, targetAngleOffset: ${worst.te.targetAngleOffset}`);
  }

  if (maxDiff < 0.001) {
    console.log('\n✅ 成功: 缝合后的事件时间精确匹配 (偏差 < 1ms)');
  } else if (maxDiff < 0.016) {
    console.log('\n⚠️ 警告: 偏差较小 (< 16ms)，但在可接受范围内');
  } else {
    console.error('\n❌ 失败: 时间偏差过大');
  }
}

runTest().catch(console.error);
