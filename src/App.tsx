import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FilterListIcon from '@mui/icons-material/FilterList';
import InfoIcon from '@mui/icons-material/Info';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GitHubIcon from '@mui/icons-material/GitHub';
import LanguageIcon from '@mui/icons-material/Language';
import { Level, Parsers } from 'adofai';
import { stitchLevels, type StitchResult } from './utils/stitcher';

// 扩展 MUI Palette 类型以支持 M3 容器颜色
declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary'];
    surfaceVariant: Palette['primary'];
  }
  interface PaletteOptions {
    tertiary?: PaletteOptions['primary'];
    surfaceVariant?: PaletteOptions['primary'];
  }
  interface PaletteColor {
    container?: string;
    onContainer?: string;
    onSurfaceVariant?: string;
  }
  interface SimplePaletteColorOptions {
    container?: string;
    onContainer?: string;
    onSurfaceVariant?: string;
  }
}

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

const m3Theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0061A4', // M3 Blue Primary
      container: '#D1E4FF',
      onContainer: '#001D36',
    },
    secondary: {
      main: '#535F70', // M3 Blue-Grey Secondary
      container: '#D7E3F7',
      onContainer: '#101C2B',
    },
    tertiary: {
      main: '#6B5778',
      container: '#F2DAFF',
      onContainer: '#251431',
    },
    error: {
      main: '#BA1A1A',
      container: '#FFDAD6',
      onContainer: '#410002',
    },
    background: {
      default: '#F8F9FF', // M3 Surface
      paper: '#FFFFFF',
    },
    surfaceVariant: {
      main: '#E1E2E9',
      onSurfaceVariant: '#43474E',
    },
    text: {
      primary: '#191C1E',
      secondary: '#43474E',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Segoe UI", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 500, letterSpacing: '-0.02em' },
    h3: { fontSize: '2.25rem', fontWeight: 500, letterSpacing: '-0.01em' },
    h4: { fontSize: '2rem', fontWeight: 500, letterSpacing: '-0.01em' },
    h6: { fontSize: '1.25rem', fontWeight: 500 },
    subtitle1: { fontSize: '1rem', fontWeight: 500 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 500, borderRadius: 28 },
  },
  shape: {
    borderRadius: 24,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 28, // Pill shape
          padding: '10px 24px',
          boxShadow: 'none',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': {
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          },
        },
        containedPrimary: {
          backgroundColor: '#0061A4',
          color: '#FFFFFF',
          '&:hover': { backgroundColor: '#004A7D' },
        },
        containedSecondary: {
          backgroundColor: '#D7E3F7',
          color: '#101C2B',
          '&:hover': { backgroundColor: '#C1D5EE' },
        },
        outlinedSecondary: {
          borderColor: '#74777F',
          color: '#43474E',
          '&:hover': { borderColor: '#43474E', backgroundColor: 'rgba(67, 71, 78, 0.04)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 32, // More rounded for Android 14
          boxShadow: 'none',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E1E2E9',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        elevation3: {
          border: 'none',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)',
          '&:hover': {
            boxShadow: '0 12px 24px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.03)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'filled',
      },
      styleOverrides: {
        root: {
          '& .MuiFilledInput-root': {
            borderRadius: '16px 16px 0 0',
            backgroundColor: '#F0F0F3',
            '&:before': { borderBottom: '1px solid #74777F' },
            '&:hover': { backgroundColor: '#E1E2E9' },
            '&.Mui-focused': { backgroundColor: '#E1E2E9' },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          padding: '12px',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          '&.Mui-selected': { color: '#0061A4' },
        },
      },
    },
  },
});

function App() {
  const { t } = useTranslation();
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);

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
  const [stitchResult, setStitchResult] = useState<StitchResult | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugTab, setDebugTab] = useState(0);

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
        setError(t('errors.parse', { name: file.name }));
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
        const result = stitchLevels(
          sourceLevel,
          [sourceStartTile, sourceEndTile],
          clonedTarget,
          targetStartTile,
          selectedEvents,
          filterMode
        );

        setStitchResult(result);

        // 导出并下载
        const exportedStr = result.level.export('string', 0, true, '\t', 1) as string;
        const blob = new Blob([exportedStr], { type: 'application/json' });
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
      setError(t('errors.stitch'));
    }
  };

  const handleLangClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setLangAnchorEl(event.currentTarget);
  };

  const handleLangClose = (lang?: string) => {
    if (lang) {
      i18next.changeLanguage(lang);
    }
    setLangAnchorEl(null);
  };

  return (
    <ThemeProvider theme={m3Theme}>
      <CssBaseline />
      <Box sx={{ 
        background: 'linear-gradient(180deg, #F0F4F8 0%, #F8F9FF 100%)',
        minHeight: '100vh', 
        py: 8 
      }}>
        <Container maxWidth="md">
          {/* Header with Language and GitHub */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1 }}>
            <Tooltip title="Switch Language">
              <IconButton onClick={handleLangClick} color="primary" sx={{ bgcolor: 'primary.container' }}>
                <LanguageIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={langAnchorEl}
              open={Boolean(langAnchorEl)}
              onClose={() => handleLangClose()}
            >
              <MenuItem onClick={() => handleLangClose('zh')}>简体中文</MenuItem>
              <MenuItem onClick={() => handleLangClose('en')}>English</MenuItem>
              <MenuItem onClick={() => handleLangClose('ja')}>日本語</MenuItem>
              <MenuItem onClick={() => handleLangClose('ko')}>한국어</MenuItem>
            </Menu>
            
            <Tooltip title={t('github')}>
              <IconButton 
                component="a" 
                href="https://github.com/Xbodwf/adofai-level-stitcher" 
                target="_blank"
                color="primary" 
                sx={{ bgcolor: 'primary.container' }}
              >
                <GitHubIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ 
            color: 'primary.main', 
            fontWeight: 700, 
            mb: 8,
            letterSpacing: '-0.03em'
          }}>
            {t('title')}
          </Typography>
          
          <Stack spacing={4}>
            {/* 错误提示 */}
            {error && (
              <Alert severity="error" sx={{ borderRadius: 4, mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* 源谱面部分 */}
            <Paper elevation={3} sx={{ p: 5 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2.5, color: 'text.primary', mb: 4, fontWeight: 600 }}>
                <Box sx={{ bgcolor: 'primary.container', p: 1.5, borderRadius: 4, display: 'flex' }}>
                  <ContentCopyIcon sx={{ color: 'primary.onContainer', fontSize: 24 }} />
                </Box>
                {t('source.title')}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: sourceLevel ? 4 : 0 }}>
                <Button
                  component="label"
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                >
                  {t('source.import')}
                  <input
                    type="file"
                    hidden
                    accept=".adofai,.json"
                    onChange={(e) => handleFileUpload(e, true)}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {sourceFileName || t('source.noFile')}
                </Typography>
              </Box>

              {sourceLevel && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {t('source.tilesCount', { count: sourceLevel.tiles.length })}
                  </Typography>
                  <Stack direction="row" spacing={3}>
                    <TextField
                      label={t('source.startIndex')}
                      type="number"
                      value={sourceStartTile}
                      onChange={(e) => setSourceStartTile(Math.max(0, Math.min(sourceLevel.tiles.length - 1, parseInt(e.target.value) || 0)))}
                      fullWidth
                    />
                    <TextField
                      label={t('source.endIndex')}
                      type="number"
                      value={sourceEndTile}
                      onChange={(e) => setSourceEndTile(Math.max(sourceStartTile, Math.min(sourceLevel.tiles.length - 1, parseInt(e.target.value) || 0)))}
                      fullWidth
                    />
                  </Stack>
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.container', borderRadius: 4 }}>
                    <Typography variant="subtitle2" sx={{ color: 'primary.onContainer' }}>
                      {t('source.selectedRange', { start: sourceStartTile, end: sourceEndTile, count: sourceEndTile - sourceStartTile + 1 })}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>

            {/* 事件过滤部分 */}
            <Paper elevation={3} sx={{ p: 5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 2.5, color: 'text.primary', fontWeight: 600 }}>
                  <Box sx={{ bgcolor: 'secondary.container', p: 1.5, borderRadius: 4, display: 'flex' }}>
                    <FilterListIcon sx={{ color: 'secondary.onContainer', fontSize: 24 }} />
                  </Box>
                  {t('filter.title')}
                </Typography>
                <ToggleButtonGroup
                  value={filterMode}
                  exclusive
                  onChange={(_, mode) => mode && setFilterMode(mode)}
                  size="small"
                  color="primary"
                  sx={{ bgcolor: 'background.default', borderRadius: 4 }}
                >
                  <ToggleButton value="blacklist" sx={{ px: 2, borderRadius: '16px 0 0 16px' }}>{t('filter.blacklist')}</ToggleButton>
                  <ToggleButton value="whitelist" sx={{ px: 2, borderRadius: '0 16px 16px 0' }}>{t('filter.whitelist')}</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Alert severity="info" sx={{ mb: 4, borderRadius: 4, bgcolor: 'secondary.container', color: 'secondary.onContainer' }} icon={<InfoIcon />}>
                {filterMode === 'blacklist' 
                  ? t('filter.blacklistInfo')
                  : t('filter.whitelistInfo')}
              </Alert>

              <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button size="small" onClick={handleSelectAll} sx={{ bgcolor: 'secondary.container', color: 'secondary.onContainer', '&:hover': { bgcolor: 'secondary.main', color: 'white' } }}>{t('filter.selectAll')}</Button>
                <Button size="small" onClick={handleSelectNone} sx={{ bgcolor: 'secondary.container', color: 'secondary.onContainer', '&:hover': { bgcolor: 'secondary.main', color: 'white' } }}>{t('filter.selectNone')}</Button>
                <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
                  {t('filter.selectedCount', { selected: selectedEvents.length, total: ALL_EVENTS.length })}
                </Typography>
              </Box>
              
              <Box sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid', borderColor: 'divider', p: 3, borderRadius: 4, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  {t('filter.gameplay')}
                </Typography>
                <Grid container spacing={1} sx={{ mb: 4 }}>
                  {GAMEPLAY_EVENTS.map(ev => (
                    <Grid item xs={6} sm={4} key={ev}>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            size="small"
                            checked={selectedEvents.includes(ev)} 
                            onChange={() => handleToggleEvent(ev)} 
                            color="primary"
                          />
                        }
                        label={<Typography variant="body2">{ev}</Typography>}
                      />
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" color="secondary" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  {t('filter.special')}
                </Typography>
                <Grid container spacing={1} sx={{ mb: 4 }}>
                  {SPECIAL_DECO_EVENTS.map(ev => (
                    <Grid item xs={6} sm={4} key={ev}>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            size="small"
                            checked={selectedEvents.includes(ev)} 
                            onChange={() => handleToggleEvent(ev)} 
                            color="secondary"
                          />
                        }
                        label={<Typography variant="body2">{ev}</Typography>}
                      />
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  {t('filter.others')}
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
            <Paper elevation={3} sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.primary', mb: 3 }}>
                <Box sx={{ bgcolor: 'secondary.container', p: 1, borderRadius: 3, display: 'flex' }}>
                  <SaveIcon sx={{ color: 'secondary.onContainer' }} />
                </Box>
                {t('target.title')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: targetLevel ? 4 : 0 }}>
                <Button
                  component="label"
                  variant="contained"
                  color="secondary"
                  startIcon={<CloudUploadIcon />}
                >
                  {t('target.import')}
                  <input
                    type="file"
                    hidden
                    accept=".adofai,.json"
                    onChange={(e) => handleFileUpload(e, false)}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {targetFileName || t('target.noFile')}
                </Typography>
              </Box>

              {targetLevel && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {t('target.tilesCount', { count: targetLevel.tiles.length })}
                  </Typography>
                  <TextField
                    label={t('target.insertIndex')}
                    type="number"
                    value={targetStartTile}
                    onChange={(e) => setTargetStartTile(Math.max(0, Math.min(targetLevel.tiles.length - 1, parseInt(e.target.value) || 0)))}
                    fullWidth
                    helperText={t('target.helperText')}
                  />
                </Box>
              )}
            </Paper>

            {/* 操作按钮 */}
            {sourceLevel && targetLevel && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SaveIcon />}
                  onClick={handleStitch}
                  sx={{ px: 6, py: 2, fontSize: '1.1rem' }}
                >
                  {t('actions.stitch')}
                </Button>
                {stitchResult && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="large"
                    startIcon={<AssessmentIcon />}
                    onClick={() => setShowDebug(true)}
                    sx={{ px: 4, py: 2, fontSize: '1.1rem' }}
                  >
                    {t('actions.debug')}
                  </Button>
                )}
              </Box>
            )}
          </Stack>
        </Container>
      </Box>

      {/* 调试信息对话框 */}
      <Dialog 
        open={showDebug} 
        onClose={() => setShowDebug(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 8, bgcolor: '#F8F9FF' } }}
      >
        <DialogTitle sx={{ px: 5, pt: 5, pb: 3, fontWeight: 700, fontSize: '1.75rem', color: 'primary.main' }}>
          {t('debug.panelTitle')}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 5, mb: 0, bgcolor: 'background.paper' }}>
            <Tabs 
              value={debugTab} 
              onChange={(_, v) => setDebugTab(v)} 
              sx={{ 
                '& .MuiTabs-indicator': { height: 4, borderRadius: '4px 4px 0 0' },
                py: 2
              }}
            >
              <Tab label={t('debug.tabs.transfer')} sx={{ fontSize: '1rem', px: 3 }} />
              <Tab label={t('debug.tabs.source')} sx={{ fontSize: '1rem', px: 3 }} />
              <Tab label={t('debug.tabs.target')} sx={{ fontSize: '1rem', px: 3 }} />
            </Tabs>
          </Box>

          <Box sx={{ px: 5, py: 4 }}>
            {debugTab === 0 && stitchResult && (
              <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 600, borderRadius: 4, border: '1px solid #E1E2E9' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'primary.container', color: 'primary.onContainer', fontWeight: 600 }}>{t('debug.table.eventType')}</TableCell>
                      <TableCell sx={{ bgcolor: 'primary.container', color: 'primary.onContainer', fontWeight: 600 }}>{t('debug.table.sourceTile')}</TableCell>
                      <TableCell sx={{ bgcolor: 'primary.container', color: 'primary.onContainer', fontWeight: 600 }}>{t('debug.table.sourceTime')}</TableCell>
                      <TableCell sx={{ bgcolor: 'primary.container', color: 'primary.onContainer', fontWeight: 600 }}>{t('debug.table.targetTile')}</TableCell>
                      <TableCell sx={{ bgcolor: 'primary.container', color: 'primary.onContainer', fontWeight: 600 }}>{t('debug.table.targetAngle')}</TableCell>
                      <TableCell sx={{ bgcolor: 'primary.container', color: 'primary.onContainer', fontWeight: 600 }}>{t('debug.table.targetTime')}</TableCell>
                      <TableCell sx={{ bgcolor: 'primary.container', color: 'primary.onContainer', fontWeight: 600 }}>{t('debug.table.diff')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stitchResult.transferredEvents.map((et, i) => {
                      const targetBaseTime = stitchResult.targetTiming.tileTimes[targetStartTile] || 0;
                      const sourceBaseTime = stitchResult.sourceTiming.tileTimes[sourceStartTile] || 0;
                      const diff = (et.targetTime - et.sourceTime - (targetBaseTime - sourceBaseTime)) * 1000;
                      return (
                        <TableRow key={i} hover>
                          <TableCell>{et.eventType}</TableCell>
                          <TableCell>{et.sourceTileIndex}</TableCell>
                          <TableCell>{et.sourceTime.toFixed(4)}</TableCell>
                          <TableCell>{et.targetTileIndex}</TableCell>
                          <TableCell>{et.targetAngleOffset.toFixed(2)}°</TableCell>
                          <TableCell>{et.targetTime.toFixed(4)}</TableCell>
                          <TableCell sx={{ color: Math.abs(diff) > 1 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                            {diff.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {debugTab === 1 && stitchResult && (
              <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 600, borderRadius: 4, border: '1px solid #E1E2E9' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'secondary.container', color: 'secondary.onContainer', fontWeight: 600 }}>{t('debug.table.tileIndex')}</TableCell>
                      <TableCell sx={{ bgcolor: 'secondary.container', color: 'secondary.onContainer', fontWeight: 600 }}>{t('debug.table.arrivalTime')}</TableCell>
                      <TableCell sx={{ bgcolor: 'secondary.container', color: 'secondary.onContainer', fontWeight: 600 }}>{t('debug.table.currentBpm')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stitchResult.sourceTiming.tileTimes.map((t, i) => (
                      <TableRow key={i} hover selected={i >= sourceStartTile && i <= sourceEndTile}>
                        <TableCell>{i}</TableCell>
                        <TableCell>{t.toFixed(4)}</TableCell>
                        <TableCell>{stitchResult.sourceTiming.bpmAtTiles[i]?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {debugTab === 2 && stitchResult && (
              <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 600, borderRadius: 4, border: '1px solid #E1E2E9' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: 'secondary.container', color: 'secondary.onContainer', fontWeight: 600 }}>{t('debug.table.tileIndex')}</TableCell>
                      <TableCell sx={{ bgcolor: 'secondary.container', color: 'secondary.onContainer', fontWeight: 600 }}>{t('debug.table.arrivalTime')}</TableCell>
                      <TableCell sx={{ bgcolor: 'secondary.container', color: 'secondary.onContainer', fontWeight: 600 }}>{t('debug.table.currentBpm')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stitchResult.targetTiming.tileTimes.map((t, i) => (
                      <TableRow key={i} hover selected={i === targetStartTile}>
                        <TableCell>{i}</TableCell>
                        <TableCell>{t.toFixed(4)}</TableCell>
                        <TableCell>{stitchResult.targetTiming.bpmAtTiles[i]?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 4, pb: 4 }}>
          <Button onClick={() => setShowDebug(false)} variant="contained">
            {t('debug.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default App;
