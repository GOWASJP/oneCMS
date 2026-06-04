import type { CmsComponent } from './types.ts'
import { STORAGE_UI_LOCALE_KEY, PATH_I18N_DIR, DEFAULT_TIMEZONE } from '../constants.ts'
import { DEFAULT_UI_CATALOGS } from '../i18n-catalogs.ts'

export const i18nMixin: Partial<CmsComponent> & ThisType<CmsComponent> = {
  /** 翻訳: シンボリックキー → 現在のUI言語の訳。
   *  未訳は「既定カタログ(現在言語) → 既定カタログ(日本語) → キー」の順にフォールバック。
   *  params を渡すと訳文中の {name} 形式を置換（語順が言語で異なる文に対応）。 */
  t(key: string, params?: Record<string, string | number>): string {
    const c = this.uiCatalog
    let s =
      (c && c[key]) || DEFAULT_UI_CATALOGS[this.uiLocale]?.[key] || DEFAULT_UI_CATALOGS.ja[key]
    if (s === undefined) return key
    if (params) {
      for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v))
    }
    return s
  },

  /** UI言語を切り替え（localStorage 保存＋カタログ再読込） */
  async setUiLocale(locale: string) {
    this.uiLocale = locale
    localStorage.setItem(STORAGE_UI_LOCALE_KEY, locale)
    await this.loadUiCatalog()
  },

  /** 現在のUI言語のカタログを読み込む（日本語含む全言語が対象）。
   *  プロジェクトの content/i18n/<locale>.json（編集可能）を優先し、無ければ既定カタログ。 */
  async loadUiCatalog() {
    let cat: Record<string, string> | null = null
    if (this.fs) {
      cat = await this.fs.readJson<Record<string, string>>(`${PATH_I18N_DIR}/${this.uiLocale}.json`)
    }
    this.uiCatalog = cat || DEFAULT_UI_CATALOGS[this.uiLocale] || DEFAULT_UI_CATALOGS.ja || {}
  },

  /** 翻訳カタログ＋テンプレートをプロジェクトに用意（無ければ作成）。
   *  運用者は content/i18n/ 内のファイルを直接編集して翻訳を調整できる。 */
  async ensureI18nFiles() {
    if (!this.fs) return
    for (const [loc, cat] of Object.entries(DEFAULT_UI_CATALOGS)) {
      const path = `${PATH_I18N_DIR}/${loc}.json`
      if ((await this.fs.readJson(path)) === null) {
        await this.fs.writeJson(path, cat)
      }
    }
    // 新言語追加用テンプレート（全 msgid・空訳）。英語カタログのキーを基準に生成。
    const tplPath = `${PATH_I18N_DIR}/_template.json`
    if ((await this.fs.readJson(tplPath)) === null) {
      const tpl: Record<string, string> = {}
      for (const key of Object.keys(DEFAULT_UI_CATALOGS.en || {})) tpl[key] = ''
      await this.fs.writeJson(tplPath, tpl)
    }
  },

  /** 日付/時刻を、管理画面の表示言語＋サイトのタイムゾーンで整形する。 */
  formatDate(value: unknown, withTime = false): string {
    if (value === null || value === undefined || value === '') return ''
    const d = new Date(value as string)
    if (isNaN(d.getTime())) return String(value)
    const locale = this.uiLocale === 'en' ? 'en-US' : 'ja-JP'
    const timeZone = this.siteConfig?.timezone || DEFAULT_TIMEZONE
    const opts: Intl.DateTimeFormatOptions = withTime
      ? {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
        }
      : { year: 'numeric', month: 'short', day: 'numeric', timeZone }
    try {
      return new Intl.DateTimeFormat(locale, opts).format(d)
    } catch {
      return String(value)
    }
  },

  /** サイトのタイムゾーンを設定して保存（site.json） */
  async setTimezone(tz: string) {
    if (!this.siteConfig) return
    this.siteConfig.timezone = tz
    await this.saveSiteConfig()
  },
}
