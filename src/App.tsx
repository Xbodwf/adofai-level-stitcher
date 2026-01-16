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
  CssBaseline
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
 import { Level, Parsers } from 'adofai';
 
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
  const [level, setLevel] = useState<Level | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [startTile, setStartTile] = useState<number>(0);
  const [endTile, setEndTile] = useState<number>(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
       try {
         const content = e.target?.result as string;
         // 使用 StringParser 解析，以支持非标准 JSON 格式的 .adofai 文件
         const newLevel = new Level(content, new Parsers.StringParser());
         await newLevel.load();
         setLevel(newLevel);
        // 默认结束砖块为最后一个砖块
        setEndTile(newLevel.tiles.length - 1);
      } catch (err) {
        console.error(err);
        setError('无法解析 .adofai 文件，请确保文件格式正确。');
        setLevel(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary" sx={{ fontWeight: 'bold' }}>
          ADOFAI Level Stitcher
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            1. 导入谱面文件
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              sx={{ borderRadius: 2 }}
            >
              选择文件 (.adofai / .json)
              <input
                type="file"
                hidden
                accept=".adofai,.json"
                onChange={handleFileUpload}
              />
            </Button>
            <Typography variant="body1" color="textSecondary">
              {fileName || '未选择文件'}
            </Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>}
        </Paper>

        {level && (
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              2. 选择截取范围
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              谱面共有 {level.tiles.length} 个砖块 (索引从 0 到 {level.tiles.length - 1})
            </Typography>
            <Stack direction="row" spacing={3}>
              <TextField
                label="开始砖块索引"
                type="number"
                value={startTile}
                onChange={(e) => setStartTile(Math.max(0, parseInt(e.target.value) || 0))}
                fullWidth
                variant="outlined"
                helperText="包含此砖块"
              />
              <TextField
                label="结束砖块索引"
                type="number"
                value={endTile}
                onChange={(e) => setEndTile(Math.min(level.tiles.length - 1, parseInt(e.target.value) || 0))}
                fullWidth
                variant="outlined"
                helperText="包含此砖块"
              />
            </Stack>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(33, 150, 243, 0.08)', borderRadius: 2 }}>
              <Typography variant="subtitle2" color="primary">
                已选择范围: {startTile} - {endTile} (共 {Math.max(0, endTile - startTile + 1)} 个砖块)
              </Typography>
            </Box>
          </Paper>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
