import Handlebars from 'handlebars'
import type { FileSystem } from './fs.ts'
import type { SiteConfig, Languages, ContentType, ExportFile, ContentData } from './types.ts'

type TemplateFunction = (context: Record<string, unknown>) => string

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
          .substring(0, 120)
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

    // テーマCSS変数
    hbs.registerHelper('themeStyles', function (site: Record<string, unknown>) {
      const theme = (site as any)?.theme || {}
      const primary = theme.primary || '#2563eb'
      const secondary = theme.secondary || '#1e40af'
      const fontFamily =
        theme.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      const fontCdn = theme.fontCdn || ''

      let css = `<style>:root{--color-primary:${primary};--color-secondary:${secondary};--font-body:${fontFamily};--font-heading:${fontFamily}}body{font-family:var(--font-body)}h1,h2,h3,h4,h5,h6{font-family:var(--font-heading)}</style>`
      if (fontCdn) {
        css = `<link rel="stylesheet" href="${fontCdn}">\n${css}`
      }
      return new Handlebars.SafeString(css)
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
  }

  /** テンプレートファイルを読み込みコンパイル */
  async loadTemplate(name: string): Promise<TemplateFunction | null> {
    const source = await this.fs.readText(`templates/${name}.hbs`)
    if (!source) return null
    return this.handlebars.compile(source)
  }

  /** パーシャル（コンポーネント）を一括登録 */
  async registerPartials(): Promise<void> {
    const componentsDir = await this.fs.getDir('templates/_components')
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
          '{{themeStyles site}}',
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
  ): Promise<ExportFile[]> {
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
    const menuData = (await this.fs.readJson<any>('content/menus.json')) || {
      menus: [],
    }
    // 全メニューを site.menus.<id> でアクセス可能にする
    const menus: Record<string, any[]> = {}
    for (const menu of menuData.menus || []) {
      menus[menu.id] = menu.items || []
    }
    // site オブジェクトにメニューを注入
    const site = {
      ...siteConfig,
      menus,
      // 後方互換: 最初のメニューを nav として提供
      nav: menuData.menus?.[0]?.items || siteConfig.nav || [],
    }

    // コンテンツタイプのアイテムを言語別に事前取得（Handlebarsヘルパーから同期参照するため）
    const typeItemsCache = new Map<string, Map<string, ContentData[]>>()
    for (const locale of locales) {
      const lang = locale.code
      const prefix = lang === defaultLang ? '' : `${lang}/`
      const byType = new Map<string, ContentData[]>()
      for (const type of contentTypes) {
        const items = await this.fs.readContentList(type.id, lang)
        const published = items
          .filter((i) => i.status === 'published' || !i.status)
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
      const langPages = await this.fs.readPages(lang)
      // 親子チェーンのルックアップマップ（id → page）
      const pageById = new Map(langPages.map((p) => [p.id, p]))
      // ページの最終URLパス（親チェーンを辿って / 区切りで連結）
      // `index` はトップページ扱いで / にマップされるため、親チェーンからは除外する
      const resolvePagePath = (page: ContentData): string[] => {
        const slugOf = (p: ContentData): string => p.slug || p.id
        const chain: string[] = []
        let current: ContentData | undefined = page
        const visited = new Set<string>()
        let isSelf = true
        while (current && !visited.has(current.id)) {
          visited.add(current.id)
          const slug = slugOf(current)
          // 親チェーンに index が含まれた場合は省略（自身が index の場合のみ残す）
          if (isSelf || slug !== 'index') chain.unshift(slug)
          isSelf = false
          const parentId: string = (current.parent as string | undefined) || ''
          current = parentId ? pageById.get(parentId) : undefined
        }
        return chain
      }
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
          const segs = resolvePagePath(ancestor)
          const url = segs[0] === 'index' ? '/' : `/${prefix}${segs.join('/')}/`
          crumbs.push({ label: ancestor.title, url })
        }
        crumbs.push({ label: page.title })
        return crumbs
      }

      for (const page of langPages) {
        if (page.status && page.status !== 'published') continue

        const breadcrumb = resolveBreadcrumb(page)
        const segments = resolvePagePath(page)
        const isIndex = segments.length === 1 && segments[0] === 'index'
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
        }

        // トップページは home.hbs が存在すれば優先、無ければ page.hbs にフォールバック
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
        step++
        if (onProgress) onProgress(step, locales.length)
      }

      // コンテンツタイプ書き出し
      for (const type of contentTypes) {
        const items = await this.fs.readContentList(type.id, lang)
        const published = items.filter((i) => i.status === 'published' || !i.status)

        const perPage = type.pagination || 10
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
        for (const item of published) {
          const itemSlug = item.slug || item.id
          const detailPagePath = `${type.slug}/${itemSlug}/`
          const detailCtx = {
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
        }

        step++
        if (onProgress) onProgress(step, locales.length)
      }
    }

    // sitemap.xml
    if (siteConfig.url) {
      const sitemapEntries = files.map((f) => {
        const url = `${siteConfig.url.replace(/\/$/, '')}/${f.path.replace(/index\.html$/, '')}`
        return `  <url><loc>${url}</loc></url>`
      })
      files.push({
        path: 'sitemap.xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join('\n')}\n</urlset>`,
      })
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

    // 検索インデックス生成
    const searchIndex = await this.buildSearchIndex(languages, contentTypes)
    files.push({
      path: 'search-index.json',
      content: JSON.stringify(searchIndex),
    })

    // 検索ページHTML
    files.push({
      path: 'search/index.html',
      content: this.generateSearchPage(siteConfig, defaultLang),
    })

    return files
  }

  /** 検索インデックスを生成 */
  private async buildSearchIndex(
    languages: Languages,
    contentTypes: ContentType[],
  ): Promise<Array<Record<string, string>>> {
    const index: Array<Record<string, string>> = []
    const defaultLang = languages.default || 'ja'

    for (const locale of languages.locales) {
      const lang = locale.code
      const prefix = lang === defaultLang ? '' : `${lang}/`

      // 固定ページ（親チェーンで URL 構築）
      const pages = await this.fs.readPages(lang)
      const pageById = new Map(pages.map((p) => [p.id, p]))
      const resolvePagePath = (page: ContentData): string[] => {
        const slugOf = (p: ContentData): string => p.slug || p.id
        const chain: string[] = []
        let current: ContentData | undefined = page
        const visited = new Set<string>()
        let isSelf = true
        while (current && !visited.has(current.id)) {
          visited.add(current.id)
          const slug = slugOf(current)
          if (isSelf || slug !== 'index') chain.unshift(slug)
          isSelf = false
          const parentId: string = (current.parent as string | undefined) || ''
          current = parentId ? pageById.get(parentId) : undefined
        }
        return chain
      }
      for (const page of pages) {
        if (page.status && page.status !== 'published') continue
        const segs = resolvePagePath(page)
        const isIndex = segs.length === 1 && segs[0] === 'index'
        const url = isIndex ? `/${prefix}` : `/${prefix}${segs.join('/')}/`
        index.push({
          title: page.title,
          body: stripHtmlTags(page.body || '').substring(0, 300),
          url,
          lang,
          type: 'page',
          date: page._meta?.updatedAt || '',
        })
      }

      // コンテンツタイプ
      for (const type of contentTypes) {
        const items = await this.fs.readContentList(type.id, lang)
        for (const item of items) {
          if (item.status && item.status !== 'published') continue
          index.push({
            title: item.title,
            body: stripHtmlTags(item.body || '').substring(0, 300),
            url: `/${prefix}${type.slug}/${item.slug || item.id}/`,
            lang,
            type: type.id,
            date: item.publishedAt || item._meta?.updatedAt || '',
          })
        }
      }
    }

    return index
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
    fetch('/search-index.json').then(r=>r.json()).then(d=>{index=d});
    const q=document.getElementById('q');
    const r=document.getElementById('results');
    q.addEventListener('input',()=>{
      const t=q.value.trim().toLowerCase();
      if(!t){r.innerHTML='';return}
      const matches=index.filter(i=>(i.title+i.body).toLowerCase().includes(t));
      if(!matches.length){r.innerHTML='<div class="no-results">見つかりませんでした</div>';return}
      r.innerHTML='<div class="count">'+matches.length+'件</div>'+matches.map(m=>
        '<div class="result"><h2><a href="'+m.url+'">'+hl(m.title,t)+'</a></h2>'
        +(m.date?'<time>'+m.date+'</time>':'')
        +'<p>'+hl(m.body.substring(0,150),t)+'</p></div>'
      ).join('');
    });
    function hl(s,t){return s.replace(new RegExp('('+t.replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&')+')','gi'),'<mark>$1</mark>')}
  </script>
</body>
</html>`
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
