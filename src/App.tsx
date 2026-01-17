import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Paper, 
  Stack,
  TextField,
  Alert,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Divider,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FilterListIcon from '@mui/icons-material/FilterList';
import InfoIcon from '@mui/icons-material/Info';
import { Level, Parsers } from 'adofai';
import { stitchLevels } from './utils/stitcher';

const GAMEPLAY_EVENTS = [
  'SetSpeed', 'Twirl', 'Checkpoint', 'Pause', 'AutoPlayTiles', 
  'MultiPlanet', 'FreeRoam', 'FreeRoamTwirl', 'FreeRoamRemove', 
  'Hide', 'ScaleMargin', 'ScaleRadius'
];

const SPECIAL_DECO_EVENTS = [
  'AddDecoration', 'AddObject', 'AddText'
];

const ALL_EVENTS = [ 
  ...GAMEPLAY_EVENTS,
  ...SPECIAL_DECO_EVENTS,
  'SetHitsound', 'PlaySound', 'SetPlanetRotation', 
  'ScalePlanets', 'ColorTrack', 'AnimateTrack', 'RecolorTrack', 'MoveTrack', 
  'PositionTrack', 'MoveDecorations', 'SetText', 'SetObject', 'SetDefaultText', 
  'CustomBackground', 'Flash', 'MoveCamera', 'SetFilter','SetFilterAdvanced','HallofMirrors', 
  'ShakeScreen', 'Bloom', 'ScreenTile', 'ScreenScroll', 'SetFrameRate', 
  'RepeatEvents', 'SetConditionalEvents', 'EditorComment', 'Bookmark', 'Hold', 
  'SetHoldSound'
];

const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

function App() {
  // 源谱面 (第一个文件)
  const [sourceLevel, setSourceLevel] = useState<Level | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [sourceStartTile, setSourceStartTile] = useState<number>(0);
  const [sourceEndTile, setSourceEndTile] = useState<number>(0);

  // 目标谱面 (第二个文件)
  const [targetLevel, setTargetLevel] = useState<Level | null>(null);
  const [targetFileName, setTargetFileName] = useState<string>('');
  const [targetStartTile, setTargetStartTile] = useState<number>(0);

  // 事件过滤
  const [selectedEvents, setSelectedEvents] = useState<string[]>(GAMEPLAY_EVENTS);
  const [filterMode, setFilterMode] = useState<'whitelist' | 'blacklist'>('blacklist');

  const [error, setError] = useState<string | null>(null);

  const handleToggleEvent = (event: string) => {
    setSelectedEvents(prev => 
      prev.includes(event) 
        ? prev.filter(e => e !== event) 
        : [...prev, event]
    );
  };

  const handleSelectAll = () => setSelectedEvents(ALL_EVENTS);
  const handleSelectNone = () => setSelectedEvents([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, isSource: boolean) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isSource) {
      setSourceFileName(file.name);
    } else {
      setTargetFileName(file.name);
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const newLevel = new Level(content, new Parsers.StringParser());
        await newLevel.load();
        
        if (isSource) {
          setSourceLevel(newLevel);
          setSourceEndTile(newLevel.tiles.length - 1);
        } else {
          setTargetLevel(newLevel);
        }
      } catch (err) {
        console.error(err);
        setError(`无法解析文件 ${file.name}，请确保格式正确。`);
      }
    };
    reader.readAsText(file);
  };

  const handleStitch = () => {
    if (!sourceLevel || !targetLevel) return;

    try {
      // 深度克隆 targetLevel 以免修改原始状态
      const targetContent = targetLevel.export('string', 0, true, '\t', 1) as string;
      const clonedTarget = new Level(targetContent, new Parsers.StringParser());
      clonedTarget.load().then(() => {
        const stitchedLevel = stitchLevels(
          sourceLevel,
          [sourceStartTile, sourceEndTile],
          clonedTarget,
          targetStartTile,
          selectedEvents,
          filterMode
        );

        // 导出并下载
        const result = stitchedLevel.export('string', 0, true, '\t', 1) as string;
        const blob = new Blob([result], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stitched_${targetFileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error(err);
      setError('缝合过程中出错。');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary" sx={{ fontWeight: 'bold' }}>
          ADOFAI Level Stitcher
        </Typography>
        
        <Stack spacing={3}>
          {/* 源谱面部分 */}
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ContentCopyIcon color="primary" /> 1. 选择源谱面 (复制来源)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: sourceLevel ? 3 : 0 }}>
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                sx={{ borderRadius: 2 }}
              >
                导入源谱面
                <input
                  type="file"
                  hidden
                  accept=".adofai,.json"
                  onChange={(e) => handleFileUpload(e, true)}
                />
              </Button>
              <Typography variant="body1" color="textSecondary">
                {sourceFileName || '未选择文件'}
              </Typography>
            </Box>

            {sourceLevel && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  谱面共有 {sourceLevel.tiles.length} 个砖块
                </Typography>
                <Stack direction="row" spacing={3}>
                  <TextField
                    label="开始砖块索引"
                    type="number"
                    size="small"
                    value={sourceStartTile}
                    onChange={(e) => setSourceStartTile(Math.max(0, Math.min(sourceLevel.tiles.length - 1, parseInt(e.target.value) || 0)))}
                    fullWidth
                  />
                  <TextField
                    label="结束砖块索引"
                    type="number"
                    size="small"
                    value={sourceEndTile}
                    onChange={(e) => setSourceEndTile(Math.max(sourceStartTile, Math.min(sourceLevel.tiles.length - 1, parseInt(e.target.value) || 0)))}
                    fullWidth
                  />
                </Stack>
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(33, 150, 243, 0.08)', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary">
                    已选择范围: {sourceStartTile} - {sourceEndTile} (共 {sourceEndTile - sourceStartTile + 1} 个砖块的事件)
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>

          {/* 事件过滤部分 */}
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterListIcon color="primary" /> 2. 事件过滤设置
              </Typography>
              <ToggleButtonGroup
                value={filterMode}
                exclusive
                onChange={(_, mode) => mode && setFilterMode(mode)}
                size="small"
                color="primary"
              >
                <ToggleButton value="blacklist">黑名单模式</ToggleButton>
                <ToggleButton value="whitelist">白名单模式</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} icon={<InfoIcon />}>
              {filterMode === 'blacklist' 
                ? "黑名单模式：勾选的事件将【不会】被缝合。建议用于排除装饰类事件。" 
                : "白名单模式：只有勾选的事件才【会被】缝合。建议用于只提取特定逻辑。"}
            </Alert>

            <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button size="small" variant="outlined" onClick={handleSelectAll}>全选</Button>
              <Button size="small" variant="outlined" onClick={handleSelectNone}>全不选</Button>
              <Typography variant="caption" sx={{ ml: 'auto' }}>
                已选择 {selectedEvents.length} / {ALL_EVENTS.length} 种事件
              </Typography>
            </Box>
            <Box sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #eee', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold', mt: 1 }}>
                🎮 玩法类事件 (默认勾选)
              </Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {GAMEPLAY_EVENTS.map(ev => (
                  <Grid item xs={6} sm={4} key={ev}>
                    <FormControlLabel
                      control={
                        <Checkbox 
                          size="small"
                          checked={selectedEvents.includes(ev)} 
                          onChange={() => handleToggleEvent(ev)} 
                          color={filterMode === 'blacklist' ? 'error' : 'primary'}
                        />
                      }
                      label={<Typography variant="body2">{ev}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="secondary" gutterBottom sx={{ fontWeight: 'bold' }}>
                ✨ 特殊事件 (影响装饰物去留)
              </Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {SPECIAL_DECO_EVENTS.map(ev => (
                  <Grid item xs={6} sm={4} key={ev}>
                    <FormControlLabel
                      control={
                        <Checkbox 
                          size="small"
                          checked={selectedEvents.includes(ev)} 
                          onChange={() => handleToggleEvent(ev)} 
                          color={filterMode === 'blacklist' ? 'error' : 'secondary'}
                        />
                      }
                      label={<Typography variant="body2">{ev}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 'bold' }}>
                📝 其他事件
              </Typography>
              <Grid container spacing={1}>
                {ALL_EVENTS.filter(ev => !GAMEPLAY_EVENTS.includes(ev) && !SPECIAL_DECO_EVENTS.includes(ev)).map(ev => (
                  <Grid item xs={6} sm={4} key={ev}>
                    <FormControlLabel
                      control={
                        <Checkbox 
                          size="small"
                          checked={selectedEvents.includes(ev)} 
                          onChange={() => handleToggleEvent(ev)} 
                          color={filterMode === 'blacklist' ? 'error' : 'primary'}
                        />
                      }
                      label={<Typography variant="body2">{ev}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>

          {/* 目标谱面部分 */}
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SaveIcon color="primary" /> 3. 选择目标谱面 (粘贴目的地)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, mb: targetLevel ? 3 : 0 }}>
              <Button
                component="label"
                variant="contained"
                color="secondary"
                startIcon={<CloudUploadIcon />}
                sx={{ borderRadius: 2 }}
              >
                导入目标谱面
                <input
                  type="file"
                  hidden
                  accept=".adofai,.json"
                  onChange={(e) => handleFileUpload(e, false)}
                />
              </Button>
              <Typography variant="body1" color="textSecondary">
                {targetFileName || '未选择文件'}
              </Typography>
            </Box>

            {targetLevel && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  谱面共有 {targetLevel.tiles.length} 个砖块
                </Typography>
                <TextField
                  label="插入位置 (目标砖块索引)"
                  type="number"
                  size="small"
                  value={targetStartTile}
                  onChange={(e) => setTargetStartTile(Math.max(0, Math.min(targetLevel.tiles.length - 1, parseInt(e.target.value) || 0)))}
                  fullWidth
                  helperText="源谱面的事件将从该砖块的时间点开始粘贴"
                />
              </Box>
            )}
          </Paper>

          {/* 操作按钮 */}
          {sourceLevel && targetLevel && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="contained"
                size="large"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleStitch}
                sx={{ px: 8, py: 1.5, borderRadius: 10, fontWeight: 'bold', fontSize: '1.1rem', boxShadow: 4 }}
              >
                开始缝合并导出
              </Button>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
        </Stack>
      </Container>
    </ThemeProvider>
  );
}

export default App;
