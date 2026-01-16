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
    // 1. 在处理当前砖块的时间前，先检查是否有 SetSpeed 事件改变 BPM
    // 按照用户逻辑：若该砖块存在 SetSpeed 事件，需要先更新 cbpm 后再进行此计算
    tile.actions.forEach(event => {
      if (event.eventType === 'SetSpeed') {
        if (event.speedType === 'Bpm') {
          cbpm = event.beatsPerMinute;
        } else if (event.speedType === 'Multiplier') {
          cbpm = cbpm * event.bpmMultiplier;
        }
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
  allowedEventTypes?: string[]
): Level {
  const sourceTiming = calculateTiming(sourceLevel);
  const targetTiming = calculateTiming(targetLevel);

  const [startIdx, endIdx] = sourceRange;
  const sourceStartTime = sourceTiming.tileTimes[startIdx];

  // 1. 获取源谱面范围内的所有事件，并根据白名单过滤
  let eventsToTransfer = sourceTiming.eventTimes.filter(
    et => et.tileIndex >= startIdx && et.tileIndex <= endIdx
  );

  if (allowedEventTypes) {
    eventsToTransfer = eventsToTransfer.filter(et => allowedEventTypes.includes(et.event.eventType));
  }

  const targetStartTime = targetTiming.tileTimes[targetStartIndex];

  // 2. 将事件迁移到目标谱面
  eventsToTransfer.forEach(et => {
    const relativeTime = et.absoluteTime - sourceStartTime;
    const absoluteTargetTime = targetStartTime + relativeTime;

    // 3. 在目标谱面中寻找该时间戳落在哪一个砖块上
    // 寻找满足 tileTimes[i] <= absoluteTargetTime 的最大 i
    let targetTileIdx = 0;
    for (let i = 0; i < targetTiming.tileTimes.length; i++) {
      if (targetTiming.tileTimes[i] <= absoluteTargetTime + 0.000001) { // 加上微小的 epsilon 处理浮点误差
        targetTileIdx = i;
      } else {
        break;
      }
    }

    // 4. 计算逆向角度偏移 (angleOffset)
    // angleOffset = (absoluteTargetTime - timestack_tile) / (60 / cbpm) * 180
    const targetTileTime = targetTiming.tileTimes[targetTileIdx];
    const targetBpm = targetTiming.bpmAtTiles[targetTileIdx];
    
    const timeInTile = absoluteTargetTime - targetTileTime;
    const angleOffset = (timeInTile / (60 / targetBpm)) * 180;

    // 5. 将事件添加到目标砖块
    const newEvent = { ...et.event, angleOffset };
    
    // 确保 targetLevel.tiles[targetTileIdx].actions 存在
    if (!targetLevel.tiles[targetTileIdx].actions) {
      targetLevel.tiles[targetTileIdx].actions = [];
    }
    
    targetLevel.tiles[targetTileIdx].actions.push(newEvent);
  });

  return targetLevel;
}
