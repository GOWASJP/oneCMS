# ONE CMS

ブラウザで `cms.html` を開くだけで動作する、インストール不要の静的サイトジェネレーター型CMSです。

行政・自治体・コーポレートサイト向けに、WordPressのローカル起動→静的書き出しという重い運用を置き換えます。

## 特徴

- **インストール不要** — `cms.html` をブラウザで開くだけ
- **サーバー不要** — ローカルサーバーもDB も不要。ブラウザ単体で完結
- **オフライン完全動作** — インターネット接続不要
- **非エンジニア対応** — 事務職員レベルで運用可能
- **静的HTML書き出し** — FTPでアップロードするだけで公開
- **差分抽出** — 変更ファイルのみを `changed/` に自動抽出

## デモ

1. [Releases](https://github.com/GOWASJP/GowasCMS/releases) から `cms.html` をダウンロード
2. Chrome または Edge で開く
3. 担当者名を入力して「開始する」
4. 空のフォルダを選択（初期データが自動生成されます）

## スクリーンショット

管理画面は Ghost CMS 風のダークサイドバー + クリーンな白い編集エリアのデザインです。

- Editor.js によるブロックエディタ（画像ドラッグ&ドロップ対応）
- コンテンツタイプの動的作成・カスタムフィールド
- 多言語対応（翻訳ステータス管理）
- テーマカラー・フォント選択

## 技術スタック

| 要素           | 選択                            |
| -------------- | ------------------------------- |
| ビルド         | Vite 8 + vite-plugin-singlefile |
| 言語           | TypeScript (strict)             |
| スタイル       | Tailwind CSS 4                  |
| UI             | Alpine.js                       |
| エディタ       | Editor.js                       |
| テンプレート   | Handlebars.js                   |
| バリデーション | Zod                             |
| アイコン       | Lucide                          |
| リント         | ESLint + Prettier + Husky       |

## フォルダ構成（運用環境）

```
my-site/
├── cms.html                ← ブラウザで開くだけ
├── content/                ← コンテンツデータ（JSON）
│   ├── site.json           サイト設定
│   ├── languages.json      言語設定
│   ├── _types/             投稿タイプ定義
│   ├── pages/              固定ページ
│   ├── taxonomies/         カテゴリ・タグ
│   └── {type}/             投稿データ
├── templates/              ← Handlebarsテンプレート
│   ├── _base.hbs           共通レイアウト
│   ├── _components/        コンポーネント（14種）
│   ├── page.hbs            固定ページ用
│   ├── list.hbs            一覧用
│   └── detail.hbs          詳細用
├── assets/                 ← 画像・ファイル
│   ├── images/             最適化済み（WebP）
│   └── _originals/         元画像バックアップ
├── dist/                   ← 書き出し先（公開フォルダ）
├── changed/                ← 差分ファイル（FTPアップ用）
├── .revisions/             ← リビジョン履歴
└── .cms/                   ← バージョン記録・移行前バックアップ
    ├── version.json        データ形式/本体バージョンの記録
    └── backup/             データ移行前の自動バックアップ
```

## アップデート

新しい版へは **新しい `cms.html` をダウンロードして差し替えるだけ** です（オフライン運用のため自動更新は行いません）。

- コンテンツ・テンプレート（フォルダ側のデータ）は本体と分離されているため、差し替えても保持されます
- データ形式に変更がある版では、起動時に**自動でデータを新形式へ移行**します。移行前には `.cms/backup/` にバックアップを作成します
- 管理画面の「設定 → バージョン情報」で、本体バージョン・エディション・データ形式バージョンを確認できます
- データが本体より新しい場合（古い `cms.html` で開いた場合）は警告を表示します
- **既定テンプレートの差分提案アップデート**：新版で既定テンプレートが更新されると「テンプレート」画面に更新件数を表示。未編集ファイルは安全に一括更新でき、編集済みファイルは差分を確認してから取り込めます（あなたの変更を勝手に上書きしません）

## 機能一覧

### コンテンツ管理

- 固定ページの作成・編集・削除
- 投稿タイプの動的作成（カスタムフィールド定義）
- Editor.js ブロックエディタ（見出し/画像/リスト/引用/テーブル/コード/区切り/埋め込み）
- 画像の自動最適化（WebP変換・リサイズ・EXIF除去）
- カテゴリ・タグ管理
- コンテンツのステータス管理（下書き/公開/アーカイブ）

### 多言語

- 複数言語対応（言語の追加・削除を管理画面で設定）
- 翻訳ステータス表示（翻訳済/翻訳中/未翻訳）
- 「他言語からコピー」で翻訳作業を開始
- hreflang タグ自動生成

### 書き出し・公開

- Handlebars テンプレートで静的HTML生成
- sitemap.xml / robots.txt 自動生成
- OGP / Twitter Card / meta description 自動生成
- JSON-LD 構造化データ（パンくず・記事）
- SHA-256 ハッシュによる差分検出
- 検索インデックス（search-index.json）自動生成
- 検索ページ（クライアントサイド全文検索）自動生成
- アセットファイルの自動コピー

### リビジョン管理

- 保存ごとに自動スナップショット（最大20件）
- diff-match-patch による差分表示
- 任意のリビジョンに復元

### テーマ・デザイン

- カラーテーマ選択（5色）
- フォント選択（システムフォント / Noto Sans JP / 明朝体）
- CSS カスタムプロパティで書き出し時に反映
- 9種のHBSコンポーネント（hero/accordion/tabs/timeline/card-list/gallery等）

## 開発

### セットアップ

```bash
git clone https://github.com/GOWASJP/GowasCMS.git
cd GowasCMS
npm install
```

### コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # cms.html をビルド（build/index.html）
npm run preview      # ビルド結果のプレビュー
npm run lint         # ESLint チェック
npm run lint:fix     # ESLint 自動修正
npm run typecheck    # TypeScript 型チェック
npm run format       # Prettier フォーマット
```

### ビルド

```bash
npm run build
# → build/index.html (約1.5MB, gzip約540KB)
# これを cms.html にリネームして配布
```

ビルドサイズの大半は **オフライン完全動作のために同梱しているランタイム** です（インストール・サーバー不要という本製品の核となる特徴を支えるもの）。

| 構成要素                           | 役割                                        |
| ---------------------------------- | ------------------------------------------- |
| EditorJS + プラグイン              | ブロックエディタ                            |
| Tailwind CSS ブラウザランタイム    | プレビュー/公開サイトの Tailwind 実行時生成 |
| Alpine.js                          | 管理画面 UI + 公開サイトへの同梱            |
| Inter フォント（Latin サブセット） | 管理画面タイポグラフィ                      |
| Handlebars / Zod / Lucide          | テンプレート生成・検証・アイコン            |

アイコンは使用分のみ tree-shake（`src/icons.ts`）し、フォントは Latin サブセットに限定済み。いずれもオフライン要件のため外部 CDN には依存しません。

## ブラウザ対応

| ブラウザ       | 対応 | 備考                            |
| -------------- | ---- | ------------------------------- |
| Chrome（最新） | o    | File System Access API 完全対応 |
| Edge（最新）   | o    | 行政PCに多い・推奨              |
| Firefox        | x    | File System Access API 未対応   |
| Safari         | x    | File System Access API 未対応   |

## ライセンス

MIT License

## 作成者

[GOWAS LLC](https://gowas.jp)
