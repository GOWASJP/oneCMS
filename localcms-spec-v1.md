# LocalCMS 仕様書 v1.2

**プロジェクト名：** LocalCMS（仮称・命名検討中）  
**作成日：** 2025年4月  
**更新日：** 2025年4月（テンプレートエンジンをHandlebars.jsに確定）  
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
Notion ライクな直感的編集
  ↓
「公開準備」ボタンで静的 HTML 書き出し
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

|                      | Jekyll/11ty | Grav | Publii | **LocalCMS** |
| -------------------- | ----------- | ---- | ------ | ------------ |
| インストール不要     | ✗           | ✗    | ✗      | **✅**       |
| 非エンジニア対応     | ✗           | △    | ✅     | **✅**       |
| 差分FTP抽出          | ✗           | ✗    | △      | **✅**       |
| カスタムフィールド   | △           | ✅   | △      | **✅**       |
| 多言語対応           | △           | ✅   | △      | **✅**       |
| リビジョン管理       | Git依存     | ✗    | ✗      | **✅**       |
| オフライン完全動作   | △           | ✗    | ✅     | **✅**       |
| セキュリティ審査通過 | ✗           | ✗    | ✗      | **✅**       |

---

## 2. 技術スタック

| 要素                 | 選択               | 理由                                |
| -------------------- | ------------------ | ----------------------------------- |
| ビルド               | Vite               | cms.html 1ファイルに内包可能        |
| スタイル             | Tailwind CSS       | ビルドに内包・オフライン動作        |
| UIインタラクション   | Alpine.js          | サーバー不要・Tailwindと相性◎       |
| エディタ             | TipTap             | リッチテキスト・Markdown双方向対応  |
| Markdownサポート     | @tiptap/markdown   | 双方向Markdown対応（OSS）           |
| テンプレートエンジン | Handlebars.js      | if・ループ・カスタムヘルパー対応    |
| ハッシュ生成         | Web Crypto API     | ブラウザ標準・外部依存なし          |
| 差分表示             | diff-match-patch   | 軽量・ブラウザ動作                  |
| 検索                 | Pagefind           | 静的サイト専用・完全オフライン・OSS |
| ビルド成果物         | cms.html 1ファイル | 完全オフライン動作                  |

### 2.1 不採用の技術

- **HTMX**：サーバーが必要な設計のため、ローカル完結CMSと根本的に相性が悪い
- **SQLite**：行政PCでの利用制限を考慮し不採用
- **Node.js/Bun等のランタイム**：インストール不要の原則に反する
- **Mustache.js**：ロジックレス哲学のためif・比較演算子が使えない
- **Pug**：インデントベースの独自構文のため業者・デザイナーの学習コストが高い

---

## 3. フォルダ構成

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
│   │   ├── pagination.hbs
│   │   ├── carousel.hbs
│   │   ├── tabs.hbs
│   │   └── accordion.hbs
│   ├── page.hbs                固定ページ用
│   ├── list.hbs                一覧ページ用
│   └── detail.hbs              詳細ページ用
│
├── assets/                     ← 画像・CSS・JS
│   ├── images/
│   ├── files/
│   └── _originals/             元画像バックアップ
│
├── dist/                       ← 書き出し先（公開フォルダ）
│   ├── manifest.json           ファイルハッシュ記録
│   ├── index.html
│   ├── en/                     英語
│   └── ...
│
├── changed/                    ← 差分ファイルのみ抽出
│
└── .revisions/                 ← リビジョン履歴
    └── pages/
        └── about/
            ├── ja/
            │   ├── 2025-04-01_1430.json
            │   └── 2025-04-08_1122.json
            └── en/
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
  "icon": "📢",
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

### 4.2 カスタムフィールドタイプ一覧

**テキスト系**

- `text`：1行テキスト
- `textarea`：複数行テキスト
- `richtext`：リッチテキスト（TipTap）
- `number`：数値（単位指定可）
- `url`：URLリンク
- `email`：メールアドレス

**日付系**

- `date`：日付
- `datetime`：日時
- `daterange`：期間（from〜to）

**メディア系**

- `image`：1枚画像（自動最適化）
- `imagelist`：複数画像（最大枚数指定可）
- `file`：ファイル添付

**選択系**

- `select`：単一選択
- `multiselect`：複数選択
- `radio`：ラジオボタン
- `checkbox`：チェックボックス
- `toggle`：ON/OFF

**構造系**

- `relation`：他コンテンツタイプへの参照
- `repeater`：繰り返しフィールド（ACFリピーター相当）
- `group`：フィールドのグループ化（折りたたみ対応）

**特殊**

- `year`：年度
- `color`：カラーピッカー
- `hidden`：非表示（自動入力）

### 4.3 条件付き表示

```json
{
  "key": "has_file",
  "label": "ファイルあり",
  "type": "checkbox"
},
{
  "key": "file",
  "label": "添付ファイル",
  "type": "file",
  "showIf": {
    "field": "has_file",
    "value": true
  }
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
  "_meta": {
    "createdAt": "2025-04-08",
    "updatedAt": "2025-04-08",
    "author": "山田太郎"
  }
}
```

**コンテンツのステータス**

- `draft`：下書き（書き出しに含まれない）
- `preview`：プレビュー（ローカルでのみ確認可）
- `published`：公開中（書き出しに含まれる）
- `archived`：アーカイブ（一覧に出ないが個別URLは存在）

---

## 5. 多言語対応

### 5.1 言語定義

```json
// content/languages.json
{
  "default": "ja",
  "locales": [
    { "code": "ja", "label": "日本語", "flag": "🇯🇵" },
    { "code": "en", "label": "English", "flag": "🇺🇸" },
    { "code": "zh", "label": "中文", "flag": "🇨🇳" }
  ]
}
```

### 5.2 翻訳ステータス管理

```json
// content/pages/about/en.json
{
  "title": "About Us",
  "body": "...",
  "_meta": {
    "status": "translated",
    "translatedAt": "2025-04-08",
    "basedOn": "ja",
    "basedOnUpdated": "2025-04-01"
  }
}
```

**翻訳ステータス**

- `translated`：翻訳済み
- `draft`：翻訳中
- `missing`：未翻訳

### 5.3 書き出し構造

```
dist/
├── index.html              日本語（デフォルト）
├── about/index.html
├── en/
│   ├── index.html
│   └── about/index.html
└── zh/
    ├── index.html
    └── about/index.html
```

### 5.4 自動生成SEOタグ

```html
<html lang="ja">
  <head>
    <link rel="alternate" hreflang="ja" href="https://example.com/about/" />
    <link rel="alternate" hreflang="en" href="https://example.com/en/about/" />
    <link rel="alternate" hreflang="zh" href="https://example.com/zh/about/" />
    <link rel="alternate" hreflang="x-default" href="https://example.com/about/" />
  </head>
</html>
```

### 5.5 フォールバック設定

未翻訳ページへのアクセス時の挙動を設定で選択：

- デフォルト言語にリダイレクト
- デフォルト言語のコンテンツをそのまま表示（推奨）
- 「準備中」ページを表示

---

## 6. 書き出し・公開機能

### 6.1 静的HTML書き出し

- 全ページの静的HTML生成
- sitemap.xml・robots.txt自動生成
- meta/OGP・canonical・hreflangなどSEOタグ自動挿入
- JSON-LD構造化データ（パンくず・記事等）自動挿入
- ページネーション（`/page/2/` 形式）自動生成
- パンくず自動生成
- 言語スイッチャーHTML自動生成

### 6.2 SEO設定フィールド（各ページ）

- タイトルタグ
- meta description
- OGP画像
- canonical URL
- noindexフラグ

### 6.3 差分抽出（更新ファイルの取り出し）

```javascript
// 書き出し時にSHA-256ハッシュを記録
const manifest = {
  'index.html': 'a3f4...',
  'about/index.html': 'b92c...',
}

// 次回書き出し時に比較
if (newHash !== manifest[filePath]) {
  // → changed/ にコピー
}
```

- `manifest.json` がハッシュ管理ファイル（FTP後に必ず保存）
- 書き出し時に `changed/` フォルダへ差分ファイルを自動抽出
- 画像・CSS・JSファイルも差分検知対象

### 6.4 FTP連携

- FTPソフト起動ボタン（`ftp://` スキームでFTPソフトを起動）
- CMS画面内にFTP手順をガイド表示
- 「アップロード完了」ボタンで完了を記録

---

## 7. 画像・ファイル管理

### 7.1 画像最適化

- ドラッグ&ドロップでアップロード
- WebP自動変換
- リサイズ（最大幅・品質を設定画面で指定）
- Exifメタデータ自動除去
- `OffscreenCanvas` + `convertToBlob` 使用でUIフリーズなし
- 元画像を `assets/_originals/` にバックアップ保存

**デフォルト設定**

| 設定     | デフォルト値         |
| -------- | -------------------- |
| 最大幅   | 1200px               |
| 品質     | 80%                  |
| 形式     | WebP                 |
| リサイズ | 長辺を最大幅に収める |
| Exif除去 | ON                   |

### 7.2 ファイル添付

- PDF等のファイルを `assets/files/` に保存
- 本文内にダウンロードリンクとして挿入
- 差分検知の対象（ファイル差し替え時は自動で `changed/` に入る）

---

## 8. リビジョン管理

### 8.1 リビジョンの保存

- 保存ごとに自動リビジョン作成
- `.revisions/` フォルダに `{日付}_{時刻}.json` 形式で保存
- 最大20件保持・古いものから自動削除
- 「公開準備」時は必ずリビジョン保存
- 「公開中」フラグで現在サイトの版を追跡

### 8.2 差分表示

- `diff-match-patch` ライブラリによるテキスト差分表示
- 変更前：`<del>` 、変更後：`<ins>` で色付きハイライト

### 8.3 リビジョン一覧UI

```
履歴
├── 2025-04-08 11:22  山田太郎  [公開中]
├── 2025-04-03 09:10  鈴木花子
└── 2025-04-01 14:30  山田太郎
    ↓ 選択すると差分プレビュー表示
    [この版に戻す]
```

---

## 9. テンプレート設計

### 9.1 3層構造

| 対象   | できること                             |
| ------ | -------------------------------------- |
| 編集者 | カラーテーマ・フォントの選択のみ       |
| 業者   | HTMLテンプレートの直接カスタマイズ     |
| 開発者 | テンプレートパックの作成・GitHubで配布 |

### 9.2 テンプレートエンジン

テンプレートはすべてHandlebars.js形式（`.hbs`）で記述する：

```json
{
  "engine": "handlebars",
  "version": "1.0"
}
```

---

### 9.3 Handlebars.js（デフォルト）

HTMLに近い記法でif・ループ・テンプレート継承が使える。**業者・デザイナーが触りやすい。**

**変数埋め込み**

```html
<!-- _base.hbs -->
<html lang="{{lang}}">
  <head>
    <title>{{page.title}} | {{site.name}}</title>
    <meta name="description" content="{{page.description}}" />
    {{> seo}}
  </head>
  <body>
    {{> nav}} {{{content}}} {{> footer}}
  </body>
</html>
```

**if / else**

```html
{{#if page.image}}
<img src="{{page.image}}" alt="{{page.title}}" />
{{else}}
<img src="/assets/images/default.webp" alt="" />
{{/if}} {{#if (eq page.status "published")}}
<span class="badge">公開中</span>
{{/if}}
```

**ループ（each）**

```html
{{#each projects}}
<article>
  <h2>{{this.title}}</h2>
  <p>{{this.description}}</p>
  {{#if this.image}}
  <img src="{{this.image}}" />
  {{/if}}
</article>
{{/each}} {{! ネストしたループ }} {{#each years}}
<h2>{{this.year}}年度</h2>
{{#each this.projects}}
<p>{{this.title}}</p>
{{/each}} {{/each}}
```

**パーシャル（コンポーネント呼び出し）**

```html
{{> breadcrumb}} {{> pagination total=total current=current}} {{> carousel slides=hero_slides
autoplay=true}}
```

**カスタムヘルパー（標準提供）**

```html
{{! 日付フォーマット }}
<time>{{formatDate publishedAt "YYYY年MM月DD日"}}</time>

{{! 文字数制限 }}
<p>{{truncate body 100}}</p>

{{! 条件比較 }} {{#if (gt projects.length 0)}}
<section class="projects">...</section>
{{/if}} {{! 文字列比較 }} {{#if (eq category "news")}}
<span class="news-badge">お知らせ</span>
{{/if}}
```

**書き出し時にデータを加工してフラグを付与**

```javascript
// 書き出し処理側でフラグを追加
const data = {
  ...content,
  is_published: content.status === 'published',
  has_image: !!content.image,
  is_new: daysSince(content.publishedAt) < 30,
}
```

```html
{{#if is_new}}
<span class="badge badge-new">NEW</span>
{{/if}}
```

### 9.5 content-schema.json

テンプレートパックが必要とするフィールド定義ファイル。CMSが編集画面を自動生成する：

```json
{
  "pages": {
    "index": {
      "fields": [
        { "key": "title", "label": "タイトル", "type": "text" },
        { "key": "hero", "label": "メイン画像", "type": "image" },
        { "key": "body", "label": "本文", "type": "richtext" }
      ]
    }
  }
}
```

### 9.6 コンポーネントライブラリ（初期セット）

**レイアウト系**

- `carousel`：カルーセル（Alpine.js製）
- `hero`：ヒーローバナー
- `grid`：画像グリッド
- `split`：左右分割レイアウト

**ナビゲーション系**

- `breadcrumb`：パンくず
- `pagination`：ページネーション
- `toc`：目次自動生成

**コンテンツ系**

- `tabs`：タブ切り替え
- `accordion`：アコーディオン
- `timeline`：年表・沿革
- `table`：テーブル
- `card-list`：カード一覧

**メディア系**

- `gallery`：フォトギャラリー
- `youtube`：YouTube埋め込み
- `map`：Googleマップ埋め込み

**CTA系**

- `banner`：告知バナー
- `download`：ファイルダウンロード

---

## 10. UX・非エンジニア対応

### 10.1 起動方法

1. `cms.html` をEdgeまたはChromeで開く
2. 初回のみフォルダ選択ダイアログ
3. 以降は自動で同じフォルダを開く（`localStorage` で記憶）

### 10.2 用語変換

| 技術用語 | 表示する言葉           |
| -------- | ---------------------- |
| 書き出し | 公開準備               |
| 差分抽出 | 更新ファイルの取り出し |
| dist/    | 公開フォルダ           |
| assets/  | （非表示）             |
| manifest | （非表示）             |
| JSON     | （非表示）             |

### 10.3 安全設計

- 編集中は自動保存（下書き）
- 「公開準備」前に確認ダイアログ表示
- 操作ログを自動記録（誰がいつ何を変えたか）
- 変更箇所のハイライト表示
- 画像は選ぶだけ・最適化は自動

### 10.4 ログイン

ログイン機能は不要。代わりに初回起動時に担当者名を入力：

```
ご担当者名を入力してください
[山田 太郎          ]
[開始する]
```

担当者名はリビジョン履歴に記録される。

### 10.5 FTPガイド

```
「更新ファイルの取り出し完了」
─────────────────────────────
📁 changed/ フォルダが準備できました

次の手順でアップロードしてください：
1. FFFTPを開く
2. changed/フォルダの中身をサーバーにアップ
3. 完了後「アップロード完了」をクリック
─────────────────────────────
[FFFTPを開く]  [アップロード完了]
```

---

## 11. 管理画面設計

### 11.1 全体レイアウト

```
┌──────────────────────────────────────────┐
│  サイト名         🇯🇵 JA ▼    [公開準備] │
├────────────┬─────────────────────────────┤
│            │                             │
│ サイドバー  │  編集エリア                 │
│            │                             │
│ 📄 固定ページ│                            │
│   トップ   │  ページタイトル             │
│   会社概要  │  ─────────────────         │
│   サービス  │  [タイトル              ]  │
│            │                             │
│ ▼ コンテンツ│  本文                       │
│   📢 お知らせ│  ┌───────────────────┐    │
│   🏗️ 事業実績│  │ WYSIWYG エディタ   │    │
│   + タイプ追加│  └───────────────────┘    │
│            │                             │
│ ⚙️ 設定     │  [保存]                    │
└────────────┴─────────────────────────────┘
```

### 11.2 コンテンツタイプ管理画面

```
コンテンツタイプ管理    [+ 追加]
─────────────────────────────────
📢 お知らせ        10件  [編集]
🏗️ 事業実績        45件  [編集]
👥 メンバー         8件  [編集]
❓ よくある質問    20件  [編集]
```

### 11.3 多言語タブ

```
会社概要  🇯🇵 JA ▼
         ✅ JA  ✅ EN  ⚠️ ZH（未翻訳）

[他言語をコピー]  ← 日本語内容を起点に翻訳作業
```

---

## 12. 外部サービス連携

### 12.1 優先度別連携サービス

**最優先**

| サービス     | 用途                           | 無料枠  |
| ------------ | ------------------------------ | ------- |
| **Pagefind** | 全文検索（OSS・完全ローカル）  | 無料    |
| **Formrun**  | お問い合わせフォーム（日本製） | 月100件 |

**次点**

| サービス      | 用途                                       |
| ------------- | ------------------------------------------ |
| **DeepL API** | 多言語自動翻訳（月50万字無料）             |
| **GAS**       | 予約投稿・バックアップ・翻訳自動化         |
| **Web3Forms** | フォーム（データ非保存・プライバシー重視） |

### 12.2 GAS連携ユースケース

1. **お問い合わせフォーム**：GASがGmailで転送＋スプレッドシートに記録
2. **予約投稿**：スプレッドシートで公開日時を管理・GASが自動更新
3. **自動バックアップ**：公開準備時にGoogleドライブへ自動保存
4. **多言語自動翻訳**：Google翻訳APIで下訳を自動生成
5. **外部データ取り込み**：Googleフォームから市民投稿を承認制で掲載

### 12.3 CMS設定画面での連携設定

```
外部サービス連携
─────────────────────────────────
フォームバックエンド
  ○ Formrun  ○ Web3Forms  ○ GAS  ○ 独自
  URL [                             ]

検索
  ● Pagefind（推奨・無料・OSS）
  ○ Algolia

自動翻訳
  ○ DeepL  ○ Google翻訳  ○ GAS
  APIキー [                         ]
```

---

## 13. SEO機能

### 13.1 自動生成

- タイトルタグ・meta description
- OGP（Open Graph Protocol）タグ
- canonical URL
- hreflang（多言語）
- sitemap.xml（全ページ・ページネーション対応）
- robots.txt
- パンくずのJSON-LD構造化データ
- 記事ページのJSON-LD（Article・NewsArticle）

### 13.2 WordPressとの比較

| 項目             | LocalCMS          | WordPress                 |
| ---------------- | ----------------- | ------------------------- |
| 表示速度         | ✅ 純粋な静的HTML | △ PHP処理あり             |
| クローラビリティ | ✅ 完全なHTML     | △ JS依存リスク            |
| Core Web Vitals  | ✅ 軽量           | △ プラグイン次第          |
| 不要コード       | ✅ ゼロ           | △ WordPress固有コード混入 |

---

## 14. WordPressと比べてできないこと

### 構造的に不可（解決困難）

| 機能                 | 代替策                        |
| -------------------- | ----------------------------- |
| お問い合わせフォーム | Formrun・Web3Forms・GASで代替 |
| 会員機能・ログイン   | 静的HTMLでは不可              |
| eコマース            | 完全に不可                    |
| コメント機能         | giscus等で代替                |

### 運用上の制限

| 機能                 | 理由                               |
| -------------------- | ---------------------------------- |
| 出先・スマホから更新 | ローカル専用のため不可             |
| 複数人同時編集       | ローカルファイルのため競合が起きる |
| 予約投稿             | GAS連携で代替可能                  |
| 検索機能             | Pagefindで代替可能                 |

---

## 15. ライセンス・OSSメンテナンス方針

### 15.1 ライセンス

MIT License

### 15.2 コントリビューション方針

**受け付けるもの**

- バグ報告（Issue）
- 機能要望（Issue）
- ドキュメント改善（PR歓迎）
- 翻訳ファイル `i18n/*.json`（PR歓迎）

**受け付けないもの**

- コアコードのPR
- 直接サポート依頼
- SLAのある対応要求

### 15.3 バグ対応フロー

```
バグ報告のIssue
  ↓
担当者が再現確認
  ↓
AIに「このIssueのバグを修正して」と依頼
  ↓
修正コードをコミット・Issueをclose
```

### 15.4 多言語対応

管理画面UIの多言語化は `i18n/` フォルダのJSONファイルで管理：

```
i18n/
├── ja.json   ← デフォルト
├── en.json
├── zh.json
└── ko.json
```

コミュニティが翻訳を追加できる構造。

---

## 16. 開発フェーズ

| Phase       | 内容                                                             | 期間目安 |
| ----------- | ---------------------------------------------------------------- | -------- |
| **Phase 1** | フォルダ選択・JSON読み書き・固定ページ編集・シンプル書き出し     | 3〜4日   |
| **Phase 2** | コンテンツタイプエンジン・差分抽出・画像最適化・ページネーション | 2日      |
| **Phase 3** | TipTap・リビジョン管理・プレビュー・パンくず                     | 2日      |
| **Phase 4** | 多言語対応・翻訳ステータス管理                                   | 2〜3日   |
| **Phase 5** | テンプレートパック・コンポーネントライブラリ                     | 別途     |
| **Phase 6** | Pagefind統合・外部サービス連携                                   | 別途     |
| **将来**    | クラウド同期版SaaS化・海外展開                                   | 別途     |

---

## 17. 展開可能性

### 17.1 縦展開（業種別テンプレート）

同じCMSエンジンにテンプレートを差し替えるだけで別製品になる：

- 行政・自治体向け
- 医療・クリニック向け
- 学校・教育機関向け
- 寺社・宗教法人向け
- 建設・工務店向け
- 士業（税理士・行政書士）向け
- 議員・政治家向け

### 17.2 横展開（書き出し形式）

同じ編集画面から複数形式に書き出し：

- 静的HTML（現在の構想）
- PDF（広報誌・議会だより）
- メールマガジンHTML
- 印刷用HTML

### 17.3 GOWASエコシステムとの連携

- **petanco連携**：イベントページからスタンプラリー埋め込みまでのワークフロー統合
- **MyQuest連携**：サイトにゲーミフィケーション要素を追加

### 17.4 将来のSaaS化

```
ローカル版（無料・OSS）
  ↓ 物足りなくなったら
クラウド同期版（月額課金）
  ├── 複数PC間でコンテンツ同期
  ├── 複数人編集
  └── 自動バックアップ
```

### 17.5 海外展開

- popo.talkで実証済みの中東市場
- 東南アジア（政府系サイト需要大）
- IT基盤が弱い地域ほどインストール不要の価値が高い

---

## 18. ブラウザ対応

| ブラウザ       | 対応 | 備考                            |
| -------------- | ---- | ------------------------------- |
| Chrome（最新） | ✅   | File System Access API 完全対応 |
| Edge（最新）   | ✅   | 行政PCに多い・推奨              |
| Firefox        | ✗    | File System Access API 未対応   |
| Safari         | ✗    | File System Access API 未対応   |

---

_以上_
