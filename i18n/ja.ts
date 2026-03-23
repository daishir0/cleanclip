export const ja = {
  // Common
  common_cancel: 'キャンセル',
  common_delete: '削除',
  common_save: '保存',
  common_error: 'エラー',
  common_done: '完了',
  common_ok: '了解',

  // Tabs
  tabs_entries: 'エントリ',
  tabs_clean: 'クリーン',

  // Modal titles
  modal_entryEdit: 'エントリ編集',
  modal_settings: '設定',

  // Entry List
  entryList_empty: 'エントリがありません',
  entryList_emptyHint: '右下の＋ボタンで追加できます',
  entryList_addEntry: 'エントリを追加',
  entryList_deleteTitle: '削除確認',
  entryList_deleteMessage: '「{{name}}」を削除しますか？',
  entryList_search: '検索',
  entryList_searchPlaceholder: 'エントリを検索...',
  entryList_noResults: '一致するエントリがありません',

  // Clean Screen
  clean_readClipboard: 'クリップボードを読み込む',
  clean_apply: '適用',
  clean_applyHint: '変換後テキストをクリップボードに書き込み',
  clean_applied: 'クリーンテキストを適用しました',
  clean_tryAgain: 'もう一度変換する',
  clean_emptyDescription: 'クリップボードのテキストから\n装飾やHTMLタグを除去します',
  clean_charDiff: '{{before}} 文字 → {{after}} 文字（▼ {{diff}}）',
  clean_charIncrease: '{{before}} 文字 → {{after}} 文字（▲ {{diff}}）',
  clean_charNoChange: '{{count}} 文字（変更なし）',
  clean_charCountLabel: '文字数の変化: {{text}}',
  clean_before: '変換前',
  clean_after: '変換後',

  // Entry Edit
  entryEdit_newEntry: '新規エントリ',
  entryEdit_editEntry: 'エントリ編集',
  entryEdit_entryName: 'エントリ名',
  entryEdit_entryNamePlaceholder: '例: クレジットカード',
  entryEdit_content: 'コンテンツ',
  entryEdit_contentPlaceholder: 'テキストを入力\n改行で行を区切り、スペースで単語区切り',
  entryEdit_maskDisplay: 'マスク表示',
  entryEdit_maskToggle: 'マスク表示切替',
  entryEdit_deleteEntry: 'このエントリを削除',
  entryEdit_deleteEntryLabel: 'エントリを削除',
  entryEdit_deleteConfirmTitle: '削除確認',
  entryEdit_deleteConfirmMessage: '「{{name}}」を削除しますか？この操作は取り消せません。',
  entryEdit_errorNoName: 'エントリ名を入力してください',
  entryEdit_errorNoContent: '内容を入力してください',

  // Settings
  settings_appearance: '外観',
  settings_darkMode: 'ダークモード',
  settings_darkModeLabel: 'ダークモード切替',
  settings_language: '言語',
  settings_languageJa: '日本語',
  settings_languageEn: 'English',
  settings_security: 'セキュリティ',
  settings_securityEncryption: 'データは端末内でAES暗号化してから保存されます。暗号化キーはKeychain（E2E暗号化）に保存され、デバイス間でのみ共有されます。',
  settings_securityScreenshot: 'スクリーンショットと画面録画はブロックされます（iOS/iPadOS）。',
  settings_securityMacNote: 'Mac版ではスクリーンショット防止が機能しません。機密データの取扱いにご注意ください。',
  settings_dataManagement: 'データ管理',
  settings_icloudSync: 'iCloud同期',
  settings_icloudSyncDesc: 'iCloudを使ってデバイス間でエントリを同期',
  settings_syncSuccess: '{{count}}件のエントリを同期しました',
  settings_export: 'データをエクスポート',
  settings_exportError: 'エクスポートに失敗しました',
  settings_import: 'データをインポート',
  settings_importSuccess: '{{count}}件のエントリをインポートしました',
  settings_deleteAll: '全データを今すぐ削除',
  settings_deleteAllTitle: '全データを削除',
  settings_deleteAllMessage: 'すべてのエントリと設定が削除されます。この操作は取り消せません。',
  settings_deleteAllDone: 'すべてのデータを削除しました',

  // Auth Gate
  auth_unlockBiometric: '{{type}}でロックを解除',
  auth_unlockPasscode: 'パスコードを使用してロックを解除してください',
  auth_unlock: 'ロックを解除',
  auth_failCount: '認証に失敗しました（{{count}}/3）',
  auth_defaultBiometric: '生体認証',

  // Auth Service
  auth_prompt: 'CleanClipのロックを解除',
  auth_fallback: 'パスコードを使用',
  auth_biometricPasscode: 'パスコード',
  auth_biometricFingerprint: '指紋認証',

  // Jailbreak
  jailbreak_securityWarning: 'セキュリティ警告',
  jailbreak_iosWarning: 'このデバイスはJailbreakされている可能性があります。データのセキュリティが低下する恐れがあります。',
  jailbreak_androidWarning: 'このデバイスはroot化されている可能性があります。データのセキュリティが低下する恐れがあります。',

  // Entry Card
  entryCard_entry: 'エントリ: {{name}}',
  entryCard_copyAll: '全コピー',
  entryCard_copyAllHint: '全内容をコピー',
  entryCard_edit: '編集',
  entryCard_delete: '削除',

  // Field Row
  fieldRow_reveal: '値を表示',
  fieldRow_hide: '値を非表示',
  fieldRow_copyLine: '行コピー（スペースあり）',
  fieldRow_copyJoined: '結合コピー（スペースなし）',
  fieldRow_line: '行',
  fieldRow_joined: '結合',
  fieldRow_copy: 'コピー',
  fieldRow_copyLongPressHint: '長押しでスペースなしコピー',

  // Word Chip
  wordChip_copyMasked: 'マスクされた値をコピー',
  wordChip_copy: '{{word}}をコピー',
  wordChip_tapHint: 'タップしてコピー',

  // Onboarding
  onboarding_title1: 'テキストを安全に保存',
  onboarding_desc1: 'AES暗号化と生体認証で\nあなたのデータを守ります',
  onboarding_title2: 'ワンタップでコピー',
  onboarding_desc2: 'スペース区切りで単語を分割\nタップするだけでコピーできます',
  onboarding_title3: 'クリップボードをクリーンに',
  onboarding_desc3: 'HTMLタグや装飾を除去して\nプレーンテキストに変換します',
  onboarding_start: 'はじめる',
  onboarding_next: '次へ',

  // Copy Feedback
  copyFeedback_withText: '"{{text}}" をコピー',
  copyFeedback_generic: 'コピーしました',
} as const;

export type TranslationKeys = keyof typeof ja;
export type Translations = Record<TranslationKeys, string>;
