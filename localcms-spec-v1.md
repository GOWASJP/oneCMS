# ONE CMS 仕様書 v2.0

**プロジェクト名：** ONE CMS  
**リポジトリ：** https://github.com/GOWASJP/GowasCMS  
**作成日：** 2025年4月  
**更新日：** 2026年4月（Phase 4完了・Editor.js導入・Ghost風UI）  
**作成者：** GOWAS LLC  
**ライセンス：** MIT License（OSSとして公開）

---

## 1. プロジェクト概要

### 1.1 コンセプト

行政・自治体・コーポレートサイト向けに、WordPressのローカル起動→静的書き出しという重い運用を置き換えるブラウザ完結型CMSです。

```
cms.html をブラウザで開くだけ
  ↓
File System Access API でファイルを直接読み書き
  ↓
Editor.js によるブロックエディタで直感的編集
  ↓
「書き出し」ボタンで静的 HTML 書き出し
  ↓
差分ファイルをFTPでアップ
```

### 1.2 基本方針

- **インストール不要**：`cms.html` をブラウザで開くだけで動作
- **サーバー不要**：ローカルサーバーも不要。ブラウザ単体で完結
- **DB不要**：SQLiteを含む一切のデータベース不要
- **オフライン完全動作**：インターネット接続不要
- **非エンジニア対応**：PC に慣れた事務職員レベルで運用可能
- **OSSとして公開**：MITライセンス・GitHub公開

### 1.3 競合との差別化

|                      | Jekyll/11ty | Grav | Publii | **ONE CMS** |
| -------------------- | ----------- | ---- | ------ | ----------- |
| インストール不要     | ✗           | ✗    | ✗      | **✅**      |
| 非エンジニア対応     | ✗           | △    | ✅     | **✅**      |
| 差分FTP抽出          | ✗           | ✗    | △      | **✅**      |
| カスタムフィールド   | △           | ✅   | △      | **✅**      |
| 多言語対応           | △           | ✅   | △      | **✅**      |
| リビジョン管理       | Git依存     | ✗    | ✗      | **✅**      |
| オフライン完全動作   | △           | ✗    | ✅     | **✅**      |
| セキュリティ審査通過 | ✗           | ✗    | ✗      | **✅**      |

---

## 2. 技術スタック

| 要素                 | 選択                            | 理由                                   |
| -------------------- | ------------------------------- | -------------------------------------- |
| ビルド               | Vite 8 + vite-plugin-singlefile | cms.html 1ファイルに内包               |
| 言語                 | TypeScript (strict)             | 型安全・Zodスキーマ連携                |
| スタイル             | Tailwind CSS 4                  | ビルドに内包・オフライン動作           |
| UIインタラクション   | Alpine.js                       | サーバー不要・Tailwindと相性◎          |
| エディタ             | Editor.js                       | ブロック型・画像D&D・非エンジニア向け  |
| テンプレートエンジン | Handlebars.js                   | if・ループ・カスタムヘルパー対応       |
| バリデーション       | Zod                             | ランタイム型検証・スキーマからの型導出 |
| ハッシュ生成         | Web Crypto API                  | ブラウザ標準・外部依存なし             |
| 差分表示             | diff-match-patch                | 軽量・ブラウザ動作                     |
| アイコン             | Lucide (Tree-shake)             | 使用アイコンのみバンドル               |
| リント               | ESLint + typescript-eslint      | コード品質                             |
| フォーマット         | Prettier                        | 統一的なコードスタイル                 |
| Git hooks            | Husky + lint-staged             | コミット時自動チェック                 |
| 検索                 | Pagefind（Phase 6予定）         | 静的サイト専用・完全オフライン・OSS    |
| ビルド成果物         | cms.html 1ファイル (~730KB)     | 完全オフライン動作                     |

### 2.1 不採用の技術

- **TipTap**：Phase 3まで使用したが、画像挿入UXの問題でEditor.jsに移行
- **HTMX**：サーバーが必要な設計のため不適合
- **SQLite**：行政PCでの利用制限を考慮し不採用
- **Node.js/Bun等のランタイム**：エンドユーザーには不要（開発者のビルド時のみ使用）
- **Mustache.js**：ロジックレス哲学のためif・比較演算子が使えない
- **Pug**：インデントベースの独自構文のため学習コストが高い
- **Koenig (Ghost Editor)**：Ghost本体に強く依存しており単体利用不可

---

## 3. フォルダ構成

### 3.1 開発環境（開発者向け）

```
GowasCms/
├── index.html              ← 開発用エントリーポイント
├── src/                    ← TypeScriptソース
│   ├── main.ts             Alpineコンポーネント（メイン）
│   ├── fs.ts               File System Access APIラッパー
│   ├── editor.ts           Editor.jsラッパー・JSON↔HTML変換
│   ├── export.ts           静的HTML書き出しエンジン
│   ├── diff.ts             差分抽出エンジン（SHA-256）
│   ├── image.ts            画像最適化（WebP・リサイズ・EXIF除去）
│   ├── revision.ts         リビジョン管理
│   ├── storage.ts          IndexedDBフォルダハンドル永続化
│   ├── schemas.ts          Zodスキーマ定義（Single Source of Truth）
│   ├── types.ts            Zodからの型導出
│   ├── icons.ts            Lucideアイコン（Tree-shake用）
│   └── style.css           Ghost風デザインシステム
├── build/                  ← ビルド出力
│   └── cms.html            配布用単一ファイル
├── vite.config.js
├── tsconfig.json
├── eslint.config.js
├── package.json
└── localcms-spec-v1.md     ← この仕様書
```

### 3.2 運用環境（エンドユーザー向け）

```
my-site/
├── cms.html                    ← ブラウザで開くだけ
│
├── content/                    ← CMSが読み書きするデータ
│   ├── site.json               グローバル設定（社名・連絡先等）
│   ├── languages.json          有効言語の定義
│   ├── _types/                 コンテンツタイプ定義
│   │   ├── news.json
│   │   ├── works.json
│   │   └── faq.json
│   ├── taxonomies/             カテゴリ・タグ定義
│   │   ├── categories.json
│   │   └── tags.json
│   ├── pages/                  固定ページ
│   │   ├── about/
│   │   │   ├── ja.json
│   │   │   └── en.json
│   │   └── service/
│   │       ├── ja.json
│   │       └── en.json
│   └── {type}/                 コンテンツタイプ別データ
│       ├── 2025-04-08-001/
│       │   ├── ja.json
│       │   └── en.json
│       └── ...
│
├── templates/                  ← HTMLテンプレート（編集者は触らない）
│   ├── config.json             テンプレート設定
│   ├── _base.hbs               共通レイアウト
│   ├── _components/            コンポーネント
│   │   ├── nav.hbs
│   │   ├── breadcrumb.hbs
│   │   └── pagination.hbs
│   ├── page.hbs                固定ページ用
│   ├── list.hbs                一覧ページ用
│   └── detail.hbs              詳細ページ用
│
├── assets/                     ← 画像・CSS・JS
│   ├── images/                 最適化済み画像（WebP）
│   ├── files/                  添付ファイル
│   └── _originals/             元画像バックアップ
│
├── dist/                       ← 書き出し先（公開フォルダ）
│   ├── manifest.json           ファイルハッシュ記録
│   ├── index.html
│   ├── assets/                 画像・ファイル（自動コピー）
│   ├── en/                     英語
│   └── ...
│
├── changed/                    ← 差分ファイルのみ抽出
│   ├── assets/                 変更された画像も含む
│   └── ...
│
└── .revisions/                 ← リビジョン履歴
    └── pages/
        └── about/
            └── ja/
                ├── 2025-04-01_1430.json
                └── 2025-04-08_1122.json
```

---

## 4. コンテンツ設計

### 4.1 コンテンツタイプ（汎用）

固定の「アーカイブ」「お知らせ」という概念を持たず、すべて「コンテンツタイプ」として統一。ユーザーが自由に定義できる。

```json
// content/_types/news.json
{
  "id": "news",
  "label": "お知らせ",
  "slug": "news",
  "order": "date_desc",
  "hasCategory": true,
  "hasTag": true,
  "hasThumbnail": true,
  "hasDate": true,
  "pagination": 10,
  "fields": [
    { "key": "title", "label": "タイトル", "type": "text", "required": true },
    { "key": "body", "label": "本文", "type": "richtext" },
    { "key": "image", "label": "画像", "type": "image" },
    { "key": "file", "label": "添付PDF", "type": "file" }
  ]
}
```

**Zodによるランタイムバリデーション**: 全てのJSONファイルは読み込み時に `safeParse` で検証され、不正なデータはスキップされる。

### 4.2 カスタムフィールドタイプ一覧

**テキスト系**: `text` / `textarea` / `richtext`（Editor.js） / `number` / `url` / `email`

**日付系**: `date` / `datetime` / `daterange`

**メディア系**: `image`（自動WebP変換） / `imagelist` / `file`

**選択系**: `select` / `multiselect` / `radio` / `checkbox` / `toggle`

**構造系**: `relation` / `repeater` / `group`

**特殊**: `year` / `color` / `hidden`

### 4.3 条件付き表示（showIf）

```json
{
  "key": "file",
  "label": "添付ファイル",
  "type": "file",
  "showIf": { "field": "has_file", "value": true }
}
```

### 4.4 コンテンツの保存形式

```json
// content/news/2025-04-08-001/ja.json
{
  "id": "2025-04-08-001",
  "title": "令和7年度事業計画を公開しました",
  "category": "お知らせ",
  "tags": ["事業計画", "令和7年度"],
  "status": "published",
  "publishedAt": "2025-04-08",
  "body": "<p>本文...</p>",
  "_editorJson": { "blocks": [...] },
  "_meta": {
    "createdAt": "2025-04-08",
    "updatedAt": "2025-04-08",
    "author": "山田太郎"
  }
}
```

- `body`: Editor.js JSONから変換されたHTML（書き出し用）
- `_editorJson`: Editor.jsのブロックデータ（編集用・次回読み込み時に使用）

**コンテンツのステータス**: `draft` / `published` / `archived`

---

## 5. エディタ（Editor.js）

### 5.1 利用可能なブロック

| ブロック | プラグイン          | 用途                                    |
| -------- | ------------------- | --------------------------------------- |
| 見出し   | @editorjs/header    | H2〜H4                                  |
| 段落     | 標準                | テキスト                                |
| リスト   | @editorjs/list      | 箇条書き・番号付き                      |
| 画像     | @editorjs/image     | D&Dまたはファイルピッカー、自動WebP変換 |
| 引用     | @editorjs/quote     | 引用文                                  |
| コード   | @editorjs/code      | コードブロック                          |
| テーブル | @editorjs/table     | 表                                      |
| 区切り線 | @editorjs/delimiter | 区切り                                  |
| 埋め込み | @editorjs/embed     | YouTube・Vimeo                          |

### 5.2 画像アップロードフロー

```
ユーザーが画像を選択 or D&D
  ↓
OffscreenCanvas で WebP 変換・リサイズ・EXIF除去
  ↓
assets/_originals/ に元画像バックアップ
assets/images/ に最適化済み画像を保存
  ↓
Base64 Data URLでエディタに即時表示
  ↓
保存時: _editorJson にブロックデータとして記録
書き出し時: Data URL → /assets/images/xxx.webp に変換
```

### 5.3 JSON → HTML 変換

Editor.jsのJSON出力は書き出し時に `editorJsonToHtml()` でHTMLに変換される。この変換はHandlebarsテンプレートに渡す前に実行される。

---

## 6. 多言語対応

### 6.1 言語定義

```json
// content/languages.json
{
  "default": "ja",
  "locales": [
    { "code": "ja", "label": "日本語", "flag": "🇯🇵" },
    { "code": "en", "label": "English", "flag": "🇺🇸" }
  ]
}
```

### 6.2 翻訳ステータス管理

管理画面のページ編集画面に言語バッジを表示：

- **緑**: 現在編集中の言語
- **チェック**: 翻訳済み
- **黄**: 翻訳中（下書き）
- **赤**: 未翻訳

「JA からコピー」ボタンでデフォルト言語の内容を起点に翻訳作業を開始。

### 6.3 言語切替

言語セレクタを変更すると：

1. 現在の編集内容を自動保存
2. 選択言語のデータを読み込み
3. 該当言語のファイルがなければ空のエディタを表示

### 6.4 書き出し構造

```
dist/
├── index.html              日本語（デフォルト）
├── about/index.html
├── assets/images/          画像（自動コピー）
├── en/
│   ├── index.html
│   └── about/index.html
└── sitemap.xml
```

### 6.5 自動生成SEOタグ

各ページに自動挿入：

- `<link rel="alternate" hreflang="ja">` / `hreflang="en"` / `hreflang="x-default">`
- OGPタグ、canonical URL
- パンくずJSON-LD、記事JSON-LD
- `{{langSwitcher}}` ヘルパーで言語切替リンク生成可能

---

## 7. 書き出し・公開機能

### 7.1 静的HTML書き出し

- 全ページの静的HTML生成（Handlebarsテンプレート）
- Editor.js JSON → HTML 変換
- sitemap.xml・robots.txt自動生成
- meta/OGP・canonical・hreflangなどSEOタグ自動挿入
- JSON-LD構造化データ（パンくず・記事等）自動挿入
- ページネーション（`/page/2/` 形式）自動生成
- 言語スイッチャーHTML自動生成
- `assets/images/` と `assets/files/` を `dist/assets/` に自動コピー

### 7.2 差分抽出（SHA-256）

- Web Crypto APIでSHA-256ハッシュを計算
- `manifest.json` で前回のハッシュと比較
- 変更のあったファイルのみ `changed/` に抽出
- 画像・ファイルも `changed/assets/` にコピー

### 7.3 FTP連携ガイド

書き出し完了後に手順をUI内に表示：

1. FTPソフトを開く
2. `changed/` フォルダの中身をサーバーにアップ
3. 完了後「アップロード完了」をクリック

---

## 8. 画像・ファイル管理

### 8.1 画像最適化

- Editor.jsのファイルピッカーまたはドラッグ&ドロップでアップロード
- `OffscreenCanvas` + `convertToBlob` でWebP自動変換
- リサイズ（最大幅1200px・品質80%）
- Exifメタデータ自動除去
- 元画像を `assets/_originals/` にバックアップ保存
- エディタにはBase64 Data URLで即時表示

### 8.2 ファイル添付

- PDF等のファイルを `assets/files/` に保存
- 差分検知の対象

---

## 9. リビジョン管理

- 保存ごとに `.revisions/{type}/{id}/{lang}/` に自動スナップショット
- `{YYYY-MM-DD}_{HHmm}.json` 形式で保存
- 最大20件保持・古いものから自動削除
- `diff-match-patch` によるテキスト差分表示（`<ins>`/`<del>` ハイライト）
- 右サイドパネルでリビジョン一覧・差分表示・復元

---

## 10. 管理画面設計（Ghost風UI）

### 10.1 デザインシステム

- **サイドバー**: ダーク背景 `#15171a`、グレーテキスト `#7c8b9a`
- **アクセントカラー**: Ghost グリーン `#30cf43`
- **メインエリア**: 白背景、左上角丸
- **フォント**: システムフォントスタック
- **アイコン**: Lucide（SVG、Tree-shake）

### 10.2 全体レイアウト

```
┌────────────┬───────────────────────────────────┐
│ Dark       │  パンくず表示    [JA ▼] [書き出し] │
│ Sidebar    ├───────────────────────────────────┤
│            │                                   │
│  フォルダ変更│  🇯🇵JA  🇺🇸EN(翻訳済)  [JAからコピー]  │
│            │                                   │
│ ページ     │  ページタイトル                    │
│  会社概要   │  ─────────────────────            │
│  トップ    │                                   │
│            │  [Editor.js ブロックエディタ]      │
│ コンテンツ  │  ├ 段落ブロック                    │
│  お知らせ   │  ├ 画像ブロック（D&D対応）        │
│            │  ├ 見出しブロック                  │
│ ─────      │  └ リストブロック                  │
│  設定      │                                   │
│            │                       [更新]      │
│ ユーザー名  │                                   │
└────────────┴───────────────────────────────────┘
```

### 10.3 URLハッシュルーティング

管理画面のビュー状態はURLハッシュに保持：

- `#/pages/about` — ページ編集
- `#/content/news` — コンテンツ一覧
- `#/content/news/2025-04-08-001` — コンテンツ編集
- `#/settings` — 設定

リロード時に同じ画面に復帰。

### 10.4 フォルダハンドル永続化

- `FileSystemDirectoryHandle` をIndexedDBに保存
- リロード時に自動復元（ブラウザの権限確認ダイアログのみ）
- `content/` フォルダを誤選択した場合は警告して拒否

### 10.5 起動方法

1. `cms.html` をEdgeまたはChromeで開く
2. 担当者名を入力
3. 初回のみフォルダ選択ダイアログ（以降はIndexedDBから自動復元）
4. フォルダに `content/` がなければ初期データを自動生成

---

## 11. テンプレート設計

### 11.1 Handlebars.jsテンプレート

テンプレートはすべて `.hbs` 形式。標準提供ヘルパー：

| ヘルパー           | 用途                                            |
| ------------------ | ----------------------------------------------- |
| `formatDate`       | 日付フォーマット                                |
| `truncate`         | 文字数制限                                      |
| `eq` / `gt` / `lt` | 比較演算                                        |
| `breadcrumbJsonLd` | パンくずJSON-LD                                 |
| `articleJsonLd`    | 記事JSON-LD                                     |
| `hreflangTags`     | hreflangタグ自動生成                            |
| `langSwitcher`     | 言語切替リンク                                  |
| `faviconTag`       | ファビコン link タグ                            |
| `latestItems`      | 指定コンテンツタイプの最新 N 件取得（URL 付き） |
| `menuTree`         | メニュー項目をツリー構造（親子）で返す          |
| `isActivePath`     | メニューURLと現在ページのパスが一致するか判定   |
| `isActiveOrParent` | 現在ページがメニューURLまたはその子パスか判定   |

### 11.2 役割分担と 3 層構造

ONE CMS は「編集者」と「製作者」の役割を明確に分けて運用することを推奨します。

| 役割                                   | 担当                   | 触るもの                                                                                                     |
| -------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **編集者**（非エンジニア）             | 日々の運用             | 管理画面のフォーム・一覧のみ。記事の作成・更新、トップページに掲載する情報の選択、画像差し替え、公開         |
| **製作者**（Web 制作会社・エンジニア） | 初期構築・デザイン改修 | `templates/*.hbs`、`content/_types/*.json`、`content/_fieldGroups/*.json`、`content/pages/_config.json`、CSS |
| **開発者**（OSS 貢献者）               | 本体拡張               | テンプレートパックの作成・GitHub で配布、ONE CMS 本体への PR                                                 |

編集者は「どの情報を出すか」を決め、製作者は「どう見せるか」を決めます。レイアウトやデザインは全て製作者の責任範囲で、編集者が触るのはフォームに入った値だけです。

### 11.3 トップページ構築の推奨フロー（製作者向け）

トップページは「製作者が事前に定義したフィールドを、編集者が埋めるだけ」で構成します。以下の手順で構築します。

1. **フィールドグループを定義**: サイドバー「フィールド」から、トップページに必要な情報の入れ物を作成。例: `home-hero`（見出し・画像）、`home-carousel`（スライド配列）、`home-banners`（バナー配列）
2. **ページ設定でトップページに紐付け**: `content/pages/_config.json` の `overrides.index.fieldGroupIds` に上記フィールドグループのIDを列挙。`overrides.index.hasBody` を `false` にして Editor.js を無効化
3. **`templates/home.hbs` を作成**: サイドバー「テンプレート」から `home.hbs` を作成（存在すれば自動的にトップページに使用される）。`{{page.fieldName}}` でフィールド値を参照、`{{#each ...}}` で配列展開、`{{latestItems 'news' 5 lang}}` でコンテンツタイプの最新件を取得
4. **CSS を配置**: `templates/_components/styles.hbs` もしくは別パーシャルで CSS を定義
5. **編集者に引き渡し**: 編集者はサイドバー「トップページ」から、定義したフィールドの値を埋めるだけ

### 11.4 ページ設定の override 形式

`content/pages/_config.json` の構造：

```json
{
  "hasBody": true,
  "fieldGroupIds": [],
  "overrides": {
    "index": {
      "hasBody": false,
      "fieldGroupIds": ["home-hero", "home-carousel", "home-featured-news", "home-banners"]
    },
    "about": {
      "hasBody": true,
      "fieldGroupIds": ["company-profile"]
    }
  }
}
```

- ルートの `hasBody` / `fieldGroupIds` は全ページのデフォルト
- `overrides.{pageId}` で特定のページを上書き
- トップページ以外も個別のフィールド構成を持てる（例: 会社概要ページに専用フィールドを付けるなど）

---

## 12. 開発フェーズ

| Phase       | 内容                                                             | 状態    |
| ----------- | ---------------------------------------------------------------- | ------- |
| **Phase 1** | フォルダ選択・JSON読み書き・固定ページ編集・静的HTML書き出し     | ✅ 完了 |
| **Phase 2** | コンテンツタイプエンジン・差分抽出・画像最適化・ページネーション | ✅ 完了 |
| **Phase 3** | Editor.jsエディタ・リビジョン管理・プレビュー・パンくず          | ✅ 完了 |
| **Phase 4** | 多言語対応・翻訳ステータス管理・hreflang自動生成                 | ✅ 完了 |
| **Phase 5** | テンプレートパック・コンポーネントライブラリ                     | 予定    |
| **Phase 6** | Pagefind統合・外部サービス連携                                   | 予定    |
| **将来**    | クラウド同期版SaaS化・海外展開                                   | 構想中  |

---

## 13. 外部サービス連携（Phase 6予定）

| サービス      | 用途                               |
| ------------- | ---------------------------------- |
| **Pagefind**  | 全文検索（OSS・完全ローカル）      |
| **Formrun**   | お問い合わせフォーム               |
| **DeepL API** | 多言語自動翻訳                     |
| **GAS**       | 予約投稿・バックアップ・翻訳自動化 |

---

## 14. ブラウザ対応

| ブラウザ       | 対応 | 備考                            |
| -------------- | ---- | ------------------------------- |
| Chrome（最新） | ✅   | File System Access API 完全対応 |
| Edge（最新）   | ✅   | 行政PCに多い・推奨              |
| Firefox        | ✗    | File System Access API 未対応   |
| Safari         | ✗    | File System Access API 未対応   |

---

## 15. ライセンス・OSSメンテナンス方針

### 15.1 ライセンス

MIT License

### 15.2 コントリビューション方針

**受け付けるもの**: バグ報告（Issue）/ 機能要望（Issue）/ ドキュメント改善（PR）/ 翻訳 `i18n/*.json`（PR）

**受け付けないもの**: コアコードのPR / 直接サポート依頼 / SLAのある対応要求

---

## 16. 展開可能性

### 16.1 縦展開（業種別テンプレート）

行政・自治体 / 医療・クリニック / 学校・教育機関 / 寺社・宗教法人 / 建設・工務店 / 士業 / 議員・政治家

### 16.2 横展開（書き出し形式）

静的HTML / PDF（広報誌）/ メールマガジンHTML / 印刷用HTML

### 16.3 将来のSaaS化

```
ローカル版（無料・OSS）
  ↓ 物足りなくなったら
クラウド同期版（月額課金）
  ├── 複数PC間でコンテンツ同期
  ├── 複数人編集
  └── 自動バックアップ
```

---

_以上_
