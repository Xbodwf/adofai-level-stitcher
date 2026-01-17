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
 * 计算谱面的时间戳信息
 * @param level ADOFAI Level 对象
 */
export function calculateTiming(level: Level): TimingInfo {
  let timestack = 0;
  let cbpm = level.settings.bpm;
  const tileTimes: number[] = [];
  const eventTimes: { 
    tileIndex: number; 
    event: AdofaiEvent; 
    absoluteTime: number;
    isDecoration?: boolean;
  }[] = [];
  const bpmAtTiles: number[] = [];

  level.tiles.forEach((tile, index) => {
    // 1. 在处理当前砖块的时间前，先检查是否有 SetSpeed 或 Pause 事件改变时间或 BPM
    tile.actions.forEach(event => {
      if (event.eventType === 'SetSpeed') {
        if (event.speedType === 'Bpm') {
          cbpm = event.beatsPerMinute;
        } else if (event.speedType === 'Multiplier') {
          cbpm = cbpm * event.bpmMultiplier;
        }
      } else if (event.eventType === 'Pause') {
        const duration = event.duration || 0;
        timestack += (duration * 60) / cbpm;
      }
    });

    // 记录当前砖块的 BPM
    bpmAtTiles.push(cbpm);

    // 2. 记录当前砖块的时间戳
    tileTimes.push(timestack);

    // 3. 计算当前砖块上所有普通事件的绝对时间戳
    tile.actions.forEach(event => {
      const angleOffset = event.angleOffset || 0;
      const eventTime = timestack + (angleOffset / 180) * (60 / cbpm);
      eventTimes.push({
        tileIndex: index,
        event: { ...event },
        absoluteTime: eventTime,
        isDecoration: false
      });
    });

    // 4. 处理装饰类事件 (来自 tile.addDecorations)
    // 装饰类事件没有 angleOffset，时间戳即为砖块时间戳
    if (tile.addDecorations) {
      tile.addDecorations.forEach(event => {
        eventTimes.push({
          tileIndex: index,
          event: { ...event },
          absoluteTime: timestack,
          isDecoration: true
        });
      });
    }

    // 5. 更新 timestack 供下一个砖块使用
    const angle = tile.angle || 0;
    timestack += (angle / 180) * (60 / cbpm);
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
  let currentTargetBpm = targetTiming.bpmAtTiles[targetStartIndex];
  let currentTargetTileTime = targetTiming.tileTimes[targetStartIndex];

  eventsToTransfer.forEach(et => {
    const relativeTime = et.absoluteTime - sourceStartTime;
    const desiredTargetTime = targetStartTime + relativeTime;

    // 1. 寻找合适的砖块：前进 currentTargetTileIdx 直到下一个砖块的“击打时间”超过 desiredTargetTime
    while (currentTargetTileIdx < targetLevel.tiles.length - 1) {
      const currentTile = targetLevel.tiles[currentTargetTileIdx];
      const angle = currentTile.angle || 0;
      const travelTime = (angle / 180) * (60 / currentTargetBpm);
      
      // 下一个砖块的基础到达时间
      const nextTileArrivalTime = currentTargetTileTime + travelTime;
      
      // 计算下一个砖块上的原有 Pause 导致的额外延迟
      let nextTilePauseDelay = 0;
      let nextTileBpm = currentTargetBpm;
      
      const nextTile = targetLevel.tiles[currentTargetTileIdx + 1];
      nextTile.actions?.forEach(a => {
        if (a.eventType === 'SetSpeed') {
          const e = a as any;
          if (e.speedType === 'Bpm') nextTileBpm = e.beatsPerMinute;
          else if (e.speedType === 'Multiplier') nextTileBpm *= e.bpmMultiplier;
        } else if (a.eventType === 'Pause') {
          const e = a as any;
          nextTilePauseDelay += ((e.duration || 0) * 60) / nextTileBpm;
        }
      });

      const nextTileHitTime = nextTileArrivalTime + nextTilePauseDelay;

      if (nextTileHitTime > desiredTargetTime + 0.000001) {
        break;
      }

      // 移动到下一个砖块
      currentTargetTileTime = nextTileHitTime;
      currentTargetBpm = nextTileBpm;
      currentTargetTileIdx++;
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
      // 普通事件计算 angleOffset
      const timeInTile = desiredTargetTime - currentTargetTileTime;
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
        const pauseTime = (duration * 60) / currentTargetBpm;
        currentTargetTileTime += pauseTime;
      }
    }
  });

  return targetLevel;
}
