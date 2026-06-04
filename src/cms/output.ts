/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CmsComponent } from './types.ts'
import Handlebars from 'handlebars'
import DiffMatchPatch from 'diff-match-patch'
import { type RevisionEntry } from '../types.ts'
import { INITIAL_TEMPLATES } from '../initial-templates.ts'
import { PATH_TEMPLATES_BASELINE, PATH_EXPORT_SOURCE } from '../constants.ts'
import {
  injectTailwindRuntime,
  injectAlpineRuntime,
  revokePreviewBlobUrls,
  rewriteAssetUrlsToBlob,
  stripHtml,
} from './dom.ts'

export const outputMixin: Partial<CmsComponent> & ThisType<CmsComponent> = {
  // --- リビジョン管理 ---

  async showRevisions() {
    if (!this.revisionMgr) return
    const pageId = this.editData.id || this.currentPage?.id || ''
    const typePath = this.currentType ? this.currentType.id : 'pages'

    this.revisions = await this.revisionMgr.list(typePath, pageId, this.currentLang)
    this.selectedRevision = null
    this.revisionDiff = null
    this.showRevisionPanel = true
    this.showPreviewPanel = false
  },

  async selectRevision(rev: RevisionEntry) {
    this.selectedRevision = rev
    const currentBody = this.editor ? await this.getEditorHtml() : this.editData.body || ''
    const oldBody = rev.data.body || ''
    const dmp = new DiffMatchPatch()
    const diffs = dmp.diff_main(stripHtml(oldBody), stripHtml(currentBody))
    dmp.diff_cleanupSemantic(diffs)
    this.revisionDiff = dmp.diff_prettyHtml(diffs)
  },

  async restoreRevision() {
    if (!this.selectedRevision) return
    const data = this.selectedRevision.data
    this.editData = { ...this.editData, ...data }
    if (this.editor && data.body) {
      // Editor.jsを再初期化してリビジョンデータをロード
      this.initEditor((data as any)._editorJson || data.body || '')
    }
    this.showRevisionPanel = false
    // 復元内容は未保存状態扱い（ユーザーが確認して保存ボタンを押せるように）
    this.markDirty()
    this.showToast('リビジョンを復元しました')
  },

  // --- プレビュー ---

  async showPreview() {
    if (!this.exporter) return
    if (this.editor) {
      this.editData.body = await this.getEditorHtml()
    }

    try {
      await this.exporter.resolveThemeDir(this.activeThemeId)
      await this.exporter.registerPartials()
      const baseTemplate = await this.exporter.loadTemplate('_base')
      const pageTemplate = await this.exporter.loadTemplate(this.currentType ? 'detail' : 'page')

      const pageData = { ...this.editData }
      const lang = this.currentLang

      const pageType = this.currentType ? 'detail' : 'page'
      // プレビュー用に site にメニューデータを注入
      const menuData = (await this.fs?.readJson<any>('content/menus.json')) || { menus: [] }
      const menus: Record<string, unknown[]> = {}
      for (const menu of menuData.menus || []) {
        menus[menu.id] = menu.items || []
      }
      const previewSite = {
        ...this.siteConfig,
        menus,
        nav: menuData.menus?.[0]?.items || this.siteConfig.nav || [],
      }

      // pagePath を計算（カレント判定で使用）
      const pageSlug = pageData.slug || pageData.id || ''
      const isHome = !this.currentType && pageData.id === this.frontPageId
      const previewPagePath = this.currentType
        ? `${this.currentType.slug}/${pageSlug}/`
        : isHome
          ? ''
          : `${pageSlug}/`

      const previewCtx = {
        page: pageData,
        pageType,
        type: this.currentType || undefined,
        site: previewSite,
        lang,
        locales: this.languages.locales,
        defaultLang: this.languages.default,
        pagePath: previewPagePath,
        isHome,
        breadcrumb: [
          { label: this.siteConfig.name || 'Home', url: '/' },
          ...(this.currentType ? [{ label: this.currentType.label, url: '#' }] : []),
          { label: pageData.title },
        ],
      }

      const innerHtml = pageTemplate
        ? pageTemplate(previewCtx)
        : `<h1>${pageData.title || ''}</h1>${pageData.body || ''}`

      const rendered = baseTemplate
        ? baseTemplate({
            ...previewCtx,
            content: new Handlebars.SafeString(innerHtml),
          })
        : innerHtml

      // 古いプレビューBlob URLを破棄してから新しいプレビューを作る
      revokePreviewBlobUrls()
      // /assets/... 参照を Blob URL に書き換える（iframe 内で実ファイルが
      // 解決できないため）
      let html = await rewriteAssetUrlsToBlob(rendered, this.fs)
      // Tailwind CSS v4 + Alpine.js をプレビューに注入
      html = injectTailwindRuntime(html)
      html = injectAlpineRuntime(html)
      this.previewHtml = html

      this.showPreviewPanel = true
      this.showRevisionPanel = false
    } catch (e) {
      console.error('プレビューエラー:', e)
      this.previewHtml = `<!DOCTYPE html><html lang="${this.currentLang}"><head><meta charset="UTF-8"><title>${this.editData.title || ''}</title></head><body><h1>${this.editData.title || ''}</h1>${this.editData.body || ''}</body></html>`
      this.showPreviewPanel = true
      this.showRevisionPanel = false
    }
  },

  closePanel() {
    this.showRevisionPanel = false
    this.showPreviewPanel = false
    // プレビュー用 Blob URL をメモリリークしないよう解放
    revokePreviewBlobUrls()
  },

  // --- 書き出し（静的HTML生成 + 差分抽出） ---

  async exportSite() {
    if (!this.fs || !this.exporter || !this.diffEngine || this.exporting) return
    this.exporting = true
    this.exportResult = null
    this.exportProgress = { step: 0, total: 0 }

    try {
      const files = await this.exporter.exportAll(
        this.siteConfig,
        this.languages,
        this.pages,
        this.contentTypes,
        (step, total) => {
          this.exportProgress = { step, total }
        },
      )

      // 変更がなければ全体スキップ（増分書き出し）
      if (files === null) {
        this.showToast('前回から変更がないため、書き出しをスキップしました', 5000)
        return
      }

      const { manifest, changed, removed } = await this.diffEngine.detectChanges(files)
      const result = await this.diffEngine.writeToDisk(files, manifest, changed)

      // 書き出し成功後にソース署名を保存（次回の変更検知用）
      await this.fs.writeJson(PATH_EXPORT_SOURCE, {
        hash: this.exporter.lastSourceHash,
        at: new Date().toISOString(),
      })

      this.exportResult = {
        totalFiles: result.totalFiles,
        changedFiles: result.changedFiles,
        removedFiles: removed.length,
      }
      this.view = 'export-result'
    } catch (e) {
      console.error('書き出しエラー:', e)
      this.showToast('書き出しに失敗しました')
    } finally {
      this.exporting = false
      this.exportProgress = null
    }
  },

  // --- テーマ（差し替え可能なパッケージ） ---

  /** アクティブテーマの manifest（theme.json）を読み込む。色/フォントの選択肢を供給。 */
  async loadActiveThemeManifest() {
    if (!this.fs) return
    const dir = `themes/${this.activeThemeId}`
    this.activeThemeManifest =
      (await this.fs.readJson(`${dir}/theme.json`)) ||
      // 旧構造（フラット templates/config.json）からのフォールバック
      (await this.fs.readJson('templates/config.json')) ||
      null
  },

  /** themes/ をスキャンしてインストール済みテーマ一覧を作る。 */
  async loadInstalledThemes() {
    if (!this.fs) return
    const ids = await this.fs.listSubdirectories('themes')
    const themes: CmsComponent['installedThemes'] = []
    for (const id of ids) {
      const m = await this.fs.readJson<{ name?: string; version?: string; author?: string }>(
        `themes/${id}/theme.json`,
      )
      if (m) themes.push({ id, name: m.name || id, version: m.version, author: m.author })
    }
    this.installedThemes = themes
  },

  /** アクティブテーマを切り替える。色/フォント選択は新テーマの選択肢に合わせて検証・調整。 */
  async switchTheme(id: string) {
    if (!this.fs || id === this.activeThemeId) return
    this.siteConfig.themeId = id
    await this.loadActiveThemeManifest()
    // 旧テーマの配色/フォント id が新テーマに無ければ、新テーマの先頭プリセットへ。
    const colors = this.activeThemeManifest?.colors || []
    const fonts = this.activeThemeManifest?.fonts || []
    const cur = this.siteConfig.theme || {}
    const color = colors.find((c) => c.id === cur.id) || colors[0]
    const font = fonts.find((f) => f.id === cur.fontId) || fonts[0]
    this.siteConfig.theme = {
      ...(color ? { id: color.id, primary: color.primary, secondary: color.secondary } : {}),
      ...(font ? { fontId: font.id, fontFamily: font.family, fontCdn: font.cdn || '' } : {}),
    }
    await this.saveSiteConfig()
    this.showToast(`テーマを「${this.activeThemeManifest?.name || id}」に切り替えました`)
  },

  /** テーマ設定ページ（外観）を開く。インストール済みテーマと manifest を読み込む。 */
  async loadThemesPage() {
    if (!this.fs) return
    await this.loadInstalledThemes()
    await this.loadActiveThemeManifest()
    this.view = 'themes'
    this.updateHash()
  },

  // --- テンプレートエディタ ---

  async loadTemplateEditor() {
    if (!this.fs) return
    // アクティブテーマのフォルダを編集対象に（無ければ旧 templates/ にフォールバック）
    const dir = `themes/${this.activeThemeId}`
    let files = await this.fs.readTemplateFiles(dir)
    if (!files.length) files = await this.fs.readTemplateFiles('templates')
    this.templateFiles = files
    this.currentTemplateFile = ''
    this.templateCode = ''
    this.view = 'templates'
    this.updateHash()
    // 既定テンプレートの更新有無をチェック（同梱デフォルトテーマがアクティブなときのみ）
    await this.checkTemplateUpdates()
  },

  /**
   * 同梱の既定テンプレートとユーザーのファイルを比較し、更新可能なものを一覧化する。
   * - status 'safe'     : ユーザー未編集（基準ハッシュ一致）。取り込んでも編集が失われない
   * - status 'conflict' : ユーザーが編集済み、または基準が未記録。差分を確認の上で取り込む
   */
  async checkTemplateUpdates() {
    if (!this.fs || !this.diffEngine) return
    // 同梱の既定テンプレート（INITIAL_TEMPLATES = themes/default/）との比較なので、
    // デフォルトテーマがアクティブなときのみ意味を持つ。他テーマ使用時は更新提案を出さない。
    if (this.activeThemeId !== 'default') {
      this.templateUpdates = []
      this.selectedUpdatePath = ''
      this.templateUpdateDiff = null
      return
    }
    const baseline = (await this.fs.readJson<Record<string, string>>(PATH_TEMPLATES_BASELINE)) || {}
    const updates: Array<{ path: string; name: string; status: 'safe' | 'conflict' }> = []
    let baselineChanged = false
    for (const [path, bundled] of Object.entries(INITIAL_TEMPLATES)) {
      const current = await this.fs.readText(path)
      if (current === null) continue // ensureMissingTemplates で作成済みのはず
      if (current === bundled) {
        // 最新。基準を現行既定のハッシュに揃える（将来の判定用に自己修復）
        const h = await this.diffEngine.hash(bundled)
        if (baseline[path] !== h) {
          baseline[path] = h
          baselineChanged = true
        }
        continue
      }
      const currentHash = await this.diffEngine.hash(current)
      const status = baseline[path] && baseline[path] === currentHash ? 'safe' : 'conflict'
      updates.push({ path, name: path.split('/').pop() || path, status })
    }
    if (baselineChanged) await this.fs.writeJson(PATH_TEMPLATES_BASELINE, baseline)
    this.templateUpdates = updates
    this.selectedUpdatePath = ''
    this.templateUpdateDiff = null
  },

  /** 指定テンプレートの差分（現在 → 新しい既定）を表示用に生成。再度押すと閉じる */
  async viewTemplateUpdateDiff(path: string) {
    if (!this.fs) return
    if (this.selectedUpdatePath === path) {
      this.selectedUpdatePath = ''
      this.templateUpdateDiff = null
      return
    }
    const current = (await this.fs.readText(path)) || ''
    const bundled = INITIAL_TEMPLATES[path] || ''
    const dmp = new DiffMatchPatch()
    const diffs = dmp.diff_main(current, bundled)
    dmp.diff_cleanupSemantic(diffs)
    this.selectedUpdatePath = path
    this.templateUpdateDiff = dmp.diff_prettyHtml(diffs)
  },

  /** 1 ファイルを新しい既定で上書きし、基準ハッシュを更新する */
  async applyTemplateUpdate(path: string) {
    if (!this.fs || !this.diffEngine) return
    const bundled = INITIAL_TEMPLATES[path]
    if (bundled === undefined) return
    const name = path.split('/').pop() || path
    if (!(await this.showConfirm(`「${name}」を新しい既定の内容で上書きします。よろしいですか？`)))
      return
    await this.fs.writeText(path, bundled)
    const baseline = (await this.fs.readJson<Record<string, string>>(PATH_TEMPLATES_BASELINE)) || {}
    baseline[path] = await this.diffEngine.hash(bundled)
    await this.fs.writeJson(PATH_TEMPLATES_BASELINE, baseline)
    if (this.currentTemplateFile === path) this.templateCode = bundled
    await this.checkTemplateUpdates()
    this.showToast(`「${name}」を更新しました`)
  },

  /** 未編集（safe）のテンプレートをまとめて更新する */
  async applySafeTemplateUpdates() {
    if (!this.fs || !this.diffEngine) return
    const safe = this.templateUpdates.filter((u) => u.status === 'safe')
    if (!safe.length) return
    if (
      !(await this.showConfirm(
        `未編集の ${safe.length} 件を新しい既定に更新します。よろしいですか？`,
      ))
    )
      return
    const baseline = (await this.fs.readJson<Record<string, string>>(PATH_TEMPLATES_BASELINE)) || {}
    for (const u of safe) {
      const bundled = INITIAL_TEMPLATES[u.path]
      if (bundled === undefined) continue
      await this.fs.writeText(u.path, bundled)
      baseline[u.path] = await this.diffEngine.hash(bundled)
      if (this.currentTemplateFile === u.path) this.templateCode = bundled
    }
    await this.fs.writeJson(PATH_TEMPLATES_BASELINE, baseline)
    await this.checkTemplateUpdates()
    this.showToast(`${safe.length} 件のテンプレートを更新しました`)
  },

  async openTemplateFile(path: string) {
    if (!this.fs) return
    const text = await this.fs.readText(path)
    this.currentTemplateFile = path
    this.templateCode = text || ''
  },

  async saveTemplateFile() {
    if (!this.fs || !this.currentTemplateFile) return
    await this.fs.writeText(this.currentTemplateFile, this.templateCode)
    this.showToast('テンプレートを保存しました')
  },
}
