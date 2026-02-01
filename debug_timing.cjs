const fs = require('fs');

function getTileTravelTime(angle, bpm, pitch) {
  if (angle === 0 || angle === 360 || angle === 999) return 0;
  return (Math.abs(angle) / 180) * (60 / bpm) * (100 / pitch);
}

function calculateTimingDebug(level, targetIndex) {
  const settings = level.settings;
  const initialBpm = settings.bpm || 100;
  const pitch = settings.pitch || 100;
  
  let currentTime = (settings.offset || 0) / 1000;
  let currentBpm = initialBpm;

  console.log(`Initial Offset: ${currentTime}s`);
  console.log(`Initial BPM: ${currentBpm}`);

  for (let i = 0; i < level.tiles.length; i++) {
    const tile = level.tiles[i];
    
    let tileFinalBpm = currentBpm;
    tile.actions?.forEach((event) => {
      if (event.eventType === 'SetSpeed') {
        if (event.speedType === 'Bpm') tileFinalBpm = event.beatsPerMinute;
        else if (event.speedType === 'Multiplier') tileFinalBpm *= event.bpmMultiplier;
      }
    });

    let tilePauseDelay = 0;
    tile.actions?.forEach((event) => {
      if (event.eventType === 'Pause') {
        tilePauseDelay += ((event.duration || 0) * 60) / tileFinalBpm * (100 / pitch);
      }
    });

    if (i === targetIndex) {
      console.log(`Tile ${i} Arrival Time: ${currentTime}s`);
      console.log(`Tile ${i} Final BPM: ${tileFinalBpm}`);
      console.log(`Tile ${i} Pause Delay: ${tilePauseDelay}`);
      return currentTime;
    }

    const nextTile = level.tiles[i + 1];
    if (nextTile) {
      let travelAngle = nextTile.angle || 0;
      if (travelAngle === 999) travelAngle = 0;
      
      const travelTime = (Math.abs(travelAngle) / 180) * (60 / tileFinalBpm) * (100 / pitch);
      currentTime += travelTime + tilePauseDelay;
    }

    currentBpm = tileFinalBpm;
  }
}

function parseAdofai(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
        // Clean up common ADOFAI non-standard JSON issues
        let cleaned = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        // Remove trailing commas before ] or }
        cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
        
        const data = JSON.parse(cleaned);
        const tiles = data.angleData.map((angle) => ({ angle, actions: [], addDecorations: [] }));
        data.actions.forEach((action) => {
            if (tiles[action.floor]) {
                tiles[action.floor].actions.push(action);
            }
        });
        return { settings: data.settings, tiles };
    } catch (e) {
        console.error("Failed to parse " + filePath, e.message);
        return null;
    }
}

const levelSource = parseAdofai('i:/Desktop/.New/adofai-level-stitcher/tests/deltaLevels/level.adofai');
const levelDist = parseAdofai('i:/Desktop/.New/adofai-level-stitcher/tests/deltaLevels/saved_processed.adofai');

if (levelSource) {
    console.log("--- Source Level (level.adofai) ---");
    calculateTimingDebug(levelSource, 87);
}

if (levelDist) {
    console.log("--- Dist Level (saved_processed.adofai) ---");
    calculateTimingDebug(levelDist, 103);
}
