import type { CmsComponent } from './types.ts'
import { STORAGE_UI_LOCALE_KEY, PATH_I18N_DIR, DEFAULT_TIMEZONE } from '../constants.ts'
import { DEFAULT_UI_CATALOGS } from '../i18n-catalogs.ts'
import { getLocalizedReference } from './template-reference.ts'

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
    // テンプレートリファレンス等の静的データも現在の UI 言語に合わせて差し替える
    const ref = getLocalizedReference(this.uiLocale)
    this.categorySnippets = ref.categorySnippets
    this.tagSnippets = ref.tagSnippets
    this.templateReferenceGroups = ref.templateReferenceGroups
    this.templateDescriptions = ref.templateDescriptions
  },

  /** 翻訳カタログ＋テンプレートをプロジェクトに用意。
   *  - 無ければ作成。
   *  - 既存ファイルには、新版で追加された未収録キーだけを補完（既存の訳は優先）。
   *  運用者は content/i18n/ 内のファイルを直接編集して翻訳を調整できる。 */
  async ensureI18nFiles() {
    if (!this.fs) return
    for (const [loc, cat] of Object.entries(DEFAULT_UI_CATALOGS)) {
      const path = `${PATH_I18N_DIR}/${loc}.json`
      const existing = await this.fs.readJson<Record<string, string>>(path)
      if (!existing) {
        await this.fs.writeJson(path, cat)
        continue
      }
      // 既定にあって未収録のキーのみ追加（既存の翻訳は上書きしない）
      let changed = false
      const merged = { ...existing }
      for (const [key, val] of Object.entries(cat)) {
        if (!(key in merged)) {
          merged[key] = val
          changed = true
        }
      }
      if (changed) await this.fs.writeJson(path, merged)
    }
    // 新言語追加用テンプレート（全 msgid・空訳）。既存にも不足キーを補完。
    const tplPath = `${PATH_I18N_DIR}/_template.json`
    const tplExisting = (await this.fs.readJson<Record<string, string>>(tplPath)) || {}
    let tplChanged = false
    for (const key of Object.keys(DEFAULT_UI_CATALOGS.en || {})) {
      if (!(key in tplExisting)) {
        tplExisting[key] = ''
        tplChanged = true
      }
    }
    if (tplChanged || Object.keys(tplExisting).length === 0) {
      await this.fs.writeJson(tplPath, tplExisting)
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
