import { Level, Structure } from 'adofai';

export type AdofaiEvent = Structure.AdofaiEvent;

export interface TimingInfo {
  tileTimes: number[];
  eventTimes: { 
    tileIndex: number; 
    event: AdofaiEvent; 
    absoluteTime: number;
    bpm: number; // 事件发生时的 BPM
    isDecoration?: boolean; // 是否是装饰类事件 (来自 tile.addDecorations)
  }[];
  bpmAtTiles: number[];
  directionsAtTiles: number[];
  anglesAtTiles: number[];
}

/**
 * 计算单个砖块在特定状态下的到达时间
 */
export function getTileTravelTime(angle: number, bpm: number, pitch: number = 100): number {
  // ADOFAI 时间计算公式: (角度 / 180) * (60 / BPM) * (100 / Pitch)
  return (angle / 180) * (60 / bpm) * (100 / pitch);
}

/**
 * 获取砖块上的 Pause 事件造成的总延迟
 */
export function getTilePauseDelay(tile: any, currentBpm: number, pitch: number = 100): { delay: number, finalBpm: number } {
  let delay = 0;
  let bpm = currentBpm;
  tile.actions?.forEach((a: any) => {
    if (a.eventType === 'SetSpeed') {
      if (a.speedType === 'Bpm') bpm = a.beatsPerMinute;
      else if (a.speedType === 'Multiplier') bpm *= a.bpmMultiplier;
    } else if (a.eventType === 'Pause') {
      delay += ((a.duration || 0) * 60) / bpm * (100 / pitch);
    } else if (a.eventType === 'Hold') {
      // Hold duration 1 adds 360 degrees (2 beats)
      delay += ((a.duration || 0) * 120) / bpm * (100 / pitch);
    }
  });
  return { delay, finalBpm: bpm };
}

/**
 * 计算谱面的时间戳信息
 * @param level ADOFAI Level 对象
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

  level.tiles.forEach((tile, index) => {
    // 1. 记录当前砖块的击打时间
    tileTimes.push(currentTime);
    bpmAtTiles.push(currentBpm);
    directionsAtTiles.push(direction);
    anglesAtTiles.push(tile.angle || 0);

    // 2. 确定该砖块上的最终 BPM (SetSpeed 只影响后续行程和当前砖块的 duration 事件)
    let tileFinalBpm = currentBpm;
    tile.actions?.forEach((event: any) => {
      if (event.eventType === 'SetSpeed') {
        if (event.speedType === 'Bpm') tileFinalBpm = event.beatsPerMinute;
        else if (event.speedType === 'Multiplier') tileFinalBpm *= event.bpmMultiplier;
      }
      if (event.eventType === 'Twirl') {
        direction *= -1;
      }
    });

    // 3. 计算 Pause 和 Hold 延迟 (ADOFAI 逻辑：Pause 作用于当前砖块)
    // 注意：Tile0 不可能有变速和 Pause
    let tilePauseDelay = 0;
    if (index > 0) {
      tile.actions?.forEach((event: any) => {
        if (event.eventType === 'Pause') {
          tilePauseDelay += ((event.duration || 0) * 60) / tileFinalBpm * (100 / pitch);
        } else if (event.eventType === 'Hold') {
          tilePauseDelay += ((event.duration || 0) * 120) / tileFinalBpm * (100 / pitch);
        }
      });
    }

    // 4. 处理该砖块上的所有事件
    const processEvent = (event: any, isDecoration: boolean) => {
      let eventTime = currentTime;
      if (event.angleOffset) {
        // 使用当前砖块的 BPM 计算偏移时间
        const offsetSeconds = (event.angleOffset / 180) * (60 / tileFinalBpm) * (100 / pitch);
        if (event.angleOffset > 0.000001 && tilePauseDelay > 0) {
          eventTime += tilePauseDelay;
        }
        eventTime += offsetSeconds;
      }

      eventTimes.push({
        tileIndex: index,
        event: { ...event },
        absoluteTime: eventTime,
        bpm: tileFinalBpm,
        isDecoration
      });
    };

    tile.actions?.forEach((event: any) => processEvent(event, false));
    tile.addDecorations?.forEach((event: any) => processEvent(event, true));

    // 5. 推进时间到下一个砖块 (使用用户提供的公式: angle * 60 / bpm)
    const nextTile = level.tiles[index + 1];
    if (nextTile) {
      // ADOFAI 逻辑: 下一个砖块的行程时间 = (当前砖块到下个砖块的角度 / 180) * (60 / 当前砖块结束时的 BPM)
      const travelAngle = nextTile.angle || 0;
      const travelTime = (travelAngle / 180) * (60 / tileFinalBpm) * (100 / pitch);
      currentTime += travelTime + tilePauseDelay;
    }
    
    currentBpm = tileFinalBpm;
  });

  return { tileTimes, eventTimes, bpmAtTiles, directionsAtTiles, anglesAtTiles };
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
  // 获取源范围的起始时间（相对于音乐起点）
  const sourceStartTime = sourceTiming.tileTimes[startIdx];

  // 1. 获取源谱面范围内的所有事件，并根据模式过滤
  let eventsToTransfer = sourceTiming.eventTimes.filter(
    et => et.tileIndex >= startIdx && et.tileIndex <= endIdx
  );

  if (filterMode === 'whitelist') {
    eventsToTransfer = eventsToTransfer.filter(et => selectedEvents.includes(et.event.eventType));
  } else {
    eventsToTransfer = eventsToTransfer.filter(et => !selectedEvents.includes(et.event.eventType));
  }

  // 获取目标范围的起始时间（相对于音乐起点）
  const targetStartTime = targetTiming.tileTimes[targetStartIndex];

  // --- 标签冲突处理逻辑 ---
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
  // --- 结束标签冲突处理逻辑 ---

  // 2. 将事件迁移到目标谱面
  let currentTargetTileIdx = targetStartIndex;
  // 追踪目标谱面的状态
  let tileHitTime = targetTiming.tileTimes[targetStartIndex];
  let currentTargetBpm = targetTiming.bpmAtTiles[targetStartIndex];
  let currentAbsAngle = targetTiming.anglesAtTiles[targetStartIndex];
  let direction = targetTiming.directionsAtTiles[targetStartIndex];
  let tilePauseDelay = 0;

  const initTileState = () => {
    const tile = targetLevel.tiles[currentTargetTileIdx];
    const state = getTilePauseDelay(tile, currentTargetBpm, targetPitch);
    tilePauseDelay = state.delay;
  };
  initTileState();

  const debugTransferredEvents: StitchResult['transferredEvents'] = [];

  eventsToTransfer.forEach(et => {
    // 保持相对于起始点的相对时间
    const relativeTimeFromSourceStart = et.absoluteTime - sourceStartTime;
    const desiredTargetTime = targetStartTime + relativeTimeFromSourceStart;

    // 1. 寻找合适的砖块 (优化后的搜索逻辑)
    while (currentTargetTileIdx < targetLevel.tiles.length - 1) {
      const nextTile = targetLevel.tiles[currentTargetTileIdx + 1];
      
      // 使用用户提供的公式: angle * 60 / bpm
      const travelAngle = nextTile.angle || 0;
      const travelTime = (travelAngle / 180) * (60 / currentTargetBpm) * (100 / targetPitch);
      const nextTileArrivalTime = tileHitTime + tilePauseDelay + travelTime;

      // 如果下一个砖块的到达时间晚于目标时间，说明当前砖块就是合适的
      if (nextTileArrivalTime > desiredTargetTime + 0.000001) {
        break;
      }

      // 移动到下一个砖块，并更新状态
      currentTargetTileIdx++;
      tileHitTime = nextTileArrivalTime;
      
      // 更新进入新砖块前的 BPM 和方向 (基于刚经过的砖块)
      const prevState = getTilePauseDelay(targetLevel.tiles[currentTargetTileIdx - 1], currentTargetBpm, targetPitch);
      currentTargetBpm = prevState.finalBpm;
      
      // 更新方向
      targetLevel.tiles[currentTargetTileIdx - 1].actions?.forEach((a: any) => {
        if (a.eventType === 'Twirl') direction *= -1;
      });

      initTileState();
    }

    // 2. 处理事件内容
    const event = JSON.parse(JSON.stringify(et.event));
    
    // 处理 SetSpeed 的 BPM 缩放 (考虑 Pitch)
    if (event.eventType === 'SetSpeed' && event.speedType === 'Bpm') {
      const sourcePitch = (sourceLevel.settings as any).pitch || 100;
      const targetPitch = (targetLevel.settings as any).pitch || 100;
      event.beatsPerMinute = event.beatsPerMinute * (sourcePitch / targetPitch);
    }
    
    // 处理标签映射
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

    // 处理 MoveDecorations/MoveTrack 等引用标签的字段
    ['tag', 'decorationTag', 'trackTag'].forEach(field => {
      if (event[field]) {
        event[field] = replaceTagsInString(String(event[field]));
      }
    });

    // 3. 计算逆向角度偏移 (angleOffset) 与 Duration 缩放
    let finalAngleOffset = 0;
    if (et.isDecoration) {
      // 装饰类事件通常没有 angleOffset，直接处理 duration
      if (typeof event.duration === 'number') {
        event.duration = event.duration * (currentTargetBpm / et.bpm);
      }
      
      if (!targetLevel.tiles[currentTargetTileIdx].addDecorations) {
        targetLevel.tiles[currentTargetTileIdx].addDecorations = [];
      }
      targetLevel.tiles[currentTargetTileIdx].addDecorations!.push(event);
    } else {
      let timeInTile = desiredTargetTime - tileHitTime;
      
      // 如果目标时间晚于击打时间，需要扣除 Pause 延迟后再计算角度
      if (timeInTile > 0.000001) {
        timeInTile = Math.max(0, timeInTile - tilePauseDelay);
      }

      // 逆向计算角度: (time / ((60/BPM) * (100/Pitch))) * 180
      finalAngleOffset = (timeInTile / ((60 / currentTargetBpm) * (100 / targetPitch))) * 180;
      event.angleOffset = finalAngleOffset;

      // 缩放 duration (如果存在)
      if (typeof event.duration === 'number') {
        event.duration = event.duration * (currentTargetBpm / et.bpm);
      }

      if (!targetLevel.tiles[currentTargetTileIdx].actions) {
        targetLevel.tiles[currentTargetTileIdx].actions = [];
      }
      targetLevel.tiles[currentTargetTileIdx].actions!.push(event);

      // 如果转移了变速或暂停事件，立即更新目标谱面的实时计算状态
      // 这样后续在同一砖块 or 后续砖块上的事件计算会基于更新后的 BPM/Pause
      if (event.eventType === 'SetSpeed') {
        if (event.speedType === 'Bpm') {
          currentTargetBpm = event.beatsPerMinute;
        } else if (event.speedType === 'Multiplier') {
          currentTargetBpm *= event.bpmMultiplier;
        }
      } else if (event.eventType === 'Pause') {
        tilePauseDelay += ((event.duration || 0) * 60) / currentTargetBpm * (100 / targetPitch);
      }
    }

    // 记录实际计算出的目标时间，用于校验
    let actualTargetTime = tileHitTime;
    if (!et.isDecoration) {
      const travelTime = (finalAngleOffset / 180) * (60 / currentTargetBpm) * (100 / targetPitch);
      actualTargetTime += travelTime;
      // 如果有角度偏移，说明它在击打之后，所以要加上该砖块的暂停延迟
      if (finalAngleOffset > 0.000001) {
        actualTargetTime += tilePauseDelay;
      }
    }

    debugTransferredEvents.push({
      eventType: event.eventType,
      sourceTime: et.absoluteTime,
      targetTime: actualTargetTime,
      sourceTileIndex: et.tileIndex,
      targetTileIndex: currentTargetTileIdx,
      targetAngleOffset: finalAngleOffset
    });
  });

  return {
    level: targetLevel,
    sourceTiming,
    targetTiming,
    transferredEvents: debugTransferredEvents
  };
}
