import Handlebars from 'handlebars'
import type { FileSystem } from './fs.ts'
import type {
  SiteConfig,
  Languages,
  ContentType,
  ExportFile,
  ContentData,
  MenuData,
  MenuItem,
} from './types.ts'
import {
  PATH_DIST,
  PATH_EXPORT_SOURCE,
  EDITION,
  LICENSE_ID,
  CANARY,
  STAMP_VERSION,
  SEARCH_EXCERPT_LENGTH,
  AUTO_DESCRIPTION_LENGTH,
  DEFAULT_PAGINATION,
  EXPORT_YIELD_INTERVAL,
} from './constants.ts'

// Alpine.js CDN ビルド: 公開サイトの dist/assets/js/ に書き出す
import alpineJs from 'alpinejs/dist/cdn.min.js?raw'

type TemplateFunction = (context: Record<string, unknown>) => string

/** メインスレッドを一瞬解放して UI（進捗バー）を更新させる */
const yieldToMain = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** 公開対象か判定：status が 'published'、または status 未指定（後方互換）なら公開とみなす */
function isPublished(item: { status?: string }): boolean {
  return item.status === 'published' || !item.status
}

/** 文字列の SHA-256（16進）。書き出し前の変更検知に使用 */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 404ページのデフォルト文言（言語コードをキーに持つ、無ければ ja にフォールバック） */
const notFoundMessages: Record<string, { title: string; body: string; home: string }> = {
  ja: {
    title: 'ページが見つかりません',
    body: 'お探しのページは存在しないか、移動した可能性があります。',
    home: 'トップへ戻る',
  },
  en: {
    title: 'Page Not Found',
    body: 'The page you are looking for does not exist or has been moved.',
    home: 'Back to Home',
  },
  'zh-CN': {
    title: '页面未找到',
    body: '您查找的页面不存在或已被移动。',
    home: '返回首页',
  },
  ko: {
    title: '페이지를 찾을 수 없습니다',
    body: '찾으시는 페이지가 존재하지 않거나 이동되었습니다.',
    home: '홈으로 돌아가기',
  },
}

/**
 * 静的HTML書き出しエンジン
 */
export class Exporter {
  private fs: FileSystem
  private handlebars: typeof Handlebars
  /** テンプレート解決元ディレクトリ（アクティブテーマ themes/<id>/。無ければ旧 templates/ にフォールバック）。exportAll で確定。 */
  private themeDir = 'templates'
  /** 直近の exportAll で算出したソース署名（呼び出し側が成功後に保存する） */
  lastSourceHash = ''

  constructor(fs: FileSystem) {
    this.fs = fs
    this.handlebars = Handlebars.create()
    this.registerHelpers()
  }

  /** カスタムヘルパー登録 */
  private registerHelpers(): void {
    const hbs = this.handlebars

    hbs.registerHelper('formatDate', (dateStr: string, format: unknown) => {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const fmt = typeof format === 'string' ? format : 'YYYY-MM-DD'
      return fmt.replace('YYYY', String(y)).replace('MM', m).replace('DD', day)
    })

    hbs.registerHelper('truncate', (str: string, len: number) => {
      if (!str) return ''
      const text = str.replace(/<[^>]*>/g, '')
      if (text.length <= len) return text
      return text.substring(0, len) + '...'
    })

    hbs.registerHelper('eq', (a: unknown, b: unknown) => a === b)
    hbs.registerHelper('gt', (a: number, b: number) => a > b)
    hbs.registerHelper('lt', (a: number, b: number) => a < b)
    hbs.registerHelper('and', (a: unknown, b: unknown) => a && b)
    hbs.registerHelper('or', (a: unknown, b: unknown) => a || b)

    // パンくずJSON-LD構造化データ
    hbs.registerHelper(
      'breadcrumbJsonLd',
      function (breadcrumb: Array<{ label: string; url?: string }>, siteUrl: string) {
        if (!breadcrumb || !Array.isArray(breadcrumb)) return ''
        const items = breadcrumb.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.label,
          ...(item.url ? { item: `${siteUrl || ''}${item.url}` } : {}),
        }))
        const ld = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items,
        }
        return new Handlebars.SafeString(
          `<script type="application/ld+json">${JSON.stringify(ld)}</script>`,
        )
      },
    )

    // 記事JSON-LD構造化データ
    hbs.registerHelper(
      'articleJsonLd',
      function (page: Record<string, unknown>, site: Record<string, unknown>) {
        if (!page || !page.title) return ''
        const meta = page._meta as Record<string, string> | undefined
        const ld: Record<string, unknown> = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: page.title,
          ...(page.publishedAt ? { datePublished: page.publishedAt } : {}),
          ...(meta?.updatedAt ? { dateModified: meta.updatedAt } : {}),
          ...(meta?.author ? { author: { '@type': 'Person', name: meta.author } } : {}),
          ...(site?.name ? { publisher: { '@type': 'Organization', name: site.name } } : {}),
          ...(page.image ? { image: page.image } : {}),
        }
        return new Handlebars.SafeString(
          `<script type="application/ld+json">${JSON.stringify(ld)}</script>`,
        )
      },
    )

    // meta description（手動設定 or 本文から自動生成）
    hbs.registerHelper('autoDescription', function (page: Record<string, unknown>) {
      const desc =
        (page.description as string) ||
        stripHtmlTags((page.body as string) || '')
          .substring(0, AUTO_DESCRIPTION_LENGTH)
          .trim()
      if (!desc) return ''
      return new Handlebars.SafeString(
        `<meta name="description" content="${desc}">\n<meta property="og:description" content="${desc}">`,
      )
    })

    // ファビコン <link> タグ
    hbs.registerHelper('faviconTag', function (site: Record<string, unknown>) {
      const favicon = site?.favicon as string | undefined
      if (!favicon) return ''
      const ext = favicon.split('.').pop()?.toLowerCase() || ''
      const typeMap: Record<string, string> = {
        ico: 'image/x-icon',
        png: 'image/png',
        svg: 'image/svg+xml',
        webp: 'image/webp',
      }
      const type = typeMap[ext] || ''
      const typeAttr = type ? ` type="${type}"` : ''
      return new Handlebars.SafeString(`<link rel="icon"${typeAttr} href="${favicon}">`)
    })

    // hreflangタグ生成
    hbs.registerHelper(
      'hreflangTags',
      function (
        pagePath: string,
        locales: Array<{ code: string }>,
        defaultLang: string,
        siteUrl: string,
      ) {
        if (!siteUrl || !locales || locales.length < 2) return ''
        const base = siteUrl.replace(/\/$/, '')
        const tags = locales.map((locale) => {
          const prefix = locale.code === defaultLang ? '' : `/${locale.code}`
          const url = `${base}${prefix}/${pagePath}`.replace(/\/+/g, '/').replace(':/', '://')
          return `<link rel="alternate" hreflang="${locale.code}" href="${url}">`
        })
        // x-default
        const defaultUrl = `${base}/${pagePath}`.replace(/\/+/g, '/').replace(':/', '://')
        tags.push(`<link rel="alternate" hreflang="x-default" href="${defaultUrl}">`)
        return new Handlebars.SafeString(tags.join('\n'))
      },
    )

    // 言語スイッチャーHTML
    hbs.registerHelper(
      'langSwitcher',
      function (
        pagePath: string,
        locales: Array<{ code: string; label: string; flag: string }>,
        defaultLang: string,
        currentLang: string,
      ) {
        if (!locales || locales.length < 2) return ''
        const items = locales
          .map((locale) => {
            const prefix = locale.code === defaultLang ? '' : `/${locale.code}`
            const href = `${prefix}/${pagePath}`.replace(/\/+/g, '/')
            const active = locale.code === currentLang ? ' aria-current="true"' : ''
            return `<a href="${href}"${active}>${locale.flag} ${locale.label}</a>`
          })
          .join('\n')
        return new Handlebars.SafeString(`<nav class="lang-switcher">${items}</nav>`)
      },
    )

    // メニューをツリー構造で返す（parent フィールドで親子関係を解決）
    // テンプレート側で {{#each (menuTree site.menus.main)}} で使用
    hbs.registerHelper('menuTree', function (items: Array<Record<string, unknown>>) {
      if (!items || !Array.isArray(items)) return []
      // parent が空 or 未定義のアイテムをルートとして収集
      const roots: Array<Record<string, unknown>> = []
      const childrenMap = new Map<string, Array<Record<string, unknown>>>()
      for (const item of items) {
        const parentId = (item.parent as string) || ''
        if (!parentId) {
          roots.push(item)
        } else {
          if (!childrenMap.has(parentId)) childrenMap.set(parentId, [])
          childrenMap.get(parentId)!.push(item)
        }
      }
      // ルート項目に children 配列を付与
      return roots.map((item) => ({
        ...item,
        children: childrenMap.get(item.id as string) || [],
      }))
    })

    // 現在のページかどうかを判定（URL のパスを正規化して比較）
    hbs.registerHelper('isActivePath', function (menuUrl: string, pagePath: string) {
      const normalize = (p: string): string =>
        '/' + (p || '').replace(/^\/|\/$/g, '').replace(/\/index\.html$/, '') + '/'
      return normalize(menuUrl) === normalize(pagePath)
    })

    // 現在のページまたはその親パスか（サブメニューの親項目もハイライトする用途）
    hbs.registerHelper('isActiveOrParent', function (menuUrl: string, pagePath: string) {
      const normalize = (p: string): string =>
        '/' + (p || '').replace(/^\/|\/$/g, '').replace(/\/index\.html$/, '') + '/'
      const u = normalize(menuUrl)
      const p = normalize(pagePath)
      // ルート '/' は常にマッチしてしまうので除外
      if (u === '/') return p === '/'
      return p.startsWith(u)
    })
  }

  /** アクティブテーマのフォルダを解決（themes/<id>/。無ければ旧 templates/ にフォールバック）。
   *  exportAll は自動で呼ぶ。プレビュー等で loadTemplate を直接使う前にも呼ぶこと。 */
  async resolveThemeDir(themeId: string): Promise<void> {
    const dir = `themes/${themeId}`
    this.themeDir = (await this.fs.getDir(dir)) ? dir : 'templates'
  }

  /** テンプレートファイルを読み込みコンパイル（アクティブテーマから） */
  async loadTemplate(name: string): Promise<TemplateFunction | null> {
    const source = await this.fs.readText(`${this.themeDir}/${name}.hbs`)
    if (!source) return null
    return this.handlebars.compile(source)
  }

  /** パーシャル（コンポーネント）を一括登録 */
  async registerPartials(): Promise<void> {
    const componentsDir = await this.fs.getDir(`${this.themeDir}/_components`)
    if (!componentsDir) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iter: AsyncIterableIterator<[string, FileSystemHandle]> = (componentsDir as any).entries()
    while (true) {
      const { done, value } = await iter.next()
      if (done) break
      const [name, handle] = value
      if (handle.kind === 'file' && name.endsWith('.hbs')) {
        const file = await (handle as FileSystemFileHandle).getFile()
        const source = await file.text()
        const partialName = name.replace('.hbs', '')
        this.handlebars.registerPartial(partialName, source)
      }
    }

    if (!this.handlebars.partials['seo']) {
      this.handlebars.registerPartial(
        'seo',
        [
          '{{autoDescription page}}',
          '{{faviconTag site}}',
          '<meta property="og:title" content="{{page.title}}">',
          '<meta property="og:type" content="website">',
          '{{#if page.image}}<meta property="og:image" content="{{page.image}}">{{/if}}',
          '<meta name="twitter:card" content="{{#if page.image}}summary_large_image{{else}}summary{{/if}}">',
          '<meta name="twitter:title" content="{{page.title}}">',
          '{{#if site.url}}<link rel="canonical" href="{{site.url}}">{{/if}}',
          '{{breadcrumbJsonLd breadcrumb site.url}}',
          '{{articleJsonLd page site}}',
          '{{hreflangTags pagePath locales defaultLang site.url}}',
        ].join('\n'),
      )
    }
    // テンプレートにない場合のデフォルトパーシャル
    const defaults: Record<string, string> = {
      footer:
        '<footer class="site-footer"><div class="container"><p>&copy; {{site.name}}</p></div></footer>',
      header:
        '<header class="site-header"><div class="container"><a href="/" class="site-title">{{site.name}}</a>{{> nav}}</div></header>',
      head: '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{page.title}}{{#if site.name}} | {{site.name}}{{/if}}</title>{{> seo}}{{> styles}}',
      styles:
        '<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:var(--font-body,system-ui,sans-serif);color:#1a1a1a;line-height:1.7}.container{max-width:1100px;margin:0 auto;padding:0 1.5em}.site-main{padding:2em 0;min-height:60vh}</style>',
    }
    for (const [name, tmpl] of Object.entries(defaults)) {
      if (!this.handlebars.partials[name]) {
        this.handlebars.registerPartial(name, tmpl)
      }
    }
  }

  /** サイト全体を書き出し */
  async exportAll(
    siteConfig: SiteConfig,
    languages: Languages,
    _pages: unknown[],
    contentTypes: ContentType[],
    onProgress?: (step: number, total: number) => void,
    force = false,
  ): Promise<ExportFile[] | null> {
    await this.resolveThemeDir(siteConfig.themeId || 'default')
    await this.registerPartials()

    const baseTemplate = await this.loadTemplate('_base')
    const pageTemplate = await this.loadTemplate('page')
    const homeTemplate = await this.loadTemplate('home')
    const listTemplate = await this.loadTemplate('list')
    const detailTemplate = await this.loadTemplate('detail')

    const files: ExportFile[] = []
    const locales = languages.locales || [{ code: 'ja', label: '日本語', flag: '🇯🇵' }]
    const defaultLang = languages.default || 'ja'
    let step = 0

    // メニューデータ読み込み
    const menuData = (await this.fs.readJson<MenuData>('content/menus.json')) || {
      menus: [],
    }
    // site オブジェクト（全メニューを site.menus.<id> で参照可能にし、後方互換で nav も付与）
    const site = buildSiteObject(siteConfig, menuData)

    // 固定ページ・コンテンツを言語別に一度だけ並列読込してキャッシュする。
    // 従来は生成と検索インデックスで最大3回読んでいた I/O を1回に集約し、言語横断で並列化する。
    const pagesCache = new Map<string, ContentData[]>()
    const rawItemsCache = new Map<string, Map<string, ContentData[]>>()
    await Promise.all(
      locales.map(async (locale) => {
        const lang = locale.code
        const [langPages, ...typeLists] = await Promise.all([
          this.fs.readPages(lang),
          ...contentTypes.map((t) => this.fs.readContentList(t.id, lang)),
        ])
        pagesCache.set(lang, langPages)
        const byType = new Map<string, ContentData[]>()
        contentTypes.forEach((t, i) => byType.set(t.id, typeLists[i]))
        rawItemsCache.set(lang, byType)
      }),
    )

    // 変更がなければ書き出しをスキップ（増分書き出し）。
    // テンプレート・サイト設定・メニュー・全コンテンツのハッシュで判定する。
    // ※ latestItems やメニュー等でページ間が大域結合するため、安全側に倒して
    //   「どこかが変わったら全体を再生成」する粒度にしている。
    const tplFiles = await this.fs.readTemplateFiles()
    const [tplTexts, imageSigs, fileSigs] = await Promise.all([
      Promise.all(tplFiles.map((f) => this.fs.readText(f.path))),
      this.fs.listDirSignatures('assets/images'),
      this.fs.listDirSignatures('assets/files'),
    ])
    const sourceSignature = JSON.stringify({
      site: siteConfig,
      languages,
      menus: menuData,
      types: contentTypes,
      templates: tplFiles.map((f, i) => [f.path, tplTexts[i]]),
      pages: [...pagesCache.entries()],
      items: [...rawItemsCache.entries()].map(([lang, m]) => [lang, [...m.entries()]]),
      // アセット（画像・ファイル）の差し替えも検知する（メタ情報のみ）
      assets: [...imageSigs, ...fileSigs],
      // ビルド識別（エディション/ライセンス/透かし版が変われば再生成して透かしを更新）
      build: { edition: EDITION, license: LICENSE_ID, stamp: STAMP_VERSION, canary: CANARY },
    })
    this.lastSourceHash = await sha256(sourceSignature)
    if (!force) {
      const prev = await this.fs.readJson<{ hash: string }>(PATH_EXPORT_SOURCE)
      const manifestExists = (await this.fs.readJson(`${PATH_DIST}/manifest.json`)) !== null
      if (prev?.hash === this.lastSourceHash && manifestExists) {
        return null
      }
    }

    // 進捗表示の総ステップ数（言語ごとに「固定ページ群」＋「各コンテンツタイプ」）
    const totalSteps = locales.length * (contentTypes.length + 1)

    // コンテンツタイプのアイテムを言語別に事前取得（Handlebarsヘルパーから同期参照するため）
    const typeItemsCache = new Map<string, Map<string, ContentData[]>>()
    for (const locale of locales) {
      const lang = locale.code
      const prefix = lang === defaultLang ? '' : `${lang}/`
      const byType = new Map<string, ContentData[]>()
      for (const type of contentTypes) {
        const items = rawItemsCache.get(lang)?.get(type.id) || []
        const published = items
          .filter(isPublished)
          .sort((a, b) =>
            (b.publishedAt || b._meta?.createdAt || '').localeCompare(
              a.publishedAt || a._meta?.createdAt || '',
            ),
          )
          .map((item) => ({
            ...item,
            url: `/${prefix}${type.slug}/${item.slug || item.id}/`,
          }))
        byType.set(type.id, published)
      }
      typeItemsCache.set(lang, byType)
    }

    // latestItems(typeId, count, lang) ヘルパー: 指定コンテンツタイプの最新N件を返す
    this.handlebars.registerHelper(
      'latestItems',
      function (typeId: string, count: number, lang: string) {
        const items = typeItemsCache.get(lang)?.get(typeId) || []
        return items.slice(0, count || items.length)
      },
    )

    for (const locale of locales) {
      const lang = locale.code
      const prefix = lang === defaultLang ? '' : `${lang}/`

      // 固定ページ書き出し（published または status 未指定のみ）
      const langPages = pagesCache.get(lang) || []
      // 親子チェーンのルックアップマップ（id → page）
      const pageById = new Map(langPages.map((p) => [p.id, p]))
      // フロントページ（/ にマップする固定ページ id）。未設定サイトは 'index' にフォールバック。
      const frontPageId = siteConfig.frontPageId || 'index'
      // ページの最終URLパス（親チェーンを辿って / 区切りで連結）
      const pagePathOf = (page: ContentData): string[] =>
        resolvePagePath(page, pageById, frontPageId)
      // ページのパンくずを親チェーンから構築
      const resolveBreadcrumb = (page: ContentData): Array<{ label: string; url?: string }> => {
        const crumbs: Array<{ label: string; url?: string }> = [
          { label: siteConfig.name || 'Home', url: '/' },
        ]
        // 親チェーン（自身を除く）をルート→自身の順に
        const ancestors: ContentData[] = []
        let parentId: string = (page.parent as string | undefined) || ''
        const visited = new Set<string>()
        while (parentId && !visited.has(parentId)) {
          visited.add(parentId)
          const parent = pageById.get(parentId)
          if (!parent) break
          ancestors.unshift(parent)
          parentId = (parent.parent as string | undefined) || ''
        }
        for (const ancestor of ancestors) {
          const segs = pagePathOf(ancestor)
          const url = ancestor.id === frontPageId ? '/' : `/${prefix}${segs.join('/')}/`
          crumbs.push({ label: ancestor.title, url })
        }
        crumbs.push({ label: page.title })
        return crumbs
      }

      for (const page of langPages) {
        if (!isPublished(page)) continue

        const breadcrumb = resolveBreadcrumb(page)
        const segments = pagePathOf(page)
        const isIndex = page.id === frontPageId
        const pagePath = isIndex ? '' : `${segments.join('/')}/`

        const ctx = {
          page,
          pageType: 'page' as const,
          site,
          lang,
          breadcrumb,
          locales,
          defaultLang,
          pagePath,
          // フロントページかどうか（テンプレートで {{#if isHome}} 判定に使う）
          isHome: isIndex,
        }

        // フロントページは home.hbs が存在すれば優先、無ければ page.hbs にフォールバック
        const activeTemplate = isIndex && homeTemplate ? homeTemplate : pageTemplate
        const pageHtml = activeTemplate
          ? activeTemplate(ctx)
          : `<h1>${page.title}</h1>${page.body || ''}`

        const fullHtml = baseTemplate
          ? baseTemplate({ ...ctx, content: new Handlebars.SafeString(pageHtml) })
          : wrapHtml(page.title, siteConfig, lang, pageHtml)

        const filePath = isIndex
          ? `${prefix}index.html`
          : `${prefix}${segments.join('/')}/index.html`

        files.push({ path: filePath, content: fullHtml })
      }
      step++
      if (onProgress) onProgress(step, totalSteps)
      await yieldToMain()

      // コンテンツタイプ書き出し
      for (const type of contentTypes) {
        const items = rawItemsCache.get(lang)?.get(type.id) || []
        const published = items.filter(isPublished)

        const perPage = type.pagination || DEFAULT_PAGINATION
        const totalPages = Math.max(1, Math.ceil(published.length / perPage))

        for (let p = 1; p <= totalPages; p++) {
          const start = (p - 1) * perPage
          const pageItems = published.slice(start, start + perPage).map((item) => ({
            ...item,
            url: `/${prefix}${type.slug}/${item.slug || item.id}/`,
          }))

          const paginationPages = []
          for (let i = 1; i <= totalPages; i++) {
            paginationPages.push({
              number: i,
              url: i === 1 ? `/${prefix}${type.slug}/` : `/${prefix}${type.slug}/page/${i}/`,
            })
          }

          const listPagePath = `${type.slug}/`
          const listCtx = {
            pageType: 'list' as const,
            type,
            items: pageItems,
            site,
            lang,
            current: p,
            total: totalPages,
            pages: paginationPages,
            prevUrl:
              p > 1
                ? p === 2
                  ? `/${prefix}${type.slug}/`
                  : `/${prefix}${type.slug}/page/${p - 1}/`
                : null,
            nextUrl: p < totalPages ? `/${prefix}${type.slug}/page/${p + 1}/` : null,
            breadcrumb: [{ label: siteConfig.name || 'Home', url: '/' }, { label: type.label }],
            locales,
            defaultLang,
            pagePath: listPagePath,
          }

          const listHtml = listTemplate ? listTemplate(listCtx) : ''

          const fullHtml = baseTemplate
            ? baseTemplate({
                ...listCtx,
                page: { title: type.label, description: '' },
                content: new Handlebars.SafeString(listHtml),
              })
            : wrapHtml(type.label, siteConfig, lang, listHtml)

          const listPath =
            p === 1
              ? `${prefix}${type.slug}/index.html`
              : `${prefix}${type.slug}/page/${p}/index.html`

          files.push({ path: listPath, content: fullHtml })
        }

        // 詳細ページ書き出し
        let detailCount = 0
        for (const item of published) {
          const itemSlug = item.slug || item.id
          const detailPagePath = `${type.slug}/${itemSlug}/`
          const detailCtx = {
            pageType: 'detail' as const,
            page: item,
            type,
            site,
            lang,
            breadcrumb: [
              { label: siteConfig.name || 'Home', url: '/' },
              { label: type.label, url: `/${prefix}${type.slug}/` },
              { label: item.title },
            ],
            locales,
            defaultLang,
            pagePath: detailPagePath,
          }

          const detailHtml = detailTemplate
            ? detailTemplate(detailCtx)
            : `<h1>${item.title}</h1>${item.body || ''}`

          const fullHtml = baseTemplate
            ? baseTemplate({ ...detailCtx, content: new Handlebars.SafeString(detailHtml) })
            : wrapHtml(item.title, siteConfig, lang, detailHtml)

          files.push({
            path: `${prefix}${type.slug}/${itemSlug}/index.html`,
            content: fullHtml,
          })
          // 大量件数でも UI が固まらないよう一定間隔でメインスレッドを解放
          if (++detailCount % EXPORT_YIELD_INTERVAL === 0) await yieldToMain()
        }

        step++
        if (onProgress) onProgress(step, totalSteps)
        await yieldToMain()
      }
    }

    // sitemap.xml（404・robots を追加する前の、実ページのみで構築）
    if (siteConfig.url) {
      files.push(buildSitemap(siteConfig.url, files))
    }

    // 404ページ書き出し（各言語・sitemap の後に追加して sitemap から除外）
    for (const locale of locales) {
      const lang = locale.code
      const prefix = lang === defaultLang ? '' : `${lang}/`
      const messages = notFoundMessages[lang] || notFoundMessages.ja
      const homeHref = lang === defaultLang ? '/' : `/${lang}/`
      const notFoundPage = {
        id: '404',
        title: messages.title,
        body: `<p>${messages.body}</p><p><a href="${homeHref}">${messages.home}</a></p>`,
        status: 'published',
      }
      const ctx = {
        page: notFoundPage,
        pageType: 'page' as const,
        site,
        lang,
        breadcrumb: [
          { label: siteConfig.name || 'Home', url: homeHref },
          { label: messages.title },
        ],
        locales,
        defaultLang,
        pagePath: '404.html',
        notFound: true,
      }
      const pageHtml = pageTemplate
        ? pageTemplate(ctx)
        : `<h1>${messages.title}</h1>${notFoundPage.body}`
      const fullHtml = baseTemplate
        ? baseTemplate({ ...ctx, content: new Handlebars.SafeString(pageHtml) })
        : wrapHtml(messages.title, siteConfig, lang, pageHtml)
      files.push({ path: `${prefix}404.html`, content: fullHtml })
    }

    // robots.txt
    files.push({
      path: 'robots.txt',
      content: `User-agent: *\nAllow: /\n${siteConfig.url ? `Sitemap: ${siteConfig.url.replace(/\/$/, '')}/sitemap.xml` : ''}`,
    })

    // Alpine.js（公開サイト用の IIFE ビルド）
    files.push({
      path: 'assets/js/alpine.min.js',
      content: alpineJs,
    })

    // 検索インデックス生成（言語別に分割：訪問者は自言語分のみ読み込めばよい）
    const searchByLang = await this.buildSearchIndex(
      languages,
      contentTypes,
      pagesCache,
      rawItemsCache,
      siteConfig.frontPageId || 'index',
    )
    for (const locale of locales) {
      const lang = locale.code
      const prefix = lang === defaultLang ? '' : `${lang}/`
      files.push({
        path: `search-index.${lang}.json`,
        content: JSON.stringify(searchByLang.get(lang) || []),
      })
      files.push({
        path: `${prefix}search/index.html`,
        content: this.generateSearchPage(siteConfig, lang),
      })
    }

    // 透かしを全 HTML に注入
    injectStamp(files)

    return files
  }

  /** 検索インデックスを生成 */
  private async buildSearchIndex(
    languages: Languages,
    contentTypes: ContentType[],
    pagesCache: Map<string, ContentData[]>,
    rawItemsCache: Map<string, Map<string, ContentData[]>>,
    frontPageId: string,
  ): Promise<Map<string, Array<Record<string, string>>>> {
    const byLang = new Map<string, Array<Record<string, string>>>()
    const defaultLang = languages.default || 'ja'

    for (const locale of languages.locales) {
      const lang = locale.code
      const prefix = lang === defaultLang ? '' : `${lang}/`
      const index: Array<Record<string, string>> = []
      byLang.set(lang, index)

      // 固定ページ（親チェーンで URL 構築）。読込済みキャッシュを再利用
      const pages = pagesCache.get(lang) || []
      const pageById = new Map(pages.map((p) => [p.id, p]))
      for (const page of pages) {
        if (!isPublished(page)) continue
        const segs = resolvePagePath(page, pageById, frontPageId)
        const isIndex = page.id === frontPageId
        const url = isIndex ? `/${prefix}` : `/${prefix}${segs.join('/')}/`
        index.push({
          title: page.title,
          body: stripHtmlTags(page.body || '').substring(0, SEARCH_EXCERPT_LENGTH),
          url,
          lang,
          type: 'page',
          date: page._meta?.updatedAt || '',
        })
      }

      // コンテンツタイプ
      for (const type of contentTypes) {
        const items = rawItemsCache.get(lang)?.get(type.id) || []
        for (const item of items) {
          if (!isPublished(item)) continue
          index.push({
            title: item.title,
            body: stripHtmlTags(item.body || '').substring(0, SEARCH_EXCERPT_LENGTH),
            url: `/${prefix}${type.slug}/${item.slug || item.id}/`,
            lang,
            type: type.id,
            date: item.publishedAt || item._meta?.updatedAt || '',
          })
        }
      }
    }

    return byLang
  }

  /** 検索ページHTMLを生成 */
  private generateSearchPage(siteConfig: SiteConfig, lang: string): string {
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>検索 | ${siteConfig.name || ''}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;line-height:1.6;max-width:700px;margin:0 auto;padding:2em 1.5em}
    h1{font-size:1.5em;margin-bottom:1em}
    .search-box{width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:8px;font-size:16px;outline:none;transition:border-color .2s}
    .search-box:focus{border-color:#2563eb}
    .results{margin-top:1.5em}
    .result{padding:1em 0;border-bottom:1px solid #f3f4f6}
    .result h2{font-size:1.1em;margin-bottom:0.2em}
    .result h2 a{color:#2563eb;text-decoration:none}
    .result h2 a:hover{text-decoration:underline}
    .result p{font-size:0.9em;color:#6b7280}
    .result time{font-size:0.8em;color:#9ca3af}
    .no-results{color:#9ca3af;text-align:center;padding:3em 0}
    .count{font-size:0.85em;color:#9ca3af;margin-bottom:0.5em}
  </style>
</head>
<body>
  <h1>検索</h1>
  <input type="search" class="search-box" placeholder="キーワードを入力..." autofocus id="q">
  <div class="results" id="results"></div>
  <script>
    let index=[];
    // 取得時に検索用の小文字インデックスを一度だけ作る（入力ごとの再変換を避ける）
    fetch('/search-index.${lang}.json').then(r=>r.json()).then(d=>{
      for(const i of d)i._s=(i.title+' '+i.body).toLowerCase();
      index=d;
    });
    const q=document.getElementById('q');
    const r=document.getElementById('results');
    function run(){
      const t=q.value.trim().toLowerCase();
      if(!t){r.innerHTML='';return}
      const matches=index.filter(i=>i._s.includes(t));
      if(!matches.length){r.innerHTML='<div class="no-results">見つかりませんでした</div>';return}
      r.innerHTML='<div class="count">'+matches.length+'件</div>'+matches.map(m=>
        '<div class="result"><h2><a href="'+m.url+'">'+hl(m.title,t)+'</a></h2>'
        +(m.date?'<time>'+m.date+'</time>':'')
        +'<p>'+hl(m.body.substring(0,150),t)+'</p></div>'
      ).join('');
    }
    // 連続入力ではデバウンスして無駄な全件走査を抑える
    let timer;
    q.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,120)});
    function hl(s,t){return s.replace(new RegExp('('+t.replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&')+')','gi'),'<mark>$1</mark>')}
  </script>
</body>
</html>`
  }
}

/** ページの最終URLパスを親チェーンから解決して slug 配列で返す。
 *  フロントページは / にマップされるため、親チェーンからは除外する（自身がフロントの場合のみ残す）。
 *  exportAll の生成と buildSearchIndex の両方から使う共通ロジック。 */
function resolvePagePath(
  page: ContentData,
  pageById: Map<string, ContentData>,
  frontPageId: string,
): string[] {
  const slugOf = (p: ContentData): string => p.slug || p.id
  const chain: string[] = []
  let current: ContentData | undefined = page
  const visited = new Set<string>()
  let isSelf = true
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    const slug = slugOf(current)
    if (isSelf || current.id !== frontPageId) chain.unshift(slug)
    isSelf = false
    const parentId: string = (current.parent as string | undefined) || ''
    current = parentId ? pageById.get(parentId) : undefined
  }
  return chain
}

/** サイト設定とメニューデータから、テンプレートに渡す site オブジェクトを組み立てる。
 *  全メニューを site.menus.<id> でアクセス可能にし、後方互換で先頭メニューを nav に出す。 */
function buildSiteObject(siteConfig: SiteConfig, menuData: MenuData) {
  const menus: Record<string, MenuItem[]> = {}
  for (const menu of menuData.menus || []) {
    menus[menu.id] = menu.items || []
  }
  return {
    ...siteConfig,
    menus,
    nav: menuData.menus?.[0]?.items || siteConfig.nav || [],
  }
}

/** これまでに生成した全ファイルの URL から sitemap.xml を構築する。 */
function buildSitemap(siteUrl: string, files: ExportFile[]): ExportFile {
  const base = siteUrl.replace(/\/$/, '')
  const entries = files.map(
    (f) => `  <url><loc>${base}/${f.path.replace(/index\.html$/, '')}</loc></url>`,
  )
  return {
    path: 'sitemap.xml',
    content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`,
  }
}

/** 全 HTML の <head> にジェネレータ表記＋ライセンスID＋カナリアの透かしを注入する（files を破壊的に更新）。
 *  テンプレートではなく書き出し側で注入するため、テンプレート編集では除去できない。 */
function injectStamp(files: ExportFile[]): void {
  const stamp =
    `<meta name="generator" content="ONE CMS${EDITION === 'pro' ? ' Pro' : ''}` +
    `${LICENSE_ID ? ` #${LICENSE_ID}` : ''}">\n<!-- ${CANARY} -->`
  for (const f of files) {
    if (!f.path.endsWith('.html')) continue
    f.content = f.content.includes('</head>')
      ? f.content.replace('</head>', `${stamp}\n</head>`)
      : `${stamp}\n${f.content}`
  }
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function wrapHtml(title: string, site: SiteConfig, lang: string, content: string): string {
  const base = site.url ? `<base href="${site.url.replace(/\/$/, '')}/">` : ''
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${base}
  <title>${title || ''} | ${site.name || ''}</title>
</head>
<body>
  ${content}
</body>
</html>`
}
