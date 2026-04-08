import Handlebars from 'handlebars'
import type { FileSystem } from './fs.ts'
import type { SiteConfig, Languages, ContentType, ExportFile } from './types.ts'

type TemplateFunction = (context: Record<string, unknown>) => string

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
          '{{#if page.description}}<meta property="og:description" content="{{page.description}}">{{/if}}',
          '<meta property="og:title" content="{{page.title}}">',
          '<meta property="og:type" content="website">',
          '{{#if site.url}}<link rel="canonical" href="{{site.url}}">{{/if}}',
          '{{breadcrumbJsonLd breadcrumb site.url}}',
          '{{articleJsonLd page site}}',
          '{{hreflangTags pagePath locales defaultLang site.url}}',
        ].join('\n'),
      )
    }
    if (!this.handlebars.partials['footer']) {
      this.handlebars.registerPartial('footer', '')
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
    const listTemplate = await this.loadTemplate('list')
    const detailTemplate = await this.loadTemplate('detail')

    const files: ExportFile[] = []
    const locales = languages.locales || [{ code: 'ja', label: '日本語', flag: '🇯🇵' }]
    const defaultLang = languages.default || 'ja'
    let step = 0

    for (const locale of locales) {
      const lang = locale.code
      const prefix = lang === defaultLang ? '' : `${lang}/`

      // 固定ページ書き出し
      const langPages = await this.fs.readPages(lang)
      for (const page of langPages) {
        if (page.status && page.status !== 'published' && page.status !== 'archived') continue

        const breadcrumb = [{ label: siteConfig.name || 'Home', url: '/' }, { label: page.title }]

        const pagePath = page.id === 'index' ? '' : `${page.id}/`
        const ctx = { page, site: siteConfig, lang, breadcrumb, locales, defaultLang, pagePath }

        const pageHtml = pageTemplate
          ? pageTemplate(ctx)
          : `<h1>${page.title}</h1>${page.body || ''}`

        const fullHtml = baseTemplate
          ? baseTemplate({ ...ctx, content: new Handlebars.SafeString(pageHtml) })
          : wrapHtml(page.title, siteConfig, lang, pageHtml)

        const filePath =
          page.id === 'index' ? `${prefix}index.html` : `${prefix}${page.id}/index.html`

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
            url: `/${prefix}${type.slug}/${item.id}/`,
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
            site: siteConfig,
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
          const detailPagePath = `${type.slug}/${item.id}/`
          const detailCtx = {
            page: item,
            site: siteConfig,
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
            path: `${prefix}${type.slug}/${item.id}/index.html`,
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

    // robots.txt
    files.push({
      path: 'robots.txt',
      content: `User-agent: *\nAllow: /\n${siteConfig.url ? `Sitemap: ${siteConfig.url.replace(/\/$/, '')}/sitemap.xml` : ''}`,
    })

    return files
  }
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
