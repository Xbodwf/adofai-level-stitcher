import { Level, Structure } from 'adofai';

export type AdofaiEvent = Structure.AdofaiEvent;

export interface TimingInfo {
  tileTimes: number[];
  eventTimes: { 
    tileIndex: number; 
    event: AdofaiEvent; 
    absoluteTime: number;
    isDecoration?: boolean; // 是否是装饰类事件 (来自 tile.addDecorations)
  }[];
  bpmAtTiles: number[];
}

/**
 * 计算单个砖块在特定状态下的到达时间
 */
export function getTileTravelTime(angle: number, bpm: number): number {
  return (angle / 180) * (60 / bpm);
}

/**
 * 获取砖块上的 Pause 事件造成的总延迟
 */
export function getTilePauseDelay(tile: any, currentBpm: number): { delay: number, finalBpm: number } {
  let delay = 0;
  let bpm = currentBpm;
  tile.actions?.forEach((a: any) => {
    if (a.eventType === 'SetSpeed') {
      if (a.speedType === 'Bpm') bpm = a.beatsPerMinute;
      else if (a.speedType === 'Multiplier') bpm *= a.bpmMultiplier;
    } else if (a.eventType === 'Pause') {
      delay += ((a.duration || 0) * 60) / bpm;
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
  const eventTimes: { event: any; absoluteTime: number; tileIndex: number; isDecoration: boolean }[] = [];
  const bpmAtTiles: number[] = [];

  let currentBpm = level.settings.bpm;
  let currentTime = 0;

  level.tiles.forEach((tile, index) => {
    // 1. 计算到达当前砖块的时间 (T_i = T_{i-1} + D_{i-1} + travel_to_i)
    // 使用进入该砖块时的 BPM (即上一块砖处理完后的 BPM)
    const travelTime = getTileTravelTime(tile.angle || 0, currentBpm);
    currentTime += travelTime;

    // 记录击打时间（到达时间）
    tileTimes.push(currentTime);
    // 记录进入该砖块时的 BPM (用于后续缝合参考)
    bpmAtTiles.push(currentBpm);

    // 2. 更新 BPM (先变速)
    tile.actions?.forEach((event: any) => {
      if (event.eventType === 'SetSpeed') {
        if (event.speedType === 'Bpm') {
          currentBpm = event.beatsPerMinute;
        } else if (event.speedType === 'Multiplier') {
          currentBpm *= event.bpmMultiplier;
        }
      }
    });

    // 3. 处理该砖块上的所有事件 (后偏移)
    // 根据“先变速后偏移”原则，该砖块上所有事件的时间偏移都基于更新后的 currentBpm
    tile.actions?.forEach((event: any) => {
      const angleOffset = event.angleOffset || 0;
      const eventTime = currentTime + getTileTravelTime(angleOffset, currentBpm);
      
      eventTimes.push({
        event: { ...event },
        absoluteTime: eventTime,
        tileIndex: index,
        isDecoration: false
      });
    });

    // 处理装饰类事件
    if (tile.addDecorations) {
      tile.addDecorations.forEach((event: any) => {
        eventTimes.push({
          event: { ...event },
          absoluteTime: currentTime,
          tileIndex: index,
          isDecoration: true
        });
      });
    }

    // 4. 计算 Pause 延迟 (同样基于更新后的 currentBpm)
    let tilePauseDelay = 0;
    tile.actions?.forEach((event: any) => {
      if (event.eventType === 'Pause') {
        tilePauseDelay += ((event.duration || 0) * 60) / currentBpm;
      }
    });

    // 增加 Pause 延迟，这会影响下一个砖块的到达时间
    currentTime += tilePauseDelay;
  });

  return { tileTimes, eventTimes, bpmAtTiles };
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
): Level {
  const sourceTiming = calculateTiming(sourceLevel);
  const targetTiming = calculateTiming(targetLevel);

  const [startIdx, endIdx] = sourceRange;
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

  // 辅助函数：替换字符串中的标签（处理逗号分隔的情况）
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
  let currentTargetBpm = targetTiming.bpmAtTiles[targetStartIndex]; // 当前计算用的 BPM (处理完变速后的)
  let tileHitTime = targetTiming.tileTimes[targetStartIndex]; // 当前砖块的击打时间
  let tilePauseDelay = 0; // 当前砖块上的总 Pause 延迟

  // 初始化砖块状态 (先变速，再算 Pause)
  const initTileState = () => {
    tilePauseDelay = 0;
    // 重新获取进入该砖块时的原始 BPM
    let bpm = targetTiming.bpmAtTiles[currentTargetTileIdx];
    targetLevel.tiles[currentTargetTileIdx].actions?.forEach((a: any) => {
      if (a.eventType === 'SetSpeed') {
        if (a.speedType === 'Bpm') bpm = a.beatsPerMinute;
        else if (a.speedType === 'Multiplier') bpm *= a.bpmMultiplier;
      }
    });
    currentTargetBpm = bpm;

    // 计算 Pause (基于变速后的 BPM)
    targetLevel.tiles[currentTargetTileIdx].actions?.forEach((a: any) => {
      if (a.eventType === 'Pause') {
        tilePauseDelay += ((a.duration || 0) * 60) / currentTargetBpm;
      }
    });
  };
  initTileState();

  eventsToTransfer.forEach(et => {
    const relativeTime = et.absoluteTime - sourceStartTime;
    const desiredTargetTime = targetStartTime + relativeTime;

    // 1. 寻找合适的砖块
    while (currentTargetTileIdx < targetLevel.tiles.length - 1) {
      // 到达下一个砖块的时间 = 当前砖块击打时间 + 当前砖块总 Pause + 到下一块的 Travel
      // 注意：travel 使用的是处理完当前块所有变速后的 BPM
      const nextTile = targetLevel.tiles[currentTargetTileIdx + 1];
      const travelToNext = getTileTravelTime(nextTile.angle || 0, currentTargetBpm);
      const nextTileArrivalTime = tileHitTime + tilePauseDelay + travelToNext;

      if (nextTileArrivalTime > desiredTargetTime + 0.000001) {
        break;
      }

      // 移动到下一个砖块
      tileHitTime = nextTileArrivalTime;
      currentTargetTileIdx++;
      initTileState();
    }

    // --- 特殊处理第 0 个砖块 ---
    // 除非源事件就在第 0 块，否则强制移到第 1 块（使用负角度偏移）
    if (currentTargetTileIdx === 0 && et.tileIndex !== 0 && targetLevel.tiles.length > 1) {
      const currentTile = targetLevel.tiles[0];
      // 注意：这里使用的是进入第 0 块时的原始 BPM 来计算到第 1 块的时间
      const travelTime = getTileTravelTime(currentTile.angle || 0, targetTiming.bpmAtTiles[0]);
      const nextTileArrivalTime = tileHitTime + travelTime;
      
      tileHitTime = nextTileArrivalTime;
      currentTargetTileIdx = 1;
      initTileState(); // 重新同步状态
    }

    // 2. 标签冲突处理与映射
    const event = { ...et.event };
    const decoDeclarationTypes = ['AddDecoration', 'AddObject', 'AddText'];
    
    if (event.tag) {
      const originalTag = String(event.tag);
      if (decoDeclarationTypes.includes(event.eventType)) {
        // 如果是声明类事件，检查冲突并建立映射
        if (targetTags.has(originalTag) && !tagMapping.has(originalTag)) {
          const newTag = getUniqueTag(originalTag);
          tagMapping.set(originalTag, newTag);
          event.tag = newTag;
        } else if (tagMapping.has(originalTag)) {
          // 如果之前已经为此标签建立了映射，使用已有的映射
          event.tag = tagMapping.get(originalTag);
        } else {
          // 无冲突，记录此标签已被占用
          targetTags.add(originalTag);
        }
      } else {
        // 如果是引用类事件，尝试应用映射
        event.tag = replaceTagsInString(originalTag);
      }
    }

    // 3. 计算逆向角度偏移 (angleOffset) 或 直接放入 addDecorations
    if (et.isDecoration) {
      // 装饰类事件直接放入 addDecorations
      if (!targetLevel.tiles[currentTargetTileIdx].addDecorations) {
        targetLevel.tiles[currentTargetTileIdx].addDecorations = [];
      }
      targetLevel.tiles[currentTargetTileIdx].addDecorations!.push(event);
    } else {
      // 普通事件计算 angleOffset (严格使用当前处理完变速后的 BPM)
      const timeInTile = desiredTargetTime - tileHitTime;
      const angleOffset = (timeInTile / (60 / currentTargetBpm)) * 180;
      event.angleOffset = angleOffset;

      if (!targetLevel.tiles[currentTargetTileIdx].actions) {
        targetLevel.tiles[currentTargetTileIdx].actions = [];
      }
      targetLevel.tiles[currentTargetTileIdx].actions.push(event);

      // 4. 如果添加的是 SetSpeed 或 Pause，立即更新当前的状态，影响后续事件的放置
      if (event.eventType === 'SetSpeed') {
        const e = event as any;
        if (e.speedType === 'Bpm') {
          currentTargetBpm = e.beatsPerMinute;
        } else if (e.speedType === 'Multiplier') {
          currentTargetBpm *= e.bpmMultiplier;
        }
      } else if (event.eventType === 'Pause') {
        const e = event as any;
        const duration = e.duration || 0;
        // Pause 增加到累积延迟中，基于当前 BPM (即变速后的)
        tilePauseDelay += (duration * 60) / currentTargetBpm;
      }
    }
  });

  return targetLevel;
}
