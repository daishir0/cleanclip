# CleanClip

パスワードや住所などの定型テキストを安全に管理・コピーできるクリップボードマネージャーアプリ。Expo/React Nativeで構築されています。

## 機能

- **エントリ管理**: 名前付きのテキストエントリを作成・編集・削除
- **アコーディオン式リスト**: タップで展開、各フィールドの個別コピーが可能
- **全コピー**: エントリ内の全フィールドをスペースなしで単純連結コピー
- **マスク表示**: パスワードなどの機密データを非表示に（👁タップで3秒間だけ表示）
- **テキストクリーニング**: クリップボード内のテキストから不要な空白・改行を除去
- **並べ替え**: ドラッグ＆ドロップ（ネイティブ）/ 上下ボタン（Web）でエントリの順序変更
- **検索機能**: エントリ名でリアルタイムフィルタリング
- **セキュリティ**: Face ID/Touch ID認証、スクリーンキャプチャ防止、暗号化ストレージ
- **多言語対応**: 日本語・英語
- **ダークモード**: ライト/ダーク切り替え対応
- **データ管理**: JSON形式でのエクスポート・インポート、iCloud同期
- **同期の自動リトライ**: 一時的な同期エラー時は指数バックオフで自動再試行
- **移動できる＋ボタン**: 新規作成ボタンはドラッグで好きな位置に配置可能（位置は保存されます）

## 技術スタック

- **Expo SDK 54**
- **React Native 0.81**
- **expo-router**: ファイルベースルーティング
- **expo-clipboard**: コピー機能
- **expo-haptics**: 触覚フィードバック
- **expo-local-authentication**: 生体認証（Face ID/Touch ID）
- **expo-secure-store**: セキュアストレージ
- **expo-screen-capture**: スクリーンキャプチャ防止
- **expo-crypto**: 暗号化処理
- **react-native-draggable-flatlist**: ドラッグ＆ドロップ並べ替え
- **AsyncStorage**: ローカルデータ永続化

## 必要環境

- Node.js 18+
- npm または yarn
- Expo Go アプリ（実機テスト用）

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/daishir0/cleanclip.git
cd cleanclip
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npx expo start
```

## 実機での確認方法

### iOS / Android 共通

1. **Expo Go アプリをインストール**
   - iOS: App Store から「Expo Go」をダウンロード
   - Android: Google Play Store から「Expo Go」をダウンロード

2. **開発サーバーを起動**
   ```bash
   npx expo start
   ```

3. **QRコードをスキャン**
   - ターミナルに表示されるQRコードをスキャン
   - iOS: カメラアプリでスキャン
   - Android: Expo Goアプリ内のスキャナーを使用

4. **同一ネットワークに接続**
   - PCとスマートフォンが同じWi-Fiネットワークに接続されていることを確認

### トンネル接続（ネットワーク問題がある場合）

```bash
npx expo start --tunnel
```

### プラットフォーム別起動

```bash
# iOSシミュレーター
npx expo start --ios

# Androidエミュレーター
npx expo start --android

# Webブラウザ
npx expo start --web
```

## Macでの利用

### Apple Silicon Mac（推奨）

本アプリは iPad 対応（`supportsTablet: true`）のため、Apple Silicon 搭載 Mac では「Designed for iPad」アプリとしてそのまま動作します。

- **App Store 配信時**: App Store Connect の「価格および配信状況」→「Apple シリコン搭載 Mac 上の iPhone および iPad アプリ」で「Mac で利用可能にする」が有効になっていることを確認してください（デフォルトで有効）。
- **TestFlight**: Apple Silicon Mac の TestFlight アプリから直接インストールできます。
- **注意**: Mac 上ではスクリーンキャプチャ防止が機能しません（アプリ内の設定画面にも注記あり）。

### Intel Mac / その他

Web 版をブラウザで利用できます。

```bash
# 開発サーバー
npx expo start --web

# 静的ビルド（dist/ に出力）
npx expo export --platform web
```

※ Web 版では iCloud 同期・生体認証・スクリーンキャプチャ防止は利用できません。

## テスト

```bash
npm test   # tests/*.test.mjs をすべて実行（同期マージ・クリーニング・リトライバックオフ）
```

## 開発コマンド

```bash
# 開発サーバー起動
npm start

# iOSで起動
npm run ios

# Androidで起動
npm run android

# Webで起動
npm run web
```

## プロジェクト構造

```
cleanclip/
├── app/                      # アプリケーションコード
│   ├── _layout.tsx          # ルートレイアウト（Stack）
│   ├── entry-edit.tsx       # エントリ編集画面
│   ├── settings.tsx         # 設定画面
│   └── (tabs)/
│       ├── _layout.tsx      # タブレイアウト
│       ├── index.tsx        # エントリ一覧画面
│       └── clean.tsx        # テキストクリーニング画面
├── components/              # 共通コンポーネント
│   ├── AuthGate.tsx         # 生体認証ゲート
│   ├── EntryCard.tsx        # エントリカード（アコーディオン）
│   ├── FieldRow.tsx         # フィールド行（コピーボタン付き）
│   ├── WordChip.tsx         # 単語チップ（個別コピー）
│   ├── CleanPreview.tsx     # クリーニングプレビュー
│   ├── CopyFeedback.tsx     # コピー完了フィードバック
│   ├── Onboarding.tsx       # 初回起動ガイド
│   └── PrivacyOverlay.tsx   # プライバシーオーバーレイ
├── constants/               # 定数・テーマ
│   └── theme.ts             # カラー・フォント定義
├── contexts/                # React Context
│   └── AppContext.tsx       # エントリ・設定・テーマ管理
├── hooks/                   # カスタムフック
│   ├── use-color-scheme.ts  # カラースキーム取得
│   ├── use-copy-feedback.ts # コピーフィードバック
│   └── use-responsive.ts   # レスポンシブ対応
├── i18n/                    # 多言語対応
│   ├── index.ts             # ロケール管理
│   ├── en.ts                # 英語
│   ├── ja.ts                # 日本語
│   └── native/              # ネイティブロケール
├── services/                # ビジネスロジック
│   ├── auth-service.ts      # 生体認証
│   ├── clean-service.ts     # テキストクリーニング
│   ├── clipboard-service.ts # クリップボード操作
│   ├── crypto-service.ts    # 暗号化・復号
│   ├── export-service.ts    # データエクスポート・インポート
│   ├── jailbreak-service.ts # 脱獄検出
│   ├── storage-service.ts   # データ永続化
│   └── sync-service.ts      # iCloud同期
├── types/                   # 型定義
│   └── clip.ts              # ClipEntry型
├── assets/                  # 画像・アイコン
├── app.json                 # Expo設定
└── package.json             # 依存関係
```

## 使い方

### エントリの作成

1. 右下の「＋」ボタンをタップ
2. エントリ名を入力（例：「銀行口座」）
3. 内容を入力（1行につき1フィールド）
4. 必要に応じて「マスク」をONに
5. 「保存」をタップ

### コピー操作

1. エントリをタップして展開
2. 各フィールドの「コピー」ボタンでフィールド単位コピー（長押しでスペースなしコピー）
3. ヘッダーの「全コピー」で全フィールドを連結コピー

### テキストクリーニング

1. 「Clean」タブを選択
2. クリップボードの内容が自動読み込み
3. クリーニング後のプレビューを確認
4. 「適用」でクリーニング済みテキストをコピー

### 設定

1. ヘッダー右の ⚙ ボタンで設定画面を開く
2. ダークモードの切り替え
3. 言語の切り替え（日本語/英語）
4. データのエクスポート・インポート
5. 全データ削除

## トラブルシューティング

### QRコードが読み取れない

```bash
# トンネルモードで起動
npx expo start --tunnel
```

### キャッシュの問題

```bash
# キャッシュをクリアして起動
npx expo start -c
```

### 依存関係の問題

```bash
rm -rf node_modules
npm install
```

## ライセンス

MIT License

## 作者

daishir0
