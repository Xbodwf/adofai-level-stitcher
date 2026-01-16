import { Level, Structure } from 'adofai';

export type AdofaiEvent = Structure.AdofaiEvent;

export interface TimingInfo {
  tileTimes: number[];
  eventTimes: { tileIndex: number; event: AdofaiEvent; absoluteTime: number }[];
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
  const eventTimes: { tileIndex: number; event: AdofaiEvent; absoluteTime: number }[] = [];
  const bpmAtTiles: number[] = [];

  level.tiles.forEach((tile, index) => {
    // 1. 在处理当前砖块的时间前，先检查是否有 SetSpeed 或 Pause 事件改变时间或 BPM
    // 按照用户逻辑：若该砖块存在 SetSpeed 事件，需要先更新 cbpm 后再进行此计算
    // 按照用户逻辑：Pause 如果在遍历过程中遇到此事件，那么将 timestack += event.duration * 60/bpm
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

    // 3. 计算当前砖块上所有事件的绝对时间戳
    tile.actions.forEach(event => {
      const angleOffset = event.angleOffset || 0;
      // timestack_event = timestack_tile + event.angleOffset / 180 * 60 / cbpm
      const eventTime = timestack + (angleOffset / 180) * (60 / cbpm);
      eventTimes.push({
        tileIndex: index,
        event: { ...event }, // 克隆事件
        absoluteTime: eventTime
      });
    });

    // 4. 更新 timestack 供下一个砖块使用
    // timestack += level.tiles[index].angle / 180 * 60 / cbpm
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
      nextTile.actions.forEach(a => {
        if (a.eventType === 'SetSpeed') {
          if (a.speedType === 'Bpm') nextTileBpm = a.beatsPerMinute;
          else if (a.speedType === 'Multiplier') nextTileBpm *= a.bpmMultiplier;
        } else if (a.eventType === 'Pause') {
          nextTilePauseDelay += ((a.duration || 0) * 60) / nextTileBpm;
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

    // 2. 计算逆向角度偏移 (angleOffset)
    // angleOffset = (absoluteTargetTime - timestack_tile) / (60 / cbpm) * 180
    const timeInTile = desiredTargetTime - currentTargetTileTime;
    const angleOffset = (timeInTile / (60 / currentTargetBpm)) * 180;

    // 3. 将事件添加到目标砖块
    const newEvent = { ...et.event, angleOffset };
    
    if (!targetLevel.tiles[currentTargetTileIdx].actions) {
      targetLevel.tiles[currentTargetTileIdx].actions = [];
    }
    
    targetLevel.tiles[currentTargetTileIdx].actions.push(newEvent);

    // 4. 如果添加的是 SetSpeed 或 Pause，立即更新当前的状态，影响后续事件的放置
    if (newEvent.eventType === 'SetSpeed') {
      const e = newEvent as any;
      if (e.speedType === 'Bpm') {
        currentTargetBpm = e.beatsPerMinute;
      } else if (e.speedType === 'Multiplier') {
        currentTargetBpm *= e.bpmMultiplier;
      }
    } else if (newEvent.eventType === 'Pause') {
      const e = newEvent as any;
      const duration = e.duration || 0;
      const pauseTime = (duration * 60) / currentTargetBpm;
      currentTargetTileTime += pauseTime;
    }
  });

  return targetLevel;
}
