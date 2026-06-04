// テンプレートエディタの右パネル用リファレンスデータ・スニペット（純粋な静的データ）

/** フィールドタイプ選択ピッカーのカテゴリ（非エンジニア向けの分類） */
export const FIELD_TYPE_CATEGORIES = [
  { id: 'text', label: 'テキスト' },
  { id: 'choice', label: '選択' },
  { id: 'media', label: 'メディア' },
  { id: 'datenum', label: '日付・数値' },
  { id: 'advanced', label: 'リンク・高度' },
]

/** フィールドタイプのカタログ。
 *  id は内部値、label は日本語名、icon は Lucide 名（data-lucide）、desc は一言説明、category は分類。 */
export const FIELD_TYPES = [
  {
    id: 'text',
    label: '1行テキスト',
    icon: 'type',
    desc: '短い文章・見出しなど',
    category: 'text',
  },
  {
    id: 'textarea',
    label: '複数行テキスト',
    icon: 'align-left',
    desc: '改行を含む説明文',
    category: 'text',
  },
  {
    id: 'richtext',
    label: 'リッチテキスト',
    icon: 'file-text',
    desc: '装飾・画像付きの本文',
    category: 'text',
  },
  {
    id: 'select',
    label: 'プルダウン',
    icon: 'chevron-down-square',
    desc: '一覧から1つ選ぶ',
    category: 'choice',
  },
  {
    id: 'radio',
    label: 'ラジオボタン',
    icon: 'circle-dot',
    desc: '並べて1つ選ぶ',
    category: 'choice',
  },
  {
    id: 'checkbox',
    label: 'チェックボックス',
    icon: 'square-check',
    desc: 'ON / OFF の切り替え',
    category: 'choice',
  },
  {
    id: 'toggle',
    label: 'トグル',
    icon: 'toggle-left',
    desc: 'ON / OFF スイッチ',
    category: 'choice',
  },
  {
    id: 'multiselect',
    label: '複数選択',
    icon: 'list-checks',
    desc: '複数をまとめて選ぶ',
    category: 'choice',
  },
  { id: 'image', label: '画像', icon: 'image', desc: '1枚の画像', category: 'media' },
  { id: 'imagelist', label: '画像リスト', icon: 'images', desc: '複数の画像', category: 'media' },
  { id: 'file', label: 'ファイル', icon: 'paperclip', desc: 'PDF などの添付', category: 'media' },
  { id: 'date', label: '日付', icon: 'calendar', desc: '年月日', category: 'datenum' },
  {
    id: 'datetime',
    label: '日時',
    icon: 'calendar-clock',
    desc: '年月日＋時刻',
    category: 'datenum',
  },
  {
    id: 'daterange',
    label: '期間',
    icon: 'calendar-range',
    desc: '開始〜終了',
    category: 'datenum',
  },
  { id: 'year', label: '年', icon: 'calendar-days', desc: '西暦の年のみ', category: 'datenum' },
  { id: 'number', label: '数値', icon: 'hash', desc: '数字', category: 'datenum' },
  { id: 'color', label: 'カラー', icon: 'palette', desc: '色を選ぶ', category: 'datenum' },
  { id: 'url', label: 'URL', icon: 'link', desc: 'リンク先アドレス', category: 'advanced' },
  { id: 'email', label: 'メール', icon: 'mail', desc: 'メールアドレス', category: 'advanced' },
  {
    id: 'relation',
    label: '関連コンテンツ',
    icon: 'link-2',
    desc: '他の投稿と紐付け',
    category: 'advanced',
  },
  {
    id: 'repeater',
    label: '繰り返し',
    icon: 'repeat',
    desc: '同じ項目を複数',
    category: 'advanced',
  },
  { id: 'group', label: 'グループ', icon: 'boxes', desc: '項目のまとまり', category: 'advanced' },
  {
    id: 'hidden',
    label: '隠しフィールド',
    icon: 'eye-off',
    desc: '画面に出さない値',
    category: 'advanced',
  },
]

export const CATEGORY_SNIPPETS = [
  { label: '現在の記事のカテゴリ', code: '{{page.category}}' },
  {
    label: 'カテゴリバッジ（条件付き）',
    code: '{{#if page.category}}\n  <span class="badge">{{page.category}}</span>\n{{/if}}',
  },
  {
    label: 'カテゴリで表示切替',
    code: '{{#if (eq page.category "お知らせ")}}\n  {{!-- お知らせカテゴリのみ --}}\n{{/if}}',
  },
  {
    label: '一覧でカテゴリ付きリスト',
    code: '{{#each items}}\n  <article>\n    <h3><a href="{{url}}">{{page.title}}</a></h3>\n    {{#if page.category}}<span class="badge">{{page.category}}</span>{{/if}}\n  </article>\n{{/each}}',
  },
]

export const TAG_SNIPPETS = [
  {
    label: '現在の記事のタグ一覧',
    code: '{{#each page.tags}}\n  <span class="tag">{{this}}</span>\n{{/each}}',
  },
  {
    label: 'タグがあれば表示',
    code: '{{#if page.tags.length}}\n  <div class="tags">\n    {{#each page.tags}}\n      <span class="tag">{{this}}</span>\n    {{/each}}\n  </div>\n{{/if}}',
  },
  {
    label: 'タグをリンク付きで表示',
    code: '{{#each page.tags}}\n  <a href="?tag={{this}}" class="tag">{{this}}</a>\n{{/each}}',
  },
  {
    label: '一覧でタグ付きリスト',
    code: '{{#each items}}\n  <article>\n    <h3><a href="{{url}}">{{page.title}}</a></h3>\n    {{#each page.tags}}<span class="tag">{{this}}</span>{{/each}}\n  </article>\n{{/each}}',
  },
]

export const TEMPLATE_REFERENCE_GROUPS = [
  {
    id: 'getting-started',
    label: 'テーマの構成と作り方',
    items: [
      {
        label: 'テーマの構成（themes/<id>/）',
        code: `themes/my-theme/
  theme.json          # テーマの識別情報（manifest）
  _base.hbs           # 全ページ共通の外枠
  home.hbs            # フロントページ（/）
  page.hbs            # 固定ページ
  list.hbs            # 投稿タイプ一覧
  detail.hbs          # 投稿タイプ詳細
  _components/        # {{> name}} で呼ぶ再利用パーシャル
    head.hbs header.hbs footer.hbs nav.hbs styles.hbs ...`,
        note: '1テーマ＝1フォルダの差し替え可能なパッケージ。CMS はアクティブテーマのフォルダを読んで公開サイトを生成します。',
      },
      {
        label: 'theme.json（manifest）',
        code: `{
  "id": "my-theme",
  "name": "My Theme",
  "version": "1.0",
  "author": "you",
  "engine": "handlebars",
  "apiVersion": "1"
}`,
        note: 'テーマの識別情報のみ。色やフォントはここではなく styles.hbs(CSS) に直接書きます。',
      },
      {
        label: '_base.hbs（共通の外枠）',
        code: `<!doctype html>
<html lang="{{lang}}">
<head>{{> head}}</head>
<body>
  {{> header}}
  <main class="site-main">{{{content}}}</main>
  {{> footer}}
</body>
</html>`,
        note: '各ページ本体は {{{content}}}（三重括弧）に差し込まれます。<head> には書き出し時に generator/ライセンス透かしも自動注入されます。',
      },
      {
        label: 'ページ本体（種別ごとに使い分け）',
        code: `home.hbs    →  フロントページ（/）
page.hbs    →  固定ページ
list.hbs    →  投稿タイプの一覧
detail.hbs  →  投稿タイプの詳細`,
        note: 'home.hbs が無ければ page.hbs にフォールバック。各種別で使える変数は「ページ種別ごとの変数」を参照。',
      },
      {
        label: 'コンポーネント（再利用パーシャル）',
        code: `{{> head}}   {{> header}}   {{> footer}}   {{> nav}}   {{> styles}}`,
        note: '_components/<name>.hbs を {{> name}} で呼び出します。テンプレートに無いものは最小デフォルトが補われます。',
      },
      {
        label: 'レンダリングの流れ',
        code: `本体(home/page/list/detail) を描画
  → {{{content}}} に差し込み
  → _base.hbs で全体を包む
  → <head> に透かしを注入して書き出し`,
        note: 'pageType（page / list / detail）で本体テンプレートが選ばれます。',
      },
      {
        label: '最小テーマの雛形（_base + page）',
        code: `<!-- _base.hbs -->
<!doctype html><html lang="{{lang}}"><head>
<meta charset="utf-8"><title>{{page.title}} | {{site.name}}</title>
{{> styles}}
</head><body>{{{content}}}</body></html>

<!-- page.hbs -->
<article><h1>{{page.title}}</h1>{{{page.body}}}</article>`,
        note: 'ゼロから始めるなら、まず _base.hbs と page.hbs だけでも動きます。',
      },
      {
        label: '色・フォントの定義（styles.hbs）',
        code: `<style>
  :root{
    --color-primary:#2563eb;
    --font-body: system-ui, sans-serif;
  }
  body{ font-family:var(--font-body); }
  a{ color:var(--color-primary); }
</style>`,
        note: '見た目は CMS 設定ではなくテーマ内の CSS で直接定義します（_components/styles.hbs など）。',
      },
    ],
  },
  {
    id: 'page-types',
    label: 'ページ種別ごとの変数',
    items: [
      {
        label: '全種別で共通',
        code: `{{site.name}} {{site.url}} {{lang}} {{defaultLang}} {{pagePath}}
{{#each breadcrumb}}{{label}}{{/each}}
{{#each locales}}{{code}}{{/each}}`,
        note: 'site / lang / defaultLang / pagePath / breadcrumb / locales はどのページでも使えます。',
      },
      {
        label: '固定ページ（home.hbs / page.hbs）',
        code: `{{page.title}}
{{{page.body}}}
{{page.slug}}
{{#if isHome}}…フロントページ専用…{{/if}}`,
        note: 'page（title / slug / body / _meta.updatedAt / _meta.author …）と、フロントページか判定する isHome。',
      },
      {
        label: '一覧（list.hbs）',
        code: `<h1>{{type.label}}</h1>
{{#each items}}
  <a href="{{url}}">{{title}}</a>
{{/each}}
ページ {{current}} / {{total}}
{{#if prevUrl}}<a href="{{prevUrl}}">前へ</a>{{/if}}
{{#if nextUrl}}<a href="{{nextUrl}}">次へ</a>{{/if}}`,
        note: 'type / items / current / total / pages / prevUrl / nextUrl。',
      },
      {
        label: '詳細（detail.hbs）',
        code: `<h1>{{page.title}}</h1>
<time>{{formatDate page.publishedAt 'YYYY年MM月DD日'}}</time>
{{{page.body}}}
{{page.category}}
{{#each page.tags}}<span>{{this}}</span>{{/each}}`,
        note: 'page = そのコンテンツ項目。投稿タイプで定義したフィールドも page.<キー> で参照できます。',
      },
    ],
  },
  {
    id: 'variables',
    label: 'サイト共通変数',
    items: [
      { label: 'サイト名', code: '{{site.name}}' },
      { label: 'サイトURL', code: '{{site.url}}' },
      { label: '説明', code: '{{site.description}}' },
      {
        label: 'サイトロゴ（フォールバック付き）',
        code: `{{#if site.logo}}
  <img src="{{site.logo}}" alt="{{site.name}}" class="site-logo">
{{else}}
  {{site.name}}
{{/if}}`,
      },
      { label: 'ファビコン パス', code: '{{site.favicon}}' },
      { label: '現在の言語コード', code: '{{lang}}' },
      { label: 'デフォルト言語コード', code: '{{defaultLang}}' },
      { label: '現在のページパス', code: '{{pagePath}}' },
      {
        label: 'メニュー（ID 指定で取得）',
        code: `{{#each site.menus.main}}
  <a href="{{url}}">{{label}}</a>
{{/each}}`,
        note: 'main を任意のメニュー ID に置き換え',
      },
    ],
  },
  {
    id: 'page',
    label: 'ページ・コンテンツ変数',
    items: [
      { label: 'タイトル', code: '{{page.title}}' },
      { label: 'スラッグ', code: '{{page.slug}}' },
      {
        label: 'フロントページか',
        code: '{{#if isHome}}…{{/if}}',
        note: '設定で選んだ / にマップされるページのとき true',
      },
      {
        label: '本文 HTML',
        code: '{{{page.body}}}',
        note: '三重括弧でエスケープせず HTML として出力',
      },
      { label: '公開日', code: '{{page.publishedAt}}' },
      { label: 'カテゴリ', code: '{{page.category}}' },
      {
        label: 'タグ（ループ）',
        code: `{{#each page.tags}}
  <span class="tag">{{this}}</span>
{{/each}}`,
      },
      { label: 'メイン画像', code: '{{page.image}}' },
      { label: '更新日', code: '{{page._meta.updatedAt}}' },
      { label: '著者', code: '{{page._meta.author}}' },
      {
        label: 'パンくず',
        code: `{{#each breadcrumb}}
  {{#if url}}<a href="{{url}}">{{label}}</a>{{else}}<span>{{label}}</span>{{/if}}
{{/each}}`,
      },
    ],
  },
  {
    id: 'helpers',
    label: 'Handlebars ヘルパー',
    items: [
      {
        label: 'formatDate（日付フォーマット）',
        code: "{{formatDate page.publishedAt 'YYYY年MM月DD日'}}",
        note: 'YYYY / MM / DD のプレースホルダ',
      },
      {
        label: 'truncate（文字数制限）',
        code: '{{truncate page.body 120}}',
        note: 'HTML タグを除去して指定文字数まで',
      },
      {
        label: 'eq / gt / lt（比較）',
        code: '{{#if (eq page.status "published")}}公開中{{/if}}',
      },
      {
        label: 'faviconTag（link rel="icon"）',
        code: '{{faviconTag site}}',
        note: 'head 内推奨。MIME タイプも自動付与',
      },
      {
        label: 'hreflangTags（SEO）',
        code: '{{hreflangTags pagePath locales defaultLang site.url}}',
        note: '多言語サイトの hreflang を head 内に',
      },
      {
        label: 'langSwitcher（言語切替リンク）',
        code: '{{langSwitcher pagePath locales defaultLang lang}}',
      },
      {
        label: 'breadcrumbJsonLd（JSON-LD）',
        code: '{{breadcrumbJsonLd breadcrumb site.url}}',
        note: '構造化データ。head 内推奨',
      },
      {
        label: 'articleJsonLd（記事 JSON-LD）',
        code: '{{articleJsonLd page site}}',
      },
      {
        label: 'autoDescription（自動 description）',
        code: '{{autoDescription page}}',
        note: 'meta description / og:description を自動生成',
      },
      {
        label: 'latestItems（コンテンツタイプ最新N件）',
        code: `{{#each (latestItems 'news' 5 lang)}}
  <li>
    <a href="{{url}}">
      <time>{{formatDate publishedAt}}</time>
      <span>{{title}}</span>
    </a>
  </li>
{{/each}}`,
        note: '第1引数: タイプ id, 第2引数: 件数, 第3引数: lang',
      },
    ],
  },
  {
    id: 'alpine',
    label: 'Alpine.js インタラクション',
    items: [
      {
        label: 'ハンバーガーメニュー',
        code: `<div x-data="{ open: false }">
  <button @click="open = !open" class="menu-toggle">
    <span x-show="!open">MENU</span>
    <span x-show="open">閉じる</span>
  </button>
  <nav x-show="open" x-transition>
    {{> nav}}
  </nav>
</div>`,
        note: 'スマホ向け。CSS で @media + display:none と組み合わせてPC時は常時表示にする',
      },
      {
        label: 'ドロップダウン',
        code: `<div x-data="{ open: false }" class="relative">
  <button @click="open = !open">メニュー ▾</button>
  <ul x-show="open" @click.outside="open = false"
      x-transition class="absolute bg-white shadow-lg rounded">
    <li><a href="#">項目1</a></li>
    <li><a href="#">項目2</a></li>
  </ul>
</div>`,
      },
      {
        label: 'モーダル',
        code: `<div x-data="{ show: false }">
  <button @click="show = true">開く</button>
  <div x-show="show" x-transition.opacity
       class="fixed inset-0 bg-black/50 flex items-center justify-center"
       @click="show = false">
    <div class="bg-white rounded-lg p-6 max-w-md" @click.stop>
      <h2>タイトル</h2>
      <p>内容</p>
      <button @click="show = false">閉じる</button>
    </div>
  </div>
</div>`,
      },
      {
        label: 'アコーディオン / FAQ',
        code: `<div x-data="{ active: null }">
  <div>
    <button @click="active = active === 1 ? null : 1"
            class="w-full text-left font-bold py-2 border-b">
      Q. 質問1
    </button>
    <div x-show="active === 1" x-collapse>
      <p class="py-2">回答1</p>
    </div>
  </div>
  <div>
    <button @click="active = active === 2 ? null : 2"
            class="w-full text-left font-bold py-2 border-b">
      Q. 質問2
    </button>
    <div x-show="active === 2" x-collapse>
      <p class="py-2">回答2</p>
    </div>
  </div>
</div>`,
        note: 'x-collapse は Alpine Collapse プラグインが必要。無ければ x-show + x-transition で代用',
      },
      {
        label: 'タブ切替',
        code: `<div x-data="{ tab: 'tab1' }">
  <div class="flex border-b">
    <button @click="tab = 'tab1'"
            :class="tab === 'tab1' ? 'border-b-2 border-blue-500 font-bold' : ''"
            class="px-4 py-2">タブ1</button>
    <button @click="tab = 'tab2'"
            :class="tab === 'tab2' ? 'border-b-2 border-blue-500 font-bold' : ''"
            class="px-4 py-2">タブ2</button>
  </div>
  <div x-show="tab === 'tab1'">タブ1の内容</div>
  <div x-show="tab === 'tab2'">タブ2の内容</div>
</div>`,
      },
      {
        label: 'トップに戻るボタン',
        code: `<button x-data="{ show: false }"
        @scroll.window="show = window.scrollY > 300"
        x-show="show" x-transition
        @click="window.scrollTo({top:0, behavior:'smooth'})"
        class="fixed bottom-6 right-6 bg-blue-500 text-white p-3 rounded-full shadow-lg">
  ▲
</button>`,
      },
    ],
  },
  {
    id: 'navigation',
    label: 'ナビゲーション',
    items: [
      {
        label: 'メニューツリー（サブメニュー対応）',
        code: `{{#each (menuTree site.nav)}}
<li class="{{#if (isActivePath url ../pagePath)}}current-menu-item{{/if}}">
  <a href="{{url}}">{{label}}</a>
  {{#if children.length}}
  <ul class="sub-menu">
    {{#each children}}
    <li><a href="{{url}}">{{label}}</a></li>
    {{/each}}
  </ul>
  {{/if}}
</li>
{{/each}}`,
        note: 'menuTree でメニューの親子関係をツリーに展開。site.nav または site.menus.xxx を渡す',
      },
      {
        label: 'カレントページ判定',
        code: '{{#if (isActivePath url pagePath)}}current-menu-item{{/if}}',
        note: 'メニュー項目の url と現在の pagePath が一致すれば true',
      },
      {
        label: 'カレントまたは親パス判定',
        code: '{{#if (isActiveOrParent url pagePath)}}current-menu-ancestor{{/if}}',
        note: '子ページにいるとき親メニューもハイライトする。例: /service/ の子 /service/sub/ にいるとき /service/ が true',
      },
      {
        label: 'メニュー（ID指定・フラット）',
        code: `{{#each site.menus.main}}
  <a href="{{url}}">{{label}}</a>
{{/each}}`,
        note: 'サブメニュー不要の場合はフラットにループ。main はメニュー ID',
      },
      {
        label: 'フッターナビ',
        code: `<ul class="footnav">
  {{#each site.menus.footer}}
    <li><a href="{{url}}">{{label}}</a></li>
  {{/each}}
</ul>`,
        note: 'フッター用メニューを別メニュー ID で管理',
      },
    ],
  },
  {
    id: 'taxonomy',
    label: 'カテゴリ・タグ',
    items: [
      {
        label: '現在の記事のカテゴリ',
        code: '{{page.category}}',
      },
      {
        label: 'カテゴリバッジ（条件付き）',
        code: `{{#if page.category}}
  <span class="badge">{{page.category}}</span>
{{/if}}`,
      },
      {
        label: 'カテゴリで表示を切替',
        code: `{{#if (eq page.category "お知らせ")}}
  {{!-- お知らせカテゴリのみ表示 --}}
{{/if}}`,
        note: 'カテゴリ名をそのまま比較',
      },
      {
        label: 'タグ一覧（ループ）',
        code: `{{#each page.tags}}
  <span class="tag">{{this}}</span>
{{/each}}`,
      },
      {
        label: 'タグがあれば表示',
        code: `{{#if page.tags.length}}
  <div class="tags">
    {{#each page.tags}}
      <span class="tag">{{this}}</span>
    {{/each}}
  </div>
{{/if}}`,
      },
      {
        label: 'タグをリンク付きで表示',
        code: `{{#each page.tags}}
  <a href="?tag={{this}}" class="tag">{{this}}</a>
{{/each}}`,
        note: '静的サイトではフィルタリングは JS 側で実装が必要',
      },
      {
        label: '一覧でカテゴリ＋タグ表示',
        code: `{{#each items}}
  <article>
    <h3><a href="{{url}}">{{page.title}}</a></h3>
    {{#if page.category}}<span class="badge">{{page.category}}</span>{{/if}}
    {{#each page.tags}}<span class="tag">{{this}}</span>{{/each}}
  </article>
{{/each}}`,
        note: 'list.hbs の items ループ内で使用',
      },
    ],
  },
  {
    id: 'conditions',
    label: '条件分岐',
    items: [
      {
        label: 'ページ種別で分岐（_base.hbs 等で使用）',
        code: `{{#if (eq pageType "page")}}
  {{!-- 固定ページ --}}
{{/if}}
{{#if (eq pageType "detail")}}
  {{!-- 投稿タイプ詳細 --}}
{{/if}}
{{#if (eq pageType "list")}}
  {{!-- 投稿タイプ一覧 --}}
{{/if}}`,
        note: 'pageType は page / detail / list のいずれか',
      },
      {
        label: '特定の固定ページだけ表示',
        code: `{{#if (eq page.slug "about")}}
  {{!-- 会社概要ページ専用 --}}
{{/if}}`,
      },
      {
        label: '特定の投稿タイプだけ表示',
        code: `{{#if (eq type.id "news")}}
  {{!-- お知らせ専用 --}}
{{/if}}`,
        note: 'detail.hbs / list.hbs で使用。type.id でタイプを判定',
      },
      {
        label: 'サイドバー付きレイアウト（特定タイプのみ）',
        code: `<div class="{{#if (eq type.id "news")}}layout-with-sidebar{{else}}layout-single{{/if}}">
  <main>{{{content}}}</main>
  {{#if (eq type.id "news")}}
  <aside class="sidebar">
    {{!-- サイドバーコンテンツ --}}
  </aside>
  {{/if}}
</div>`,
        note: '_base.hbs で使用。news のみサイドバー付き',
      },
      {
        label: 'ギャラリーレイアウト（特定タイプ）',
        code: `{{#if (eq type.id "works")}}
<div class="gallery-grid">
  {{#each page.images}}
    <figure>
      <img src="{{this}}" alt="">
    </figure>
  {{/each}}
</div>
{{else}}
  {{{page.body}}}
{{/if}}`,
        note: 'detail.hbs で works タイプはギャラリー、他は通常の本文',
      },
      {
        label: 'フィールドの有無で表示切替',
        code: `{{#if page.image}}
  <img src="{{page.image}}" alt="{{page.title}}">
{{/if}}`,
      },
      {
        label: '言語で分岐',
        code: `{{#if (eq lang "ja")}}
  <p>日本語のみ表示</p>
{{/if}}
{{#if (eq lang "en")}}
  <p>English only</p>
{{/if}}`,
      },
      {
        label: '複数条件（and / or）',
        code: `{{#if (and page.image (eq type.id "works"))}}
  {{!-- 実績タイプ かつ 画像がある場合のみ --}}
{{/if}}

{{#if (or (eq pageType "page") (eq pageType "detail"))}}
  {{!-- 固定ページまたは詳細ページ --}}
{{/if}}`,
      },
      {
        label: 'フロントページかどうか',
        code: `{{#if isHome}}
  {{!-- フロントページ（/ にマップされるページ） --}}
{{else}}
  {{!-- フロントページ以外 --}}
{{/if}}`,
      },
    ],
  },
  {
    id: 'snippets',
    label: 'よく使うスニペット',
    items: [
      {
        label: 'お知らせ最新リスト',
        code: `<ul class="news-list">
  {{#each (latestItems 'news' 10 lang)}}
    <li>
      <a href="{{url}}">
        <time datetime="{{publishedAt}}">{{formatDate publishedAt 'YYYY-MM-DD'}}</time>
        <span>{{title}}</span>
      </a>
    </li>
  {{/each}}
</ul>`,
      },
      {
        label: '画像 + キャプション（条件付き）',
        code: `{{#if page.image}}
<figure>
  <img src="{{page.image}}" alt="{{page.title}}">
  {{#if page.caption}}<figcaption>{{page.caption}}</figcaption>{{/if}}
</figure>
{{/if}}`,
      },
      {
        label: 'ヒーローセクション',
        code: `<section class="hero">
  {{#if page.heroImage}}<img src="{{page.heroImage}}" alt="">{{/if}}
  <div class="container">
    <h1>{{page.heroHeading}}</h1>
    <p>{{page.heroSubheading}}</p>
  </div>
</section>`,
      },
      {
        label: 'バナーグリッド',
        code: `<ul class="banner-grid">
  {{#each page.banners}}
    <li><a href="{{link}}"><img src="{{image}}" alt="{{alt}}"></a></li>
  {{/each}}
</ul>`,
      },
      {
        label: 'カルーセル',
        code: `<div class="carousel">
  {{#each page.carousel}}
    <figure>
      {{#if link}}<a href="{{link}}">{{/if}}
      <img src="{{image}}" alt="{{caption}}">
      {{#if caption}}<figcaption>{{caption}}</figcaption>{{/if}}
      {{#if link}}</a>{{/if}}
    </figure>
  {{/each}}
</div>`,
      },
      {
        label: 'ページネーション',
        code: `{{#if (gt total 1)}}
<nav class="pagination">
  {{#if prevUrl}}<a href="{{prevUrl}}">前へ</a>{{/if}}
  {{#each pages}}
    {{#if (eq this.number ../current)}}
      <span aria-current="page">{{this.number}}</span>
    {{else}}
      <a href="{{this.url}}">{{this.number}}</a>
    {{/if}}
  {{/each}}
  {{#if nextUrl}}<a href="{{nextUrl}}">次へ</a>{{/if}}
</nav>
{{/if}}`,
      },
      {
        label: '言語切替（インライン）',
        code: `{{#each locales}}
  <a href="/{{#unless (eq code ../defaultLang)}}{{code}}/{{/unless}}{{../pagePath}}"{{#if (eq code ../lang)}} aria-current="true"{{/if}}>
    {{flag}} {{label}}
  </a>
{{/each}}`,
        note: 'langSwitcher ヘルパーを使わずに直接書く例',
      },
    ],
  },
] as Array<{
  id: string
  label: string
  items: Array<{ label: string; code: string; note?: string }>
}>

/** テンプレート/コンポーネントファイルの役割説明
 *  ファイル名（拡張子含む）をキーに、製作者向けの説明文を返す
 */
export const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  // テンプレート（最上位）
  '_base.hbs': '全ページ共通の HTML レイアウト枠',
  'home.hbs': 'フロントページ（設定で選んだ / にマップされるページ。無ければ page.hbs を使用）',
  'page.hbs': '固定ページ（会社概要・利用規約など）',
  'list.hbs': '投稿タイプの一覧ページ',
  'detail.hbs': '投稿タイプの詳細ページ',
  'theme.json':
    'テーマ manifest（名前/版/作者＋カラー・フォントの選択肢を宣言。Theme API 版を示す apiVersion）',

  // コンポーネント（再利用パーシャル）
  'head.hbs': '<head> 内の meta タグ・SEO・スタイル',
  'header.hbs': 'サイトヘッダー（ロゴ・ナビ）',
  'footer.hbs': 'サイトフッター',
  'nav.hbs': 'グローバルナビゲーション',
  'breadcrumb.hbs': 'パンくずリスト',
  'pagination.hbs': 'ページネーション',
  'styles.hbs': '共通 CSS（<style> タグでまとめて出力）',
  'accordion.hbs': 'アコーディオン UI',
  'card-list.hbs': 'カード形式のリスト',
  'gallery.hbs': '画像ギャラリー',
  'hero.hbs': 'ヒーローセクション',
  'tabs.hbs': 'タブ UI',
  'timeline.hbs': 'タイムライン UI',
  'seo.hbs': 'SEO・OGP・構造化データ（head 内）',
}

/** リファレンスパネルの表示文字列（label / note / desc / ファイル説明）の英訳辞書。
 *  キーは上の各データに現れる日本語文字列そのもの。code（Handlebars 例）は対象外。
 *  未収録はフォールバックで日本語のまま表示される。 */
const REFERENCE_EN: Record<string, string> = {
  // カテゴリ／タグ スニペット
  現在の記事のカテゴリ: "Current post's category",
  'カテゴリバッジ（条件付き）': 'Category badge (conditional)',
  カテゴリで表示切替: 'Toggle display by category',
  一覧でカテゴリ付きリスト: 'List with categories in index',
  現在の記事のタグ一覧: "Current post's tag list",
  タグがあれば表示: 'Show tags if present',
  タグをリンク付きで表示: 'Show tags with links',
  一覧でタグ付きリスト: 'List with tags in index',
  // グループ見出し
  テーマの構成と作り方: 'Theme structure & how to build',
  ページ種別ごとの変数: 'Variables by page type',
  サイト共通変数: 'Site-wide variables',
  'ページ・コンテンツ変数': 'Page & content variables',
  'Handlebars ヘルパー': 'Handlebars helpers',
  'Alpine.js インタラクション': 'Alpine.js interactions',
  ナビゲーション: 'Navigation',
  'カテゴリ・タグ': 'Categories & tags',
  条件分岐: 'Conditionals',
  よく使うスニペット: 'Common snippets',
  // getting-started
  'テーマの構成（themes/<id>/）': 'Theme structure (themes/<id>/)',
  '1テーマ＝1フォルダの差し替え可能なパッケージ。CMS はアクティブテーマのフォルダを読んで公開サイトを生成します。':
    "One theme = one swappable folder package. The CMS reads the active theme's folder to generate the published site.",
  'theme.json（manifest）': 'theme.json (manifest)',
  'テーマの識別情報のみ。色やフォントはここではなく styles.hbs(CSS) に直接書きます。':
    'Identity info only. Define colors and fonts directly in styles.hbs (CSS), not here.',
  '_base.hbs（共通の外枠）': '_base.hbs (shared outer frame)',
  '各ページ本体は {{{content}}}（三重括弧）に差し込まれます。<head> には書き出し時に generator/ライセンス透かしも自動注入されます。':
    'Each page body is injected into {{{content}}} (triple braces). A generator/license watermark is also auto-injected into <head> on export.',
  'ページ本体（種別ごとに使い分け）': 'Page bodies (one per page type)',
  'home.hbs が無ければ page.hbs にフォールバック。各種別で使える変数は「ページ種別ごとの変数」を参照。':
    "If home.hbs is absent, it falls back to page.hbs. See 'Variables by page type' for the variables available in each type.",
  'コンポーネント（再利用パーシャル）': 'Components (reusable partials)',
  '_components/<name>.hbs を {{> name}} で呼び出します。テンプレートに無いものは最小デフォルトが補われます。':
    'Call _components/<name>.hbs with {{> name}}. Anything missing from your templates is filled in with a minimal default.',
  レンダリングの流れ: 'Rendering flow',
  'pageType（page / list / detail）で本体テンプレートが選ばれます。':
    'The body template is chosen by pageType (page / list / detail).',
  '最小テーマの雛形（_base + page）': 'Minimal theme starter (_base + page)',
  'ゼロから始めるなら、まず _base.hbs と page.hbs だけでも動きます。':
    'Starting from scratch, just _base.hbs and page.hbs is enough to run.',
  '色・フォントの定義（styles.hbs）': 'Defining colors & fonts (styles.hbs)',
  '見た目は CMS 設定ではなくテーマ内の CSS で直接定義します（_components/styles.hbs など）。':
    "Appearance is defined directly in the theme's CSS (e.g. _components/styles.hbs), not in CMS settings.",
  // page-types
  全種別で共通: 'Common to all types',
  'site / lang / defaultLang / pagePath / breadcrumb / locales はどのページでも使えます。':
    'site / lang / defaultLang / pagePath / breadcrumb / locales are available on every page.',
  '固定ページ（home.hbs / page.hbs）': 'Static pages (home.hbs / page.hbs)',
  'page（title / slug / body / _meta.updatedAt / _meta.author …）と、フロントページか判定する isHome。':
    "page (title / slug / body / _meta.updatedAt / _meta.author …) and isHome to tell whether it's the front page.",
  '一覧（list.hbs）': 'List (list.hbs)',
  'type / items / current / total / pages / prevUrl / nextUrl。':
    'type / items / current / total / pages / prevUrl / nextUrl.',
  '詳細（detail.hbs）': 'Detail (detail.hbs)',
  'page = そのコンテンツ項目。投稿タイプで定義したフィールドも page.<キー> で参照できます。':
    'page = that content item. Fields defined on the post type are also accessible as page.<key>.',
  // variables
  サイト名: 'Site name',
  サイトURL: 'Site URL',
  説明: 'Description',
  'サイトロゴ（フォールバック付き）': 'Site logo (with fallback)',
  'ファビコン パス': 'Favicon path',
  現在の言語コード: 'Current language code',
  デフォルト言語コード: 'Default language code',
  現在のページパス: 'Current page path',
  'メニュー（ID 指定で取得）': 'Menu (fetch by ID)',
  'main を任意のメニュー ID に置き換え': 'Replace main with any menu ID',
  // page
  タイトル: 'Title',
  スラッグ: 'Slug',
  フロントページか: 'Is front page',
  '設定で選んだ / にマップされるページのとき true': 'True for the page mapped to / in settings',
  '本文 HTML': 'Body HTML',
  '三重括弧でエスケープせず HTML として出力': 'Triple braces output as HTML without escaping',
  公開日: 'Publish date',
  カテゴリ: 'Category',
  'タグ（ループ）': 'Tags (loop)',
  メイン画像: 'Main image',
  更新日: 'Updated date',
  著者: 'Author',
  パンくず: 'Breadcrumb',
  // helpers
  'formatDate（日付フォーマット）': 'formatDate (date format)',
  'YYYY / MM / DD のプレースホルダ': 'YYYY / MM / DD placeholders',
  'truncate（文字数制限）': 'truncate (length limit)',
  'HTML タグを除去して指定文字数まで': 'Strips HTML tags, then truncates to the given length',
  'eq / gt / lt（比較）': 'eq / gt / lt (comparison)',
  'faviconTag（link rel="icon"）': 'faviconTag (link rel="icon")',
  'head 内推奨。MIME タイプも自動付与':
    'Recommended inside head. The MIME type is added automatically',
  'hreflangTags（SEO）': 'hreflangTags (SEO)',
  '多言語サイトの hreflang を head 内に': 'Outputs hreflang for multilingual sites inside head',
  'langSwitcher（言語切替リンク）': 'langSwitcher (language-switch links)',
  'breadcrumbJsonLd（JSON-LD）': 'breadcrumbJsonLd (JSON-LD)',
  '構造化データ。head 内推奨': 'Structured data. Recommended inside head',
  'articleJsonLd（記事 JSON-LD）': 'articleJsonLd (article JSON-LD)',
  'autoDescription（自動 description）': 'autoDescription (auto description)',
  'meta description / og:description を自動生成':
    'Auto-generates meta description / og:description',
  'latestItems（コンテンツタイプ最新N件）': 'latestItems (latest N of a content type)',
  '第1引数: タイプ id, 第2引数: 件数, 第3引数: lang': 'Arg 1: type id, arg 2: count, arg 3: lang',
  // alpine
  ハンバーガーメニュー: 'Hamburger menu',
  'スマホ向け。CSS で @media + display:none と組み合わせてPC時は常時表示にする':
    'For mobile. Combine with CSS @media + display:none to always show on desktop',
  ドロップダウン: 'Dropdown',
  モーダル: 'Modal',
  'アコーディオン / FAQ': 'Accordion / FAQ',
  'x-collapse は Alpine Collapse プラグインが必要。無ければ x-show + x-transition で代用':
    'x-collapse needs the Alpine Collapse plugin; otherwise substitute x-show + x-transition',
  タブ切替: 'Tabs',
  トップに戻るボタン: 'Back-to-top button',
  // navigation
  'メニューツリー（サブメニュー対応）': 'Menu tree (with submenus)',
  'menuTree でメニューの親子関係をツリーに展開。site.nav または site.menus.xxx を渡す':
    "menuTree expands the menu's parent/child relations into a tree. Pass site.nav or site.menus.xxx",
  カレントページ判定: 'Current page detection',
  'メニュー項目の url と現在の pagePath が一致すれば true':
    "True when a menu item's url matches the current pagePath",
  カレントまたは親パス判定: 'Current or ancestor path detection',
  '子ページにいるとき親メニューもハイライトする。例: /service/ の子 /service/sub/ にいるとき /service/ が true':
    'Highlights the parent menu when on a child page. e.g. on /service/sub/, /service/ is true',
  'メニュー（ID指定・フラット）': 'Menu (by ID, flat)',
  'サブメニュー不要の場合はフラットにループ。main はメニュー ID':
    "Loop flat when submenus aren't needed. main is the menu ID",
  フッターナビ: 'Footer nav',
  'フッター用メニューを別メニュー ID で管理': 'Manage the footer menu under a separate menu ID',
  // taxonomy（スニペットと重複しない固有分）
  カテゴリで表示を切替: 'Toggle display by category',
  カテゴリ名をそのまま比較: 'Compares the category name as-is',
  'タグ一覧（ループ）': 'Tag list (loop)',
  '静的サイトではフィルタリングは JS 側で実装が必要':
    'On a static site, filtering must be implemented in JS',
  '一覧でカテゴリ＋タグ表示': 'Category + tags in index',
  'list.hbs の items ループ内で使用': 'Use inside the items loop in list.hbs',
  // conditions
  'ページ種別で分岐（_base.hbs 等で使用）': 'Branch by page type (e.g. in _base.hbs)',
  'pageType は page / detail / list のいずれか': 'pageType is one of page / detail / list',
  特定の固定ページだけ表示: 'Show only a specific static page',
  特定の投稿タイプだけ表示: 'Show only a specific post type',
  'detail.hbs / list.hbs で使用。type.id でタイプを判定':
    'Use in detail.hbs / list.hbs. Identify the type by type.id',
  'サイドバー付きレイアウト（特定タイプのみ）': 'Layout with sidebar (specific type only)',
  '_base.hbs で使用。news のみサイドバー付き': 'Use in _base.hbs. Only news gets a sidebar',
  'ギャラリーレイアウト（特定タイプ）': 'Gallery layout (specific type)',
  'detail.hbs で works タイプはギャラリー、他は通常の本文':
    'In detail.hbs, the works type renders a gallery; others render the normal body',
  フィールドの有無で表示切替: 'Toggle by whether a field exists',
  言語で分岐: 'Branch by language',
  '複数条件（and / or）': 'Multiple conditions (and / or)',
  フロントページかどうか: "Whether it's the front page",
  // snippets
  お知らせ最新リスト: 'Latest news list',
  '画像 + キャプション（条件付き）': 'Image + caption (conditional)',
  ヒーローセクション: 'Hero section',
  バナーグリッド: 'Banner grid',
  カルーセル: 'Carousel',
  ページネーション: 'Pagination',
  '言語切替（インライン）': 'Language switch (inline)',
  'langSwitcher ヘルパーを使わずに直接書く例':
    'Example written directly, without the langSwitcher helper',
  // ファイル説明（TEMPLATE_DESCRIPTIONS）
  '全ページ共通の HTML レイアウト枠': 'Shared HTML layout frame for all pages',
  'フロントページ（設定で選んだ / にマップされるページ。無ければ page.hbs を使用）':
    'Front page (the page mapped to / in settings; falls back to page.hbs if absent)',
  '固定ページ（会社概要・利用規約など）': 'Static pages (About, Terms, etc.)',
  投稿タイプの一覧ページ: 'Post type list page',
  投稿タイプの詳細ページ: 'Post type detail page',
  'テーマ manifest（名前/版/作者＋カラー・フォントの選択肢を宣言。Theme API 版を示す apiVersion）':
    'Theme manifest (declares name/version/author and color/font options; apiVersion indicates the Theme API version)',
  '<head> 内の meta タグ・SEO・スタイル': 'meta tags, SEO, and styles inside <head>',
  'サイトヘッダー（ロゴ・ナビ）': 'Site header (logo, nav)',
  サイトフッター: 'Site footer',
  グローバルナビゲーション: 'Global navigation',
  パンくずリスト: 'Breadcrumb list',
  '共通 CSS（<style> タグでまとめて出力）': 'Shared CSS (output together in a <style> tag)',
  'アコーディオン UI': 'Accordion UI',
  カード形式のリスト: 'Card-style list',
  画像ギャラリー: 'Image gallery',
  'タブ UI': 'Tab UI',
  'タイムライン UI': 'Timeline UI',
  'SEO・OGP・構造化データ（head 内）': 'SEO, OGP, and structured data (inside head)',
}

function trRef(s: string): string {
  return REFERENCE_EN[s] ?? s
}

/** label / note / desc 文字列だけを英訳に差し替えた深いコピーを返す（code 等はそのまま）。 */
function deepLocalizeRef<T>(node: T): T {
  if (Array.isArray(node)) return node.map((n) => deepLocalizeRef(n)) as unknown as T
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if ((k === 'label' || k === 'note' || k === 'desc') && typeof v === 'string')
        out[k] = trRef(v)
      else out[k] = deepLocalizeRef(v)
    }
    return out as T
  }
  return node
}

/** UI 言語に応じたリファレンスパネル用データ一式を返す。
 *  日本語は原本をそのまま、英語は label/note/desc とファイル説明を英訳して返す。 */
export function getLocalizedReference(locale: string) {
  if (locale !== 'en') {
    return {
      categorySnippets: CATEGORY_SNIPPETS,
      tagSnippets: TAG_SNIPPETS,
      templateReferenceGroups: TEMPLATE_REFERENCE_GROUPS,
      templateDescriptions: TEMPLATE_DESCRIPTIONS,
    }
  }
  const templateDescriptions: Record<string, string> = {}
  for (const [k, v] of Object.entries(TEMPLATE_DESCRIPTIONS)) templateDescriptions[k] = trRef(v)
  return {
    categorySnippets: deepLocalizeRef(CATEGORY_SNIPPETS),
    tagSnippets: deepLocalizeRef(TAG_SNIPPETS),
    templateReferenceGroups: deepLocalizeRef(TEMPLATE_REFERENCE_GROUPS),
    templateDescriptions,
  }
}
