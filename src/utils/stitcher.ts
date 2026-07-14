import { Level, Structure } from 'adofai';

export type AdofaiEvent = Structure.AdofaiEvent;

export interface TimingInfo {
  tileTimes: number[];
  eventTimes: {
    tileIndex: number;
    event: AdofaiEvent;
    absoluteTime: number;
    bpm: number;
    isDecoration?: boolean;
  }[];
  bpmAtTiles: number[];
  directionsAtTiles: number[];
  anglesAtTiles: number[];
}

/** 单砖块内的定时事件（排序后） */
interface TileTimingEvent {
  angleOffset: number;
  event: any;
  isDecoration: boolean;
}

/** 砖块内时间轴上的一个"区间"，包含起始角度和该区间的累积暂停延迟 */
interface TileSegment {
  startAngle: number;
  endAngle: number;
  bpm: number;
  /** 到达此区段起点时累积的暂停/保持延迟 */
  accumulatedPause: number;
}

function travelTime(angleDeg: number, bpm: number, pitch: number): number {
  return (angleDeg / 180) * (60 / bpm) * (100 / pitch);
}

function pauseTime(duration: number, bpm: number, pitch: number): number {
  return duration * (60 / bpm) * (100 / pitch);
}

function holdTime(duration: number, bpm: number, pitch: number): number {
  return duration * (120 / bpm) * (100 / pitch);
}

function collectTileEvents(tile: any): TileTimingEvent[] {
  const events: TileTimingEvent[] = [];
  tile.actions?.forEach((a: any) =>
    events.push({ angleOffset: a.angleOffset || 0, event: a, isDecoration: false })
  );
  tile.addDecorations?.forEach((d: any) =>
    events.push({ angleOffset: d.angleOffset || 0, event: d, isDecoration: true })
  );
  events.sort((a, b) => a.angleOffset - b.angleOffset);
  return events;
}

/**
 * 计算谱面的时间戳信息
 * 修正：每个砖块内的事件按 angleOffset 排序，增量跟踪 BPM/Pause/Hold 状态
 */
export function calculateTiming(level: Level): TimingInfo {
  const tileTimes: number[] = [];
  const eventTimes: { event: any; absoluteTime: number; tileIndex: number; bpm: number; isDecoration: boolean }[] = [];
  const bpmAtTiles: number[] = [];
  const directionsAtTiles: number[] = [];
  const anglesAtTiles: number[] = [];

  const settings = level.settings as any;
  const initialBpm = settings.bpm || 100;
  const pitch = settings.pitch || 100;

  let currentTime = 0;
  let currentBpm = initialBpm;
  let direction = 1;

  for (let i = 0; i < level.tiles.length; i++) {
    const tile = level.tiles[i];
    tileTimes.push(currentTime);
    bpmAtTiles.push(currentBpm);
    directionsAtTiles.push(direction);
    anglesAtTiles.push(tile.angle || 0);

    // Tile 0 不能有影响时长的操作（SetSpeed/Pause/Hold 在 angleOffset 0 无效）
    // 但仍需处理 Twirl 和携带 angleOffset 的事件
    const tileEvents = collectTileEvents(tile);

    let tileBpm = currentBpm;
    let lastAngle = 0;
    let accumulatedPause = 0; // 当前角度之前累积的暂停保持延迟

    for (const entry of tileEvents) {
      const ao = entry.angleOffset;

      // 从 lastAngle 行驶到本事件的 angleOffset
      const angleDelta = ao - lastAngle;
      if (angleDelta > 0) {
        const tt = travelTime(angleDelta, tileBpm, pitch);
        accumulatedPause += tt;
      }
      lastAngle = ao;

      const eventTime = currentTime + accumulatedPause;

      // 先记录——注意 Twirl 在下一次瓷砖才会生效 (在此处更新方向不影响当前事件)
      eventTimes.push({
        tileIndex: i,
        event: { ...entry.event },
        absoluteTime: eventTime,
        bpm: tileBpm,
        isDecoration: entry.isDecoration,
      });

      // 处理影响时态的 event（排序后保证顺序正确）
      if (entry.event.eventType === 'SetSpeed') {
        if (entry.event.speedType === 'Bpm') tileBpm = entry.event.beatsPerMinute;
        else if (entry.event.speedType === 'Multiplier') tileBpm *= entry.event.bpmMultiplier;
      } else if (entry.event.eventType === 'Pause') {
        accumulatedPause += pauseTime(entry.event.duration || 0, tileBpm, pitch);
      } else if (entry.event.eventType === 'Hold') {
        accumulatedPause += holdTime(entry.event.duration || 0, tileBpm, pitch);
      } else if (entry.event.eventType === 'Twirl') {
        direction *= -1;
      }
    }

    // 行驶到下一个瓷砖
    const nextTile = level.tiles[i + 1];
    if (nextTile) {
      const travelAngle = nextTile.angle || 0;
      if (travelAngle > 0) {
        accumulatedPause += travelTime(travelAngle - lastAngle, tileBpm, pitch);
      }
      currentTime = currentTime + accumulatedPause;
    }

    currentBpm = tileBpm;
  }

  return { tileTimes, eventTimes, bpmAtTiles, directionsAtTiles, anglesAtTiles };
}

/**
 * 计算砖块从到达到达下一个砖块的总时间 + 最终 BPM
 * 按 angleOffset 排序增量计算，与 calculateTiming 一致
 */
export function computeTileTotalTime(
  tile: any, tileAngle: number, entryBpm: number, pitch: number
): { totalTime: number, finalBpm: number } {
  const events = collectTileEvents(tile);
  let totalTime = 0;
  let bpm = entryBpm;
  let lastAngle = 0;

  for (const entry of events) {
    if (entry.event.eventType !== 'SetSpeed' && entry.event.eventType !== 'Pause' && entry.event.eventType !== 'Hold') continue;

    const angleDelta = entry.angleOffset - lastAngle;
    if (angleDelta > 0) {
      totalTime += travelTime(angleDelta, bpm, pitch);
    }
    lastAngle = entry.angleOffset;

    if (entry.event.eventType === 'SetSpeed') {
      if (entry.event.speedType === 'Bpm') bpm = entry.event.beatsPerMinute;
      else bpm *= entry.event.bpmMultiplier;
    } else if (entry.event.eventType === 'Pause') {
      totalTime += pauseTime(entry.event.duration || 0, bpm, pitch);
    } else if (entry.event.eventType === 'Hold') {
      totalTime += holdTime(entry.event.duration || 0, bpm, pitch);
    }
  }

  const remainingAngle = tileAngle - lastAngle;
  if (remainingAngle > 0) {
    totalTime += travelTime(remainingAngle, bpm, pitch);
  }

  return { totalTime, finalBpm: bpm };
}

/**
 * 获取砖块上的 Pause/Hold 事件造成的总延迟，以及最终 BPM（仅用于向下兼容）
 */
export function getTilePauseDelay(tile: any, currentBpm: number, pitch: number = 100): { delay: number, finalBpm: number } {
  let delay = 0;
  let bpm = currentBpm;
  const timingEvents = collectTileEvents(tile);

  for (const entry of timingEvents) {
    if (entry.event.eventType === 'SetSpeed') {
      if (entry.event.speedType === 'Bpm') bpm = entry.event.beatsPerMinute;
      else if (entry.event.speedType === 'Multiplier') bpm *= entry.event.bpmMultiplier;
    } else if (entry.event.eventType === 'Pause') {
      delay += pauseTime(entry.event.duration || 0, bpm, pitch);
    } else if (entry.event.eventType === 'Hold') {
      delay += holdTime(entry.event.duration || 0, bpm, pitch);
    }
  }
  return { delay, finalBpm: bpm };
}

export interface StitchResult {
  level: Level;
  sourceTiming: TimingInfo;
  targetTiming: TimingInfo;
  transferredEvents: {
    eventType: string;
    sourceTime: number;
    targetTime: number;
    sourceTileIndex: number;
    targetTileIndex: number;
    targetAngleOffset: number;
  }[];
}

/**
 * 在指定砖块上，给定 tileHitTime 之后的时间 timeInTile，
 * 考虑砖块上已有事件的 BPM/Pause/Hold 分布，反算出正确的 angleOffset。
 */
function computeAngleOffsetOnTile(
  tile: any,
  timeInTile: number,
  tileAngle: number,
  initialBpm: number,
  pitch: number,
): number {
  if (timeInTile <= 0) return 0;

  const timingEvents = collectTileEvents(tile);
  const timingOnly = timingEvents.filter(
    e => e.event.eventType === 'SetSpeed' || e.event.eventType === 'Pause' || e.event.eventType === 'Hold'
  );

  let remaining = timeInTile;
  let currentAngle = 0;
  let bpm = initialBpm;
  const pitchFactor = (100 / pitch);

  for (const entry of timingOnly) {
    const ao = entry.angleOffset;
    const angleDelta = ao - currentAngle;

    if (angleDelta > 0) {
      const tt = travelTime(angleDelta, bpm, pitch);
      if (tt >= remaining) {
        return currentAngle + (remaining / (travelTime(1, bpm, pitch)));
      }
      remaining -= tt;
    }
    currentAngle = ao;

    if (entry.event.eventType === 'SetSpeed') {
      if (entry.event.speedType === 'Bpm') bpm = entry.event.beatsPerMinute;
      else bpm *= entry.event.bpmMultiplier;
    } else if (entry.event.eventType === 'Pause') {
      const dur = entry.event.duration || 0;
      const pd = pauseTime(dur, bpm, pitch);
      if (pd >= remaining) {
        return currentAngle;
      }
      remaining -= pd;
    } else if (entry.event.eventType === 'Hold') {
      const dur = entry.event.duration || 0;
      const extraAngle = dur * 360;
      const ht = holdTime(dur, bpm, pitch);
      if (ht >= remaining) {
        return currentAngle + (remaining / (travelTime(1, bpm, pitch)));
      }
      remaining -= ht;
      currentAngle += extraAngle;
    }
  }

  // 所有事件之后，行驶到砖块末端
  const remainingAngle = tileAngle - currentAngle;
  if (remainingAngle > 0) {
    const tt = travelTime(remainingAngle, bpm, pitch);
    if (tt >= remaining) {
      return currentAngle + (remaining / (travelTime(1, bpm, pitch)));
    }
  }

  // 超出砖块范围时"钳位"到 tileAngle
  return currentAngle + Math.max(0, tileAngle - currentAngle);
}

/**
 * 将源谱面的部分事件缝合到目标谱面中
 */
export function stitchLevels(
  sourceLevel: Level,
  sourceRange: [number, number],
  targetLevel: Level,
  targetStartIndex: number,
  selectedEvents: string[],
  filterMode: 'whitelist' | 'blacklist'
): StitchResult {
  const sourceTiming = calculateTiming(sourceLevel);
  const targetTiming = calculateTiming(targetLevel);
  const targetPitch = (targetLevel.settings as any).pitch || 100;

  const [startIdx, endIdx] = sourceRange;
  const sourceStartTime = sourceTiming.tileTimes[startIdx];

  let eventsToTransfer = sourceTiming.eventTimes.filter(
    et => et.tileIndex >= startIdx && et.tileIndex <= endIdx
  );

  if (filterMode === 'whitelist') {
    eventsToTransfer = eventsToTransfer.filter(et => selectedEvents.includes(et.event.eventType));
  } else {
    eventsToTransfer = eventsToTransfer.filter(et => !selectedEvents.includes(et.event.eventType));
  }

  const targetStartTime = targetTiming.tileTimes[targetStartIndex];

  // --- 标签冲突处理 ---
  const targetTags = new Set<string>();
  targetLevel.tiles.forEach(tile => {
    tile.actions?.forEach(a => { if (a.tag) targetTags.add(String(a.tag)); });
    tile.addDecorations?.forEach(d => { if (d.tag) targetTags.add(String(d.tag)); });
  });

  const tagMapping = new Map<string, string>();
  const getUniqueTag = (originalTag: string) => {
    let newTag = originalTag;
    let counter = 1;
    while (targetTags.has(newTag)) {
      newTag = `${originalTag}_S${counter++}`;
    }
    targetTags.add(newTag);
    return newTag;
  };

  const replaceTagsInString = (tagStr: string) => {
    if (!tagStr) return tagStr;
    return tagStr.split(',').map(t => {
      const trimmed = t.trim();
      return tagMapping.get(trimmed) || trimmed;
    }).join(',');
  };
  // ---

  // 2. 迁移事件
  let currentTargetTileIdx = targetStartIndex;
  let tileHitTime = targetTiming.tileTimes[targetStartIndex];
  let currentTileEntryBpm = targetTiming.bpmAtTiles[targetStartIndex];
  let direction = targetTiming.directionsAtTiles[targetStartIndex];

  const debugTransferredEvents: StitchResult['transferredEvents'] = [];

  eventsToTransfer.forEach(et => {
    const relativeTimeFromSourceStart = et.absoluteTime - sourceStartTime;
    const desiredTargetTime = targetStartTime + relativeTimeFromSourceStart;

    // 3. 寻找合适的砖块（使用增量时间计算，与 calculateTiming 一致）
    while (currentTargetTileIdx < targetLevel.tiles.length - 1) {
      const nextTile = targetLevel.tiles[currentTargetTileIdx + 1];
      const tileAngle = nextTile.angle || 0;

      const { totalTime, finalBpm } = computeTileTotalTime(
        targetLevel.tiles[currentTargetTileIdx],
        tileAngle,
        currentTileEntryBpm,
        targetPitch,
      );

      const nextTileArrivalTime = tileHitTime + totalTime;

      if (nextTileArrivalTime > desiredTargetTime + 0.000001) {
        break;
      }

      // 推进到下一个砖块
      currentTargetTileIdx++;
      tileHitTime = nextTileArrivalTime;
      currentTileEntryBpm = finalBpm;

      targetLevel.tiles[currentTargetTileIdx - 1].actions?.forEach((a: any) => {
        if (a.eventType === 'Twirl') direction *= -1;
      });
    }

    // 4. 处理事件内容
    const event = JSON.parse(JSON.stringify(et.event));

    if (event.eventType === 'SetSpeed' && event.speedType === 'Bpm') {
      const sourcePitch = (sourceLevel.settings as any).pitch || 100;
      event.beatsPerMinute = event.beatsPerMinute * (sourcePitch / targetPitch);
    }

    if (event.tag) {
      const originalTags = String(event.tag).split(',').map(t => t.trim());
      const newTags = originalTags.map(t => {
        if (!tagMapping.has(t)) {
          tagMapping.set(t, getUniqueTag(t));
        }
        return tagMapping.get(t);
      });
      event.tag = newTags.join(',');
    }

    ['tag', 'decorationTag', 'trackTag'].forEach(field => {
      if (event[field]) {
        event[field] = replaceTagsInString(String(event[field]));
      }
    });

    // 5. 计算逆向角度偏移与 duration 缩放
    let finalAngleOffset = 0;

    if (et.isDecoration) {
      if (typeof event.duration === 'number') {
        event.duration = event.duration * (currentTileEntryBpm / et.bpm);
      }

      if (!targetLevel.tiles[currentTargetTileIdx].addDecorations) {
        targetLevel.tiles[currentTargetTileIdx].addDecorations = [];
      }
      targetLevel.tiles[currentTargetTileIdx].addDecorations!.push(event);
    } else {
      const timeInTile = desiredTargetTime - tileHitTime;

      finalAngleOffset = computeAngleOffsetOnTile(
        targetLevel.tiles[currentTargetTileIdx],
        timeInTile,
        targetLevel.tiles[currentTargetTileIdx].angle || 0,
        currentTileEntryBpm,
        targetPitch,
      );
      event.angleOffset = finalAngleOffset;

      if (typeof event.duration === 'number') {
        event.duration = event.duration * (currentTileEntryBpm / et.bpm);
      }

      if (!targetLevel.tiles[currentTargetTileIdx].actions) {
        targetLevel.tiles[currentTargetTileIdx].actions = [];
      }
      targetLevel.tiles[currentTargetTileIdx].actions!.push(event);

      // transferred SetSpeed 已存在于 tile.actions 中，
      // computeAngleOffsetOnTile 会读取它们，不需要额外更新状态
    }

    // 记录校验信息
    let actualTargetTime = tileHitTime;
    if (!et.isDecoration) {
      actualTargetTime = tileHitTime + computeAngleOffsetTravelTime(
        targetLevel.tiles[currentTargetTileIdx],
        finalAngleOffset,
        currentTileEntryBpm,
        targetPitch,
      );
    }

    debugTransferredEvents.push({
      eventType: event.eventType,
      sourceTime: et.absoluteTime,
      targetTime: actualTargetTime,
      sourceTileIndex: et.tileIndex,
      targetTileIndex: currentTargetTileIdx,
      targetAngleOffset: finalAngleOffset,
    });
  });

  return {
    level: targetLevel,
    sourceTiming,
    targetTiming,
    transferredEvents: debugTransferredEvents,
  };
}

/**
 * 计算一个给定 angleOffset 的事件在砖块上的绝对时间偏移（从 tileHitTime 算起）
 */
function computeAngleOffsetTravelTime(
  tile: any,
  angleOffset: number,
  initialBpm: number,
  pitch: number,
): number {
  if (angleOffset <= 0) return 0;

  const timingEvents = collectTileEvents(tile);
  const timingOnly = timingEvents.filter(
    e => e.event.eventType === 'SetSpeed' || e.event.eventType === 'Pause' || e.event.eventType === 'Hold'
  );

  let totalTime = 0;
  let currentAngle = 0;
  let bpm = initialBpm;

  for (const entry of timingOnly) {
    const ao = entry.angleOffset;

    if (angleOffset <= currentAngle) break;

    const angleDelta = Math.min(ao, angleOffset) - currentAngle;
    if (angleDelta > 0) {
      totalTime += travelTime(angleDelta, bpm, pitch);
    }
    currentAngle = Math.min(ao, angleOffset);

    if (ao >= angleOffset) break;

    if (entry.event.eventType === 'SetSpeed') {
      if (entry.event.speedType === 'Bpm') bpm = entry.event.beatsPerMinute;
      else bpm *= entry.event.bpmMultiplier;
    } else if (entry.event.eventType === 'Pause') {
      totalTime += pauseTime(entry.event.duration || 0, bpm, pitch);
    } else if (entry.event.eventType === 'Hold') {
      totalTime += holdTime(entry.event.duration || 0, bpm, pitch);
      currentAngle += (entry.event.duration || 0) * 360;
    }
  }

  // 如果 angleOffset 超过了最后一个事件角度，补充剩余行程
  if (angleOffset > currentAngle) {
    totalTime += travelTime(angleOffset - currentAngle, bpm, pitch);
  }

  return totalTime;
}

export function getTileTravelTime(angle: number, bpm: number, pitch: number = 100): number {
  return travelTime(angle, bpm, pitch);
}
