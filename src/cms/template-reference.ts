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
        label: 'themeStyles（CSS 変数）',
        code: '{{themeStyles site}}',
        note: '--color-primary / --font-body などを <style> で出力',
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
  'config.json': 'テンプレートパックのメタ情報',

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
