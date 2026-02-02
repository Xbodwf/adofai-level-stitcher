import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  zh: {
    translation: {
      title: 'ADOFAI Level Stitcher',
      github: 'GitHub 仓库',
      source: {
        title: '1. 选择源谱面 (复制来源)',
        import: '导入源谱面',
        noFile: '未选择文件',
        tilesCount: '谱面共有 {{count}} 个砖块',
        startIndex: '开始砖块索引',
        endIndex: '结束砖块索引',
        selectedRange: '已选择范围: {{start}} - {{end}} (共 {{count}} 个砖块的事件)',
      },
      filter: {
        title: '2. 事件过滤设置',
        blacklist: '黑名单',
        whitelist: '白名单',
        blacklistInfo: '黑名单模式：勾选的事件将【不会】被缝合。建议用于排除装饰类事件。',
        whitelistInfo: '白名单模式：只有勾选的事件才【会被】缝合。建议用于只提取特定逻辑。',
        selectAll: '全选',
        selectNone: '全不选',
        selectedCount: '已选择 {{selected}} / {{total}} 种事件',
        gameplay: '🎮 玩法类事件 (默认勾选)',
        special: '✨ 特殊事件 (影响装饰物去留)',
        others: '📝 其他事件',
      },
      target: {
        title: '3. 选择目标谱面 (粘贴目的地)',
        import: '导入目标谱面',
        noFile: '未选择文件',
        tilesCount: '谱面共有 {{count}} 个砖块',
        insertIndex: '插入位置 (目标砖块索引)',
        helperText: '源谱面的事件将从该砖块的时间点开始粘贴',
      },
      actions: {
        stitch: '开始缝合并导出',
        debug: '查看时间轴校验',
      },
      errors: {
        parse: '无法解析文件 {{name}}，请确保格式正确。',
        stitch: '缝合过程中出错。',
      },
      debug: {
        panelTitle: '缝合时间轴校验面板',
        tabs: {
          transfer: '迁移事件对比',
          source: '源谱面时间轴',
          target: '目标谱面时间轴',
        },
        table: {
          eventType: '事件类型',
          sourceTile: '源砖块',
          sourceTime: '源绝对时间 (s)',
          targetTile: '目标砖块',
          targetAngle: '目标角度偏移',
          targetTime: '目标绝对时间 (s)',
          diff: '偏差 (ms)',
          tileIndex: '砖块索引',
          arrivalTime: '到达时间 (s)',
          currentBpm: '当前 BPM',
        },
        close: '关闭面板',
      }
    }
  },
  en: {
    translation: {
      title: 'ADOFAI Level Stitcher',
      github: 'GitHub Repo',
      source: {
        title: '1. Select Source Level (Copy From)',
        import: 'Import Source Level',
        noFile: 'No file selected',
        tilesCount: 'Total tiles: {{count}}',
        startIndex: 'Start Tile Index',
        endIndex: 'End Tile Index',
        selectedRange: 'Selected Range: {{start}} - {{end}} ({{count}} tiles events)',
      },
      filter: {
        title: '2. Event Filter Settings',
        blacklist: 'Blacklist',
        whitelist: 'Whitelist',
        blacklistInfo: 'Blacklist Mode: Selected events will NOT be stitched. Recommended for excluding decorations.',
        whitelistInfo: 'Whitelist Mode: ONLY selected events will be stitched. Recommended for specific logic.',
        selectAll: 'Select All',
        selectNone: 'Select None',
        selectedCount: 'Selected {{selected}} / {{total}} types',
        gameplay: '🎮 Gameplay Events (Default Checked)',
        special: '✨ Special Events (Decoration Logic)',
        others: '📝 Other Events',
      },
      target: {
        title: '3. Select Target Level (Paste To)',
        import: 'Import Target Level',
        noFile: 'No file selected',
        tilesCount: 'Total tiles: {{count}}',
        insertIndex: 'Insertion Position (Target Tile Index)',
        helperText: 'Events will be pasted starting from this tile\'s timing',
      },
      actions: {
        stitch: 'Stitch & Export',
        debug: 'View Timing Validation',
      },
      errors: {
        parse: 'Failed to parse file {{name}}, please check the format.',
        stitch: 'Error occurred during stitching.',
      },
      debug: {
        panelTitle: 'Stitching Timing Validation',
        tabs: {
          transfer: 'Event Comparison',
          source: 'Source Timing',
          target: 'Target Timing',
        },
        table: {
          eventType: 'Event Type',
          sourceTile: 'Src Tile',
          sourceTime: 'Src Time (s)',
          targetTile: 'Dst Tile',
          targetAngle: 'Dst Angle Offset',
          targetTime: 'Dst Time (s)',
          diff: 'Diff (ms)',
          tileIndex: 'Tile Index',
          arrivalTime: 'Arrival Time (s)',
          currentBpm: 'Current BPM',
        },
        close: 'Close Panel',
      }
    }
  },
  ja: {
    translation: {
      title: 'ADOFAI レベルステッチャー',
      github: 'GitHub リポジトリ',
      source: {
        title: '1. ソースレベルの選択 (コピー元)',
        import: 'ソースレベルをインポート',
        noFile: 'ファイルが選択されていません',
        tilesCount: '合計タイル数: {{count}}',
        startIndex: '開始タイルインデックス',
        endIndex: '終了タイルインデックス',
        selectedRange: '選択範囲: {{start}} - {{end}} ({{count}} タイルのイベント)',
      },
      filter: {
        title: '2. イベントフィルター設定',
        blacklist: 'ブラックリスト',
        whitelist: 'ホワイトリスト',
        blacklistInfo: 'ブラックリストモード：チェックされたイベントはステッチされません。装飾の除外に推奨されます。',
        whitelistInfo: 'ホワイトリストモード：チェックされたイベントのみがステッチされます。特定のロジックの抽出に推奨されます。',
        selectAll: 'すべて選択',
        selectNone: '選択解除',
        selectedCount: '選択済み {{selected}} / {{total}} 種類',
        gameplay: '🎮 ゲームプレイイベント (デフォルトでチェック)',
        special: '✨ 特殊イベント (装飾ロジックに影響)',
        others: '📝 その他のイベント',
      },
      target: {
        title: '3. ターゲットレベルの選択 (貼り付け先)',
        import: 'ターゲットレベルをインポート',
        noFile: 'ファイルが選択されていません',
        tilesCount: '合計タイル数: {{count}}',
        insertIndex: '挿入位置 (ターゲットタイルインデックス)',
        helperText: 'イベントはこのタイルのタイミングから貼り付けられます',
      },
      actions: {
        stitch: 'ステッチしてエクスポート',
        debug: 'タイミング検証を表示',
      },
      errors: {
        parse: 'ファイル {{name}} の解析に失敗しました。形式を確認してください。',
        stitch: 'ステッチ中にエラーが発生しました。',
      },
      debug: {
        panelTitle: 'ステッチタイミング検証パネル',
        tabs: {
          transfer: 'イベント比較',
          source: 'ソースタイミング',
          target: 'ターゲットタイミング',
        },
        table: {
          eventType: 'イベントタイプ',
          sourceTile: 'ソースタイル',
          sourceTime: 'ソース時間 (s)',
          targetTile: 'ターゲットタイル',
          targetAngle: 'ターゲット角度オフセット',
          targetTime: 'ターゲット時間 (s)',
          diff: '差分 (ms)',
          tileIndex: 'タイルインデックス',
          arrivalTime: '到達時間 (s)',
          currentBpm: '現在の BPM',
        },
        close: 'パネルを閉じる',
      }
    }
  },
  ko: {
    translation: {
      title: 'ADOFAI 레벨 스티처',
      github: 'GitHub 저장소',
      source: {
        title: '1. 원본 레벨 선택 (복사 소스)',
        import: '원본 레벨 가져오기',
        noFile: '파일이 선택되지 않음',
        tilesCount: '총 타일 수: {{count}}',
        startIndex: '시작 타일 인덱스',
        endIndex: '종료 타일 인덱스',
        selectedRange: '선택 범위: {{start}} - {{end}} (총 {{count}}개 타일 이벤트)',
      },
      filter: {
        title: '2. 이벤트 필터 설정',
        blacklist: '블랙리스트',
        whitelist: '화이트리스트',
        blacklistInfo: '블랙리스트 모드: 선택된 이벤트는 스티치되지 않습니다. 장식 제외에 권장됩니다.',
        whitelistInfo: '화이트리스트 모드: 선택된 이벤트만 스티치됩니다. 특정 로직 추출에 권장됩니다.',
        selectAll: '모두 선택',
        selectNone: '모두 해제',
        selectedCount: '선택됨 {{selected}} / {{total}} 종류',
        gameplay: '🎮 게임플레이 이벤트 (기본 선택)',
        special: '✨ 특수 이벤트 (장식 로직에 영향)',
        others: '📝 기타 이벤트',
      },
      target: {
        title: '3. 대상 레벨 선택 (붙여넣기 대상)',
        import: '대상 레벨 가져오기',
        noFile: '파일이 선택되지 않음',
        tilesCount: '총 타일 수: {{count}}',
        insertIndex: '삽입 위치 (대상 타일 인덱스)',
        helperText: '원본 레벨의 이벤트가 이 타일의 타이밍부터 붙여넣어집니다',
      },
      actions: {
        stitch: '스티치 및 내보내기',
        debug: '타이밍 검증 보기',
      },
      errors: {
        parse: '{{name}} 파일을 구문 분석하지 못했습니다. 형식을 확인하세요.',
        stitch: '스티칭 중 오류가 발생했습니다.',
      },
      debug: {
        panelTitle: '스티칭 타이밍 검증 패널',
        tabs: {
          transfer: '이벤트 비교',
          source: '원본 타이밍',
          target: '대상 타이밍',
        },
        table: {
          eventType: '이벤트 유형',
          sourceTile: '원본 타일',
          sourceTime: '원본 시간 (s)',
          targetTile: '대상 타일',
          targetAngle: '대상 각도 오프셋',
          targetTime: '대상 시간 (s)',
          diff: '차이 (ms)',
          tileIndex: '타일 인덱스',
          arrivalTime: '도착 시간 (s)',
          currentBpm: '현재 BPM',
        },
        close: '패널 닫기',
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    }
  });

export default i18n;
