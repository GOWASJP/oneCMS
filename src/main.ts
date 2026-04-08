import Alpine from 'alpinejs'
import EditorJS from '@editorjs/editorjs'
import { createIcons } from 'lucide'
import DiffMatchPatch from 'diff-match-patch'
import Handlebars from 'handlebars'
import * as icons from './icons.ts'

import { FileSystem } from './fs.ts'
import { Exporter } from './export.ts'
import { DiffEngine } from './diff.ts'
import { RevisionManager } from './revision.ts'
import { saveImage } from './image.ts'
import { saveFolderHandle, restoreFolderHandle } from './storage.ts'
import { createEditor, editorJsonToHtml, htmlToEditorJson, type EditorData } from './editor.ts'
import type {
  SiteConfig,
  Languages,
  ContentData,
  ContentType,
  FieldDefinition,
  RevisionEntry,
  ExportResult,
} from './types.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Alpine global
;(window as any).Alpine = Alpine

// Lucideアイコン初期化（debounce付き）
let iconTimer: number | null = null
function refreshIcons(): void {
  if (iconTimer) return
  iconTimer = requestAnimationFrame(() => {
    createIcons({ icons, nameAttr: 'data-lucide' })
    iconTimer = null
  })
}

/** Alpine.jsコンポーネントの型 */
interface CmsComponent {
  authorName: string
  authorInput: string
  folderHandle: FileSystemDirectoryHandle | null
  view: string
  currentLang: string
  exporting: boolean
  exportResult: ExportResult | null
  toast: string | null

  siteConfig: SiteConfig
  languages: Languages
  pages: ContentData[]
  contentTypes: ContentType[]
  contentItems: ContentData[]
  currentPage: ContentData | null
  currentType: ContentType | null
  currentFields: FieldDefinition[]
  editData: ContentData

  editor: EditorJS | null
  revisions: RevisionEntry[]
  selectedRevision: RevisionEntry | null
  revisionDiff: string | null
  showRevisionPanel: boolean
  previewHtml: string
  showPreviewPanel: boolean

  fs: FileSystem | null
  exporter: Exporter | null
  diffEngine: DiffEngine | null
  revisionMgr: RevisionManager | null

  $nextTick(fn: () => void): void

  init(): Promise<void>
  restoreFromHash(): Promise<void>
  updateHash(): void
  viewTitle: string
  setAuthor(): void
  showToast(message: string, duration?: number): void
  selectFolder(): Promise<void>
  loadSiteData(): Promise<void>
  ensureInitialData(): Promise<void>
  openPage(page: ContentData): Promise<void>
  openContentType(type: ContentType): Promise<void>
  openContent(item: ContentData): Promise<void>
  createContent(): void
  initEditor(bodyData: string | EditorData): void
  getEditorHtml(): Promise<string>
  handleImageUpload(event: Event, fieldKey: string): Promise<void>
  handleFileUpload(event: Event, fieldKey: string): Promise<void>
  savePage(): Promise<void>
  saveSiteConfig(): Promise<void>
  showRevisions(): Promise<void>
  selectRevision(rev: RevisionEntry): Promise<void>
  restoreRevision(): Promise<void>
  showPreview(): Promise<void>
  closePanel(): void
  exportSite(): Promise<void>
  switchLang(lang: string): Promise<void>
  copyFromLang(sourceLang: string): Promise<void>
  getTranslationStatus(): Promise<Array<{ code: string; flag: string; status: string }>>
  refreshTranslationStatus(): Promise<void>
  // コンテンツタイプ管理
  showTypeEditor: boolean
  editingType: ContentType | null
  openTypeEditor(type?: ContentType): void
  saveType(): Promise<void>
  deleteType(): Promise<void>
  addFieldToType(): void
  removeFieldFromType(idx: number): void
  // タクソノミー管理
  showTaxonomyEditor: boolean
  taxonomyData: {
    categories: Array<{ id: string; label: string }>
    tags: Array<{ id: string; label: string }>
  }
  loadTaxonomies(): Promise<void>
  saveTaxonomies(): Promise<void>
  // 言語設定
  showLangEditor: boolean
  langEditorData: Languages
  loadLangEditor(): void
  saveLangConfig(): Promise<void>
  addLangLocale(): void
  removeLangLocale(idx: number): void
  translationStatuses: Array<{ code: string; flag: string; status: string }>
}

Alpine.data('cms', () => {
  const component: CmsComponent & ThisType<CmsComponent> = {
    // 状態管理
    authorName: localStorage.getItem('gowas-cms-author') || '',
    authorInput: '',
    folderHandle: null,
    view: 'welcome',
    currentLang: 'ja',
    exporting: false,
    exportResult: null,
    toast: null,

    // データ
    siteConfig: { name: '', url: '', description: '', services: {}, theme: {} } as SiteConfig,
    languages: {
      default: 'ja',
      locales: [{ code: 'ja', label: '日本語', flag: '🇯🇵' }],
    },
    pages: [],
    contentTypes: [],
    contentItems: [],
    currentPage: null,
    currentType: null,
    currentFields: [],
    editData: { id: '', title: '' },

    // 翻訳ステータス
    translationStatuses: [],

    // コンテンツタイプ管理
    showTypeEditor: false,
    editingType: null,

    // タクソノミー管理
    showTaxonomyEditor: false,
    taxonomyData: { categories: [], tags: [] },

    // 言語設定
    showLangEditor: false,
    langEditorData: { default: 'ja', locales: [] },

    // エディタ
    editor: null,

    // リビジョン
    revisions: [],
    selectedRevision: null,
    revisionDiff: null,
    showRevisionPanel: false,

    // プレビュー
    previewHtml: '',
    showPreviewPanel: false,

    // FS / エンジン
    fs: null,
    exporter: null,
    diffEngine: null,
    revisionMgr: null,

    // $nextTick placeholder (Alpine provides this at runtime)
    $nextTick(_fn: () => void) {},

    /** Alpine init — ページ読み込み時に前回のフォルダを自動復元 */
    async init() {
      if (!this.authorName) return
      const handle = await restoreFolderHandle()
      if (!handle) return

      // 誤って content/ を選択していた場合は復元しない
      const isContentDir =
        (await hasFile(handle, 'site.json')) && !(await hasDir(handle, 'content'))
      if (isContentDir) return

      this.folderHandle = handle
      this.fs = new FileSystem(handle)
      this.exporter = new Exporter(this.fs)
      this.diffEngine = new DiffEngine(this.fs)
      this.revisionMgr = new RevisionManager(this.fs)
      await this.loadSiteData()
      await this.restoreFromHash()
    },

    /** URLハッシュを現在のビュー状態で更新 */
    updateHash() {
      let hash = ''
      if (this.view === 'page-edit' && this.currentPage) {
        hash = `#/pages/${this.currentPage.id}`
      } else if (this.view === 'content-list' && this.currentType) {
        hash = `#/content/${this.currentType.id}`
      } else if (this.view === 'content-edit' && this.currentType && this.currentPage) {
        hash = `#/content/${this.currentType.id}/${this.currentPage.id}`
      } else if (this.view === 'settings') {
        hash = '#/settings'
      }
      if (hash) {
        history.replaceState(null, '', hash)
      }
    },

    /** URLハッシュからビューを復元 */
    async restoreFromHash() {
      const hash = location.hash
      if (!hash || !this.fs) return

      const parts = hash.replace('#/', '').split('/')

      if (parts[0] === 'settings') {
        this.view = 'settings'
      } else if (parts[0] === 'pages' && parts[1]) {
        const page = this.pages.find((p) => p.id === parts[1])
        if (page) await this.openPage(page)
      } else if (parts[0] === 'content' && parts[1]) {
        const type = this.contentTypes.find((t) => t.id === parts[1])
        if (type) {
          await this.openContentType(type)
          if (parts[2]) {
            const item = this.contentItems.find((i) => i.id === parts[2])
            if (item) await this.openContent(item)
          }
        }
      }
    },

    get viewTitle(): string {
      if (this.view === 'page-edit' && this.currentPage)
        return this.currentPage.title || this.currentPage.id
      if (this.view === 'content-edit' && this.currentPage)
        return this.currentPage.title || '新規作成'
      if (this.view === 'content-list' && this.currentType) return this.currentType.label
      if (this.view === 'settings') return 'サイト設定'
      if (this.view === 'export-result') return '公開準備 完了'
      return 'GOWAS CMS'
    },

    setAuthor() {
      const name = this.authorInput.trim()
      if (!name) return
      this.authorName = name
      localStorage.setItem('gowas-cms-author', name)
    },

    showToast(message: string, duration = 3000) {
      this.toast = message
      setTimeout(() => {
        this.toast = null
      }, duration)
    },

    // --- フォルダ選択・データ読み込み ---

    async selectFolder() {
      try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' })

        // content/ フォルダを直接選んでしまった場合の検出
        // site.json がルート直下にあり、かつ content/ サブフォルダがない = content/ を選んだ
        const hasRootSiteJson = await hasFile(handle, 'site.json')
        const hasContentDir = await hasDir(handle, 'content')
        if (hasRootSiteJson && !hasContentDir) {
          this.showToast('content/ ではなくプロジェクトのルートフォルダを選択してください', 5000)
          return
        }

        this.folderHandle = handle
        this.fs = new FileSystem(handle)
        this.exporter = new Exporter(this.fs)
        this.diffEngine = new DiffEngine(this.fs)
        this.revisionMgr = new RevisionManager(this.fs)
        await saveFolderHandle(handle)
        await this.loadSiteData()
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError') console.error('フォルダ選択エラー:', e)
      }
    },

    async loadSiteData() {
      if (!this.fs) return

      // 初回起動時に初期データを自動生成
      await this.ensureInitialData()

      this.siteConfig = (await this.fs.readJson<SiteConfig>('content/site.json')) || {
        name: '',
        url: '',
        description: '',
        services: {},
        theme: {},
      }
      this.languages =
        (await this.fs.readJson<Languages>('content/languages.json')) || this.languages
      this.currentLang = this.languages.default || 'ja'
      this.contentTypes = await this.fs.readContentTypes()
      this.pages = await this.fs.readPages(this.currentLang)
    },

    /** 初回起動時に必要なフォルダ・ファイルを自動作成 */
    async ensureInitialData() {
      if (!this.fs) return

      // site.json がなければ初期データ一式を作成
      const existing = await this.fs.readJson('content/site.json')
      if (existing) return

      // site.json
      await this.fs.writeJson('content/site.json', {
        name: 'マイサイト',
        url: '',
        description: '',
      })

      // languages.json
      await this.fs.writeJson('content/languages.json', {
        default: 'ja',
        locales: [
          { code: 'ja', label: '日本語', flag: '🇯🇵' },
          { code: 'en', label: 'English', flag: '🇺🇸' },
        ],
      })

      // コンテンツタイプ: お知らせ
      await this.fs.writeJson('content/_types/news.json', {
        id: 'news',
        label: 'お知らせ',
        icon: '📢',
        slug: 'news',
        order: 'date_desc',
        hasCategory: true,
        hasTag: true,
        hasThumbnail: true,
        hasDate: true,
        pagination: 10,
        fields: [
          { key: 'title', label: 'タイトル', type: 'text', required: true },
          { key: 'body', label: '本文', type: 'richtext' },
          { key: 'image', label: '画像', type: 'image' },
        ],
      })

      // 固定ページ: トップ
      await this.fs.writeJson('content/pages/index/ja.json', {
        title: 'トップページ',
        body: '<p>ようこそ。ここはトップページです。</p>',
        status: 'published',
        _meta: {
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          author: this.authorName,
        },
      })

      // 固定ページ: 会社概要
      await this.fs.writeJson('content/pages/about/ja.json', {
        title: '会社概要',
        body: '<p>会社概要のページです。</p>',
        status: 'published',
        _meta: {
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          author: this.authorName,
        },
      })
    },

    // --- 固定ページ ---

    async openPage(page: ContentData) {
      this.currentPage = page
      this.currentType = null
      this.currentFields = []
      this.showRevisionPanel = false
      this.showPreviewPanel = false
      this.view = 'page-edit'
      this.editData = { ...page }
      this.initEditor((page as any)._editorJson || page.body || '')
      this.updateHash()
      this.refreshTranslationStatus()
    },

    // --- コンテンツタイプ ---

    async openContentType(type: ContentType) {
      if (!this.fs) return
      this.currentType = type
      this.currentPage = null
      this.showRevisionPanel = false
      this.showPreviewPanel = false
      this.view = 'content-list'
      this.contentItems = await this.fs.readContentList(type.id, this.currentLang)
      this.updateHash()
    },

    async openContent(item: ContentData) {
      this.currentPage = item
      this.currentFields = this.currentType?.fields || []
      this.showRevisionPanel = false
      this.showPreviewPanel = false
      this.view = 'content-edit'
      this.editData = { ...item }
      this.$nextTick(() => {
        const hasRichtext = this.currentFields.some((f) => f.type === 'richtext')
        if (hasRichtext) {
          this.initEditor((item as any)._editorJson || item.body || '')
        }
      })
      this.updateHash()
      this.refreshTranslationStatus()
    },

    createContent() {
      const now = new Date()
      const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
      const item: ContentData = {
        id,
        title: '',
        status: 'draft',
        body: '',
        _meta: {
          createdAt: now.toISOString().split('T')[0],
          updatedAt: now.toISOString().split('T')[0],
          author: this.authorName,
        },
      }
      this.currentPage = item
      this.currentFields = this.currentType?.fields || []
      this.editData = { ...item }
      this.view = 'content-edit'
      this.$nextTick(() => {
        const hasRichtext = this.currentFields.some((f) => f.type === 'richtext')
        if (hasRichtext) {
          this.initEditor('')
        }
      })
    },

    // --- エディタ（Editor.js） ---

    initEditor(bodyData: string | EditorData) {
      if (this.editor) {
        this.editor.destroy()
        this.editor = null
      }

      // 既存HTMLをEditor.js JSONに変換（後方互換）
      let data: EditorData | null = null
      if (typeof bodyData === 'string' && bodyData.trim()) {
        data = htmlToEditorJson(bodyData)
      } else if (typeof bodyData === 'object' && bodyData?.blocks) {
        data = bodyData
      }

      this.$nextTick(() => {
        this.editor = createEditor('editorjs', data, this.fs)
      })
    },

    async getEditorHtml(): Promise<string> {
      if (!this.editor) return this.editData.body || ''
      const outputData = await this.editor.save()
      // Editor.js JSONをbody_jsonとして保存し、HTMLも生成
      this.editData._editorJson = outputData
      return editorJsonToHtml(outputData as EditorData)
    },

    // --- 画像アップロード ---

    async handleImageUpload(event: Event, fieldKey: string) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      if (!file || !this.fs) return
      try {
        const result = await saveImage(this.fs, file)
        this.editData[fieldKey] = `/${result.path}`
        const saved = ((1 - result.size / result.originalSize) * 100).toFixed(0)
        this.showToast(`画像を最適化しました（${saved}%削減）`)
      } catch (e) {
        console.error('画像最適化エラー:', e)
        this.showToast('画像の処理に失敗しました')
      }
    },

    async handleFileUpload(event: Event, fieldKey: string) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      if (!file || !this.fs) return
      try {
        const buffer = await file.arrayBuffer()
        const path = `assets/files/${file.name}`
        await this.fs.writeBlob(path, new Blob([buffer]))
        this.editData[fieldKey] = `/${path}`
        this.showToast(`${file.name} をアップロードしました`)
      } catch (e) {
        console.error('ファイルアップロードエラー:', e)
        this.showToast('ファイルのアップロードに失敗しました')
      }
    },

    // --- 保存（リビジョン自動作成付き） ---

    async savePage() {
      if (!this.fs) return
      if (this.editor) {
        this.editData.body = await this.getEditorHtml()
      }
      this.editData._meta = {
        ...this.editData._meta,
        updatedAt: new Date().toISOString().split('T')[0],
        author: this.authorName,
      }

      const pageId = this.editData.id || this.currentPage?.id || ''
      const typePath = this.currentType ? this.currentType.id : 'pages'

      if (this.currentType) {
        await this.fs.saveContent(this.currentType.id, pageId, this.currentLang, this.editData)
        this.contentItems = await this.fs.readContentList(this.currentType.id, this.currentLang)
      } else {
        await this.fs.savePage(pageId, this.currentLang, this.editData)
        this.pages = await this.fs.readPages(this.currentLang)
      }

      if (this.revisionMgr) {
        await this.revisionMgr.save(typePath, pageId, this.currentLang, this.editData)
      }

      this.showToast('保存しました')
    },

    async saveSiteConfig() {
      if (!this.fs) return
      await this.fs.writeJson('content/site.json', this.siteConfig)
      this.showToast('サイト設定を保存しました')
    },

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

        const innerHtml = pageTemplate
          ? pageTemplate({
              page: pageData,
              site: this.siteConfig,
              lang,
              breadcrumb: [
                { label: this.siteConfig.name || 'Home', url: '/' },
                ...(this.currentType ? [{ label: this.currentType.label, url: '#' }] : []),
                { label: pageData.title },
              ],
            })
          : `<h1>${pageData.title || ''}</h1>${pageData.body || ''}`

        this.previewHtml = baseTemplate
          ? baseTemplate({
              page: pageData,
              site: this.siteConfig,
              lang,
              content: new Handlebars.SafeString(innerHtml),
            })
          : innerHtml

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
    },

    // --- 公開準備（書き出し + 差分抽出） ---

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

    // --- 多言語 ---

    /** 言語切替（現在の編集を保存してから切替） */
    async switchLang(lang: string) {
      if (!this.fs || lang === this.currentLang) return

      // 現在の編集内容を自動保存
      if (this.editor && (this.view === 'page-edit' || this.view === 'content-edit')) {
        await this.savePage()
      }

      this.currentLang = lang
      this.pages = await this.fs.readPages(lang)

      if (this.currentType) {
        this.contentItems = await this.fs.readContentList(this.currentType.id, lang)
      }

      // 現在開いているページを切替先言語で再読み込み
      if (this.currentPage && this.view === 'page-edit') {
        const page = this.pages.find((p) => p.id === this.currentPage?.id)
        if (page) {
          await this.openPage(page)
        } else {
          // この言語にはまだページが無い
          this.editData = { id: this.currentPage.id, title: '', body: '', status: 'draft' }
          this.initEditor('')
        }
      } else if (this.currentPage && this.view === 'content-edit' && this.currentType) {
        const item = this.contentItems.find((i) => i.id === this.currentPage?.id)
        if (item) {
          await this.openContent(item)
        } else {
          this.editData = { id: this.currentPage.id, title: '', body: '', status: 'draft' }
        }
      }

      await this.refreshTranslationStatus()
    },

    /** 他言語のコンテンツをコピー */
    async copyFromLang(sourceLang: string) {
      if (!this.fs || !this.currentPage) return

      const pageId = this.currentPage.id
      const sourceData: ContentData | null = this.currentType
        ? (await this.fs.readContentList(this.currentType.id, sourceLang)).find(
            (i) => i.id === pageId,
          ) || null
        : (await this.fs.readPages(sourceLang)).find((p) => p.id === pageId) || null

      if (!sourceData) {
        this.showToast(`${sourceLang} のデータが見つかりません`)
        return
      }

      this.editData = {
        ...sourceData,
        id: pageId,
        _meta: {
          ...sourceData._meta,
          status: 'draft',
          basedOn: sourceLang,
          basedOnUpdated: sourceData._meta?.updatedAt || '',
          updatedAt: new Date().toISOString().split('T')[0],
          author: this.authorName,
        },
      }
      this.initEditor((sourceData as any)._editorJson || sourceData.body || '')
      this.showToast(`${sourceLang} の内容をコピーしました`)
    },

    /** 翻訳ステータスを取得・更新 */
    async getTranslationStatus(): Promise<Array<{ code: string; flag: string; status: string }>> {
      if (!this.fs || !this.currentPage) return []

      const pageId = this.currentPage.id
      const statuses: Array<{ code: string; flag: string; status: string }> = []

      for (const locale of this.languages.locales) {
        const data: ContentData | null = this.currentType
          ? (await this.fs.readContentList(this.currentType.id, locale.code)).find(
              (i) => i.id === pageId,
            ) || null
          : (await this.fs.readPages(locale.code)).find((p) => p.id === pageId) || null

        let status = 'missing'
        if (data) {
          const meta = data._meta
          if (meta?.status === 'translated' || (data.title && data.body)) {
            status = 'translated'
          } else {
            status = 'draft'
          }
        }

        statuses.push({ code: locale.code, flag: locale.flag, status })
      }
      return statuses
    },

    async refreshTranslationStatus() {
      this.translationStatuses = await this.getTranslationStatus()
    },

    // --- コンテンツタイプ管理 ---

    openTypeEditor(type?: ContentType) {
      this.editingType = type
        ? JSON.parse(JSON.stringify(type))
        : { id: '', label: '', slug: '', fields: [], pagination: 10 }
      this.showTypeEditor = true
    },

    addFieldToType() {
      if (!this.editingType) return
      this.editingType.fields.push({ key: '', label: '', type: 'text' } as any)
    },

    removeFieldFromType(idx: number) {
      if (!this.editingType) return
      this.editingType.fields.splice(idx, 1)
    },

    async saveType() {
      if (!this.fs || !this.editingType) return
      const t = this.editingType
      if (!t.id) {
        t.id = t.slug || t.label.toLowerCase().replace(/\s+/g, '-')
      }
      if (!t.slug) t.slug = t.id
      await this.fs.writeJson(`content/_types/${t.id}.json`, t)
      this.contentTypes = await this.fs.readContentTypes()
      this.showTypeEditor = false
      this.showToast(`${t.label} を保存しました`)
    },

    async deleteType() {
      if (!this.fs || !this.editingType?.id) return
      const dir = await this.fs.getDir('content/_types')
      if (dir) {
        try {
          await dir.removeEntry(`${this.editingType.id}.json`)
        } catch {
          /* skip */
        }
      }
      this.contentTypes = await this.fs.readContentTypes()
      this.showTypeEditor = false
      this.showToast('削除しました')
    },

    // --- タクソノミー管理 ---

    async loadTaxonomies() {
      if (!this.fs) return
      const cats = await this.fs.readJson<{ items: Array<{ id: string; label: string }> }>(
        'content/taxonomies/categories.json',
      )
      const tags = await this.fs.readJson<{ items: Array<{ id: string; label: string }> }>(
        'content/taxonomies/tags.json',
      )
      this.taxonomyData = {
        categories: cats?.items || [],
        tags: tags?.items || [],
      }
      this.showTaxonomyEditor = true
    },

    async saveTaxonomies() {
      if (!this.fs) return
      await this.fs.writeJson('content/taxonomies/categories.json', {
        id: 'categories',
        label: 'カテゴリ',
        items: this.taxonomyData.categories,
      })
      await this.fs.writeJson('content/taxonomies/tags.json', {
        id: 'tags',
        label: 'タグ',
        items: this.taxonomyData.tags,
      })
      this.showTaxonomyEditor = false
      this.showToast('カテゴリ・タグを保存しました')
    },

    // --- 言語設定 ---

    loadLangEditor() {
      this.langEditorData = JSON.parse(JSON.stringify(this.languages))
      this.showLangEditor = true
    },

    addLangLocale() {
      this.langEditorData.locales.push({ code: '', label: '', flag: '' })
    },

    removeLangLocale(idx: number) {
      this.langEditorData.locales.splice(idx, 1)
    },

    async saveLangConfig() {
      if (!this.fs) return
      await this.fs.writeJson('content/languages.json', this.langEditorData)
      this.languages = JSON.parse(JSON.stringify(this.langEditorData))
      this.showLangEditor = false
      this.showToast('言語設定を保存しました')
    },
  }

  return component as any
})

Alpine.start()

async function hasFile(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name)
    return true
  } catch {
    return false
  }
}

async function hasDir(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getDirectoryHandle(name)
    return true
  } catch {
    return false
  }
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}

// Lucideアイコン：初期化 + DOM変更監視
document.addEventListener('alpine:initialized', () => {
  refreshIcons()
})
const observer = new MutationObserver((mutations) => {
  const hasNewIcons = mutations.some((m) =>
    [...m.addedNodes].some(
      (n) =>
        n.nodeType === 1 &&
        ((n as Element).matches?.('[data-lucide]') ||
          (n as Element).querySelector?.('[data-lucide]')),
    ),
  )
  if (hasNewIcons) refreshIcons()
})
observer.observe(document.body, { childList: true, subtree: true })
