/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CmsComponent } from './types.ts'
import Handlebars from 'handlebars'
import DiffMatchPatch from 'diff-match-patch'
import { type RevisionEntry } from '../types.ts'
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
      const previewPagePath = this.currentType
        ? `${this.currentType.slug}/${pageSlug}/`
        : pageSlug === 'index'
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

    try {
      const files = await this.exporter.exportAll(
        this.siteConfig,
        this.languages,
        this.pages,
        this.contentTypes,
      )

      const { manifest, changed, removed } = await this.diffEngine.detectChanges(files)
      const result = await this.diffEngine.writeToDisk(files, manifest, changed)

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
    }
  },

  // --- テンプレートエディタ ---

  async loadTemplateEditor() {
    if (!this.fs) return
    this.templateFiles = await this.fs.readTemplateFiles()
    this.currentTemplateFile = ''
    this.templateCode = ''
    this.view = 'templates'
    this.updateHash()
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
