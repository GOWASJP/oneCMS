// Inter フォントを self-host（Latin サブセットのみでバンドルサイズを抑制）
// 日本語は font-family スタックのシステムフォント（Hiragino / Yu Gothic / Noto Sans JP）にフォールバック
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'

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
import {
  APP_NAME,
  STORAGE_AUTHOR_KEY,
  STORAGE_THEME_KEY,
  TOAST_DURATION,
  AUTOSAVE_DEBOUNCE_MS,
  PATH_SITE_CONFIG,
  PATH_LANGUAGES,
  PATH_MENUS,
  PATH_PAGES_CONFIG,
  PATH_TAXONOMIES_CATEGORIES,
  PATH_TAXONOMIES_TAGS,
  PATH_ASSETS_FILES,
  type ThemeMode,
} from './constants.ts'
import type {
  SiteConfig,
  Languages,
  ContentData,
  ContentType,
  FieldDefinition,
  FieldGroup,
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

  // 自動保存・離脱警告
  isDirty: boolean
  suppressDirty: boolean
  autoSaving: boolean
  autoSaveTimer: number | null
  lastAutoSavedAt: number | null

  // ファビコンプレビュー用（管理画面内で表示するための Blob URL）
  faviconBlobUrl: string

  // テーマ
  themeMode: ThemeMode
  setThemeMode(mode: ThemeMode): void
  markDirty(): void
  scheduleAutoSave(): void
  autoSave(): Promise<void>
  resetDirty(): void

  fs: FileSystem | null
  exporter: Exporter | null
  diffEngine: DiffEngine | null
  revisionMgr: RevisionManager | null

  $nextTick(fn: () => void): void
  $watch(expression: string, callback: (value: unknown) => void): void

  init(): Promise<void>
  restoreFromHash(): Promise<void>
  updateHash(): void
  viewTitle: string
  setAuthor(): void
  showToast(message: string, duration?: number): void
  selectFolder(): Promise<void>
  loadSiteData(): Promise<void>
  ensureInitialData(): Promise<void>
  createPage(): void
  confirmCreatePage(): void
  showPageCreator: boolean
  editingPageId: string
  editingPageTitle: string
  loadPageList(): Promise<void>
  // ページ設定
  pagesConfig: { hasBody?: boolean; fieldGroupIds?: string[] }
  showPagesConfigEditor: boolean
  editingPagesConfig: { hasBody?: boolean; fieldGroupIds?: string[] } | null
  openPagesConfigEditor(): void
  savePagesConfig(): Promise<void>
  openPage(page: ContentData): Promise<void>
  openContentType(type: ContentType): Promise<void>
  openContent(item: ContentData): Promise<void>
  createContent(): void
  initEditor(bodyData: string | EditorData): void
  getEditorHtml(): Promise<string>
  handleImageUpload(event: Event, fieldKey: string): Promise<void>
  handleFileUpload(event: Event, fieldKey: string): Promise<void>
  handleFaviconUpload(event: Event): Promise<void>
  removeFavicon(): Promise<void>
  savePage(opts?: { silent?: boolean }): Promise<void>
  saveSiteConfig(): Promise<void>
  showRevisions(): Promise<void>
  selectRevision(rev: RevisionEntry): Promise<void>
  restoreRevision(): Promise<void>
  deleteContent(): Promise<void>
  deletePage(): Promise<void>
  showPreview(): Promise<void>
  closePanel(): void
  exportSite(): Promise<void>
  switchLang(lang: string): Promise<void>
  copyFromLang(sourceLang: string): Promise<void>
  getTranslationStatus(): Promise<Array<{ code: string; flag: string; status: string }>>
  refreshTranslationStatus(): Promise<void>
  langStatusIconSvg(ts: { code: string; status: string }): string
  availableParentPages(): ContentData[]
  pagePathPreview(): string
  pagesTree(): Array<ContentData & { depth: number }>
  availableCategories: Array<{ id: string; label: string }>
  availableTags: Array<{ id: string; label: string }>
  // カスタムモーダル
  modalVisible: boolean
  modalTitle: string
  modalMessage: string
  modalInput: string
  modalShowInput: boolean
  modalResolve: ((value: string | boolean | null) => void) | null
  showConfirm(message: string): Promise<boolean>
  showPrompt(title: string, defaultValue?: string): Promise<string | null>
  modalOk(): void
  modalCancel(): void
  // メニュー管理
  menuData: { menus: any[] }
  currentMenuId: string
  currentMenu: any
  loadMenus(): Promise<void>
  saveMenus(): Promise<void>
  addMenu(): Promise<void>
  deleteMenu(): Promise<void>
  selectMenu(id: string): void
  addMenuItem(type: string, label?: string, url?: string, object?: string): void
  removeMenuItem(idx: number): Promise<void>
  moveMenuItem(idx: number, dir: number): void
  setItemParent(idx: number, parentId: string): void
  // コンテンツタイプ管理
  showTypeEditor: boolean
  editingType: ContentType | null
  openTypeEditor(type?: ContentType): void
  saveType(): Promise<void>
  deleteType(): Promise<void>
  // フィールドグループ管理
  fieldGroups: FieldGroup[]
  currentFieldGroup: FieldGroup | null
  loadFieldGroupEditor(): Promise<void>
  openFieldGroup(group: FieldGroup): void
  createFieldGroup(): void
  addFieldToGroup(): void
  removeFieldFromGroup(idx: number): void
  saveFieldGroup(): Promise<void>
  deleteFieldGroup(): Promise<void>
  resolveFields(fieldGroupIds?: string[], fallbackFields?: FieldDefinition[]): FieldDefinition[]
  getFieldTemplateCode(type?: ContentType): string
  // タクソノミー管理
  showTaxonomyEditor: boolean
  taxonomyData: {
    categories: Array<{ id: string; label: string }>
    tags: Array<{ id: string; label: string }>
  }
  loadTaxonomies(): Promise<void>
  loadTaxonomy(type: 'categories' | 'tags'): Promise<void>
  saveTaxonomies(): Promise<void>
  currentTaxonomyType: 'categories' | 'tags'
  // 言語設定
  showLangEditor: boolean
  langEditorData: Languages
  loadLangEditor(): void
  saveLangConfig(): Promise<void>
  addLangLocale(): void
  removeLangLocale(idx: number): void
  translationStatuses: Array<{ code: string; flag: string; status: string }>
  // テンプレートエディタ
  templateFiles: Array<{ name: string; path: string; isComponent: boolean }>
  currentTemplateFile: string
  templateCode: string
  loadTemplateEditor(): Promise<void>
  openTemplateFile(path: string): Promise<void>
  saveTemplateFile(): Promise<void>
}

Alpine.data('cms', () => {
  const component: CmsComponent & ThisType<CmsComponent> = {
    // 状態管理
    authorName: localStorage.getItem(STORAGE_AUTHOR_KEY) || '',
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

    // カスタムモーダル
    modalVisible: false,
    modalTitle: '',
    modalMessage: '',
    modalInput: '',
    modalShowInput: false,
    modalResolve: null as ((value: string | boolean | null) => void) | null,

    // フィールドグループ管理
    fieldGroups: [] as FieldGroup[],
    currentFieldGroup: null as FieldGroup | null,

    // ページ設定
    pagesConfig: { hasBody: true, fieldGroupIds: [] } as {
      hasBody?: boolean
      fieldGroupIds?: string[]
    },
    showPagesConfigEditor: false,
    editingPagesConfig: null as { hasBody?: boolean; fieldGroupIds?: string[] } | null,

    // メニュー管理
    menuData: { menus: [] } as any,
    currentMenuId: '',
    currentMenu: null as any,

    // ページ作成
    showPageCreator: false,
    editingPageId: '',
    editingPageTitle: '',

    // コンテンツタイプ管理
    showTypeEditor: false,
    editingType: null,

    // タクソノミー管理
    showTaxonomyEditor: false,
    currentTaxonomyType: 'categories' as 'categories' | 'tags',
    taxonomyData: {
      categories: [] as Array<{ id: string; label: string }>,
      tags: [] as Array<{ id: string; label: string }>,
    },
    availableCategories: [] as Array<{ id: string; label: string }>,
    availableTags: [] as Array<{ id: string; label: string }>,

    // 言語設定
    showLangEditor: false,
    langEditorData: { default: 'ja', locales: [] },

    // テンプレートエディタ
    templateFiles: [] as Array<{ name: string; path: string; isComponent: boolean }>,
    currentTemplateFile: '',
    templateCode: '',

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

    // 自動保存・離脱警告
    isDirty: false,
    suppressDirty: false,
    autoSaving: false,
    autoSaveTimer: null,
    lastAutoSavedAt: null,

    // ファビコンプレビュー用 Blob URL
    faviconBlobUrl: '',

    // テーマ（light / dark / system）
    themeMode: (localStorage.getItem(STORAGE_THEME_KEY) as ThemeMode) || 'system',

    // FS / エンジン
    fs: null,
    exporter: null,
    diffEngine: null,
    revisionMgr: null,

    // Alpine runtime placeholders
    $nextTick(_fn: () => void) {},
    $watch(_expression: string, _callback: (value: unknown) => void) {},

    /** Alpine init — ページ読み込み時に前回のフォルダを自動復元 */
    async init() {
      // テーマ適用（localStorage に保存されたモード、または prefers-color-scheme）
      applyTheme(this.themeMode)
      // system モード時はOSのテーマ変更に追随
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      mql.addEventListener('change', () => {
        if (this.themeMode === 'system') applyTheme('system')
      })

      // 離脱警告: 未保存変更がある場合は確認ダイアログを出す
      window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
        if (this.isDirty) {
          e.preventDefault()
          e.returnValue = ''
        }
      })

      // editData の変更を監視して dirty フラグを立てる
      this.$watch('editData', () => {
        if (this.suppressDirty) return
        if (this.view !== 'page-edit' && this.view !== 'content-edit') return
        this.markDirty()
      })

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

    /** 未保存変更をマーク・自動保存タイマーを起動 */
    markDirty() {
      this.isDirty = true
      this.scheduleAutoSave()
    },

    /** dirty 状態をクリア */
    resetDirty() {
      this.isDirty = false
      if (this.autoSaveTimer !== null) {
        clearTimeout(this.autoSaveTimer)
        this.autoSaveTimer = null
      }
    },

    /** 自動保存をデバウンス予約 */
    scheduleAutoSave() {
      if (this.autoSaveTimer !== null) {
        clearTimeout(this.autoSaveTimer)
      }
      this.autoSaveTimer = window.setTimeout(() => {
        this.autoSaveTimer = null
        void this.autoSave()
      }, AUTOSAVE_DEBOUNCE_MS)
    },

    /** 自動保存本体（タイトル未入力・書き出し中・編集画面以外ではスキップ） */
    async autoSave() {
      if (this.autoSaving || this.exporting) return
      if (this.view !== 'page-edit' && this.view !== 'content-edit') return
      if (!this.editData.title?.trim()) return
      const currentPageId = this.currentPage?.id || this.editData.id
      if (!currentPageId) return
      this.autoSaving = true
      try {
        await this.savePage({ silent: true })
        this.lastAutoSavedAt = Date.now()
      } catch (e) {
        console.error('自動保存エラー:', e)
      } finally {
        this.autoSaving = false
      }
    },

    /** URLハッシュを現在のビュー状態で更新 */
    updateHash() {
      let hash = ''
      if (this.view === 'page-list') {
        hash = '#/pages'
      } else if (this.view === 'page-edit' && this.currentPage) {
        hash = `#/pages/${this.currentPage.id}`
      } else if (this.view === 'content-list' && this.currentType) {
        hash = `#/content/${this.currentType.id}`
      } else if (this.view === 'content-edit' && this.currentType && this.currentPage) {
        hash = `#/content/${this.currentType.id}/${this.currentPage.id}`
      } else if (this.view === 'settings') {
        hash = '#/settings'
      } else if (this.view === 'menus') {
        hash = '#/menus'
      } else if (this.view === 'templates') {
        hash = '#/templates'
      } else if (this.view === 'field-groups') {
        hash = '#/field-groups'
      } else if (this.view === 'taxonomy-categories') {
        hash = '#/categories'
      } else if (this.view === 'taxonomy-tags') {
        hash = '#/tags'
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
      } else if (parts[0] === 'templates') {
        await this.loadTemplateEditor()
      } else if (parts[0] === 'field-groups') {
        await this.loadFieldGroupEditor()
      } else if (parts[0] === 'categories') {
        await this.loadTaxonomy('categories')
      } else if (parts[0] === 'tags') {
        await this.loadTaxonomy('tags')
      } else if (parts[0] === 'menus') {
        await this.loadMenus()
      } else if (parts[0] === 'pages' && parts[1]) {
        const page = this.pages.find((p) => p.id === parts[1])
        if (page) await this.openPage(page)
      } else if (parts[0] === 'pages') {
        await this.loadPageList()
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
      if (this.view === 'page-list') return 'ページ'
      if (this.view === 'settings') return 'サイト設定'
      if (this.view === 'templates') return 'テンプレート'
      if (this.view === 'field-groups') return 'フィールド'
      if (this.view === 'taxonomy-categories') return 'カテゴリ'
      if (this.view === 'taxonomy-tags') return 'タグ'
      if (this.view === 'export-result') return '書き出し 完了'
      return APP_NAME
    },

    setAuthor() {
      const name = this.authorInput.trim()
      if (!name) return
      this.authorName = name
      localStorage.setItem(STORAGE_AUTHOR_KEY, name)
    },

    setThemeMode(mode: ThemeMode) {
      this.themeMode = mode
      localStorage.setItem(STORAGE_THEME_KEY, mode)
      applyTheme(mode)
    },

    showToast(message: string, duration = TOAST_DURATION) {
      this.toast = message
      setTimeout(() => {
        this.toast = null
      }, duration)
    },

    showConfirm(message: string): Promise<boolean> {
      return new Promise((resolve) => {
        this.modalTitle = '確認'
        this.modalMessage = message
        this.modalShowInput = false
        this.modalInput = ''
        this.modalResolve = resolve as any
        this.modalVisible = true
      })
    },

    showPrompt(title: string, defaultValue = ''): Promise<string | null> {
      return new Promise((resolve) => {
        this.modalTitle = title
        this.modalMessage = ''
        this.modalShowInput = true
        this.modalInput = defaultValue
        this.modalResolve = resolve as any
        this.modalVisible = true
      })
    },

    modalOk() {
      this.modalVisible = false
      if (this.modalResolve) {
        this.modalResolve(this.modalShowInput ? this.modalInput : true)
        this.modalResolve = null
      }
    },

    modalCancel() {
      this.modalVisible = false
      if (this.modalResolve) {
        this.modalResolve(this.modalShowInput ? null : false)
        this.modalResolve = null
      }
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

      this.siteConfig = (await this.fs.readJson<SiteConfig>(PATH_SITE_CONFIG)) || {
        name: '',
        url: '',
        description: '',
        services: {},
        theme: {},
      }
      // 管理画面のブラウザタブと設定プレビュー用にファビコン Blob URL を生成
      this.faviconBlobUrl = await loadFaviconBlobUrl(this.fs, this.siteConfig.favicon)
      applyFaviconLink(this.faviconBlobUrl)
      this.languages = (await this.fs.readJson<Languages>(PATH_LANGUAGES)) || this.languages
      this.currentLang = this.languages.default || 'ja'
      this.contentTypes = await this.fs.readContentTypes()
      this.fieldGroups = await this.fs.readFieldGroups()
      this.pagesConfig = (await this.fs.readJson<{ hasBody?: boolean; fieldGroupIds?: string[] }>(
        PATH_PAGES_CONFIG,
      )) || { hasBody: true, fieldGroupIds: [] }
      this.pages = await this.fs.readPages(this.currentLang)
      // カテゴリ・タグ読み込み
      const cats = await this.fs.readJson<{ items: Array<{ id: string; label: string }> }>(
        PATH_TAXONOMIES_CATEGORIES,
      )
      const tags = await this.fs.readJson<{ items: Array<{ id: string; label: string }> }>(
        PATH_TAXONOMIES_TAGS,
      )
      this.availableCategories = cats?.items || []
      this.availableTags = tags?.items || []
    },

    /** 初回起動時に必要なフォルダ・ファイルを自動作成 */
    async ensureInitialData() {
      if (!this.fs) return

      // site.json がなければ初期データ一式を作成
      const existing = await this.fs.readJson(PATH_SITE_CONFIG)
      if (existing) return

      // site.json
      await this.fs.writeJson(PATH_SITE_CONFIG, {
        name: 'マイサイト',
        url: '',
        description: '',
        nav: [
          { label: 'ホーム', url: '/' },
          { label: '会社概要', url: '/about/' },
        ],
      })

      // languages.json
      await this.fs.writeJson(PATH_LANGUAGES, {
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

    createPage() {
      this.editingPageId = ''
      this.editingPageTitle = ''
      this.showPageCreator = true
    },

    confirmCreatePage() {
      const slug = (this.editingPageId || this.editingPageTitle)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
      if (!slug) return
      this.showPageCreator = false
      const page: ContentData = {
        id: slug,
        title: this.editingPageTitle || slug,
        status: 'draft',
        body: '',
        _meta: {
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          author: this.authorName,
        },
      }
      this.suppressDirty = true
      this.currentPage = page
      this.currentType = null
      this.currentFields = this.resolveFields(this.pagesConfig?.fieldGroupIds, [])
      this.showRevisionPanel = false
      this.showPreviewPanel = false
      this.view = 'page-edit'
      this.editData = { ...page }
      if (this.pagesConfig?.hasBody !== false) {
        this.initEditor('')
      }
      this.updateHash()
      this.$nextTick(() => {
        this.resetDirty()
        this.suppressDirty = false
      })
    },

    async loadPageList() {
      if (!this.fs) return
      this.pages = await this.fs.readPages(this.currentLang)
      this.currentPage = null
      this.currentType = null
      this.view = 'page-list'
      this.updateHash()
    },

    openPagesConfigEditor() {
      this.editingPagesConfig = JSON.parse(JSON.stringify(this.pagesConfig))
      if (!this.editingPagesConfig!.fieldGroupIds) this.editingPagesConfig!.fieldGroupIds = []
      this.showPagesConfigEditor = true
    },

    async savePagesConfig() {
      if (!this.fs || !this.editingPagesConfig) return
      await this.fs.writeJson(PATH_PAGES_CONFIG, this.editingPagesConfig)
      this.pagesConfig = JSON.parse(JSON.stringify(this.editingPagesConfig))
      this.showPagesConfigEditor = false
      this.editingPagesConfig = null
      this.showToast('ページ設定を保存しました')
    },

    async openPage(page: ContentData) {
      this.suppressDirty = true
      this.currentPage = page
      this.currentType = null
      this.currentFields = this.resolveFields(this.pagesConfig?.fieldGroupIds, [])
      this.showRevisionPanel = false
      this.showPreviewPanel = false
      this.view = 'page-edit'
      this.editData = { slug: '', ...page }
      if (this.pagesConfig?.hasBody !== false) {
        this.initEditor((page as any)._editorJson || page.body || '')
      }
      this.updateHash()
      this.refreshTranslationStatus()
      this.$nextTick(() => {
        this.resetDirty()
        this.suppressDirty = false
      })
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
      this.suppressDirty = true
      this.currentPage = item
      this.currentFields = this.resolveFields(
        this.currentType?.fieldGroupIds,
        this.currentType?.fields,
      )
      this.showRevisionPanel = false
      this.showPreviewPanel = false
      this.view = 'content-edit'
      this.editData = { slug: '', category: '', tags: [], ...item }
      // Alpine template x-if の入れ子展開を待つ
      setTimeout(() => {
        const hasBody =
          this.currentType?.hasBody ||
          this.currentFields.some((f) => f.type === 'richtext' && f.key === 'body')
        if (hasBody) {
          this.initEditor((item as any)._editorJson || item.body || '')
        }
        this.resetDirty()
        this.suppressDirty = false
      }, 100)
      this.updateHash()
      this.refreshTranslationStatus()
    },

    createContent() {
      const now = new Date()
      const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
      const item: ContentData = {
        id,
        title: '',
        slug: '',
        status: 'draft',
        category: '',
        tags: [],
        publishedAt: now.toISOString().split('T')[0],
        body: '',
        _meta: {
          createdAt: now.toISOString().split('T')[0],
          updatedAt: now.toISOString().split('T')[0],
          author: this.authorName,
        },
      }
      this.suppressDirty = true
      this.currentPage = item
      this.currentFields = this.resolveFields(
        this.currentType?.fieldGroupIds,
        this.currentType?.fields,
      )
      this.editData = { ...item }
      this.view = 'content-edit'
      setTimeout(() => {
        const hasBody =
          this.currentType?.hasBody ||
          this.currentFields.some((f) => f.type === 'richtext' && f.key === 'body')
        if (hasBody) {
          this.initEditor('')
        }
        this.resetDirty()
        this.suppressDirty = false
      }, 100)
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
        // 初期化直後の onChange（初期データ流し込み由来）は無視するため短時間だけ suppress
        this.suppressDirty = true
        this.editor = createEditor('editorjs', data, this.fs, () => {
          if (this.suppressDirty) return
          this.markDirty()
        })
        window.setTimeout(() => {
          this.suppressDirty = false
        }, 200)
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
        // Data URLでプレビュー表示、実パスは_imagePathsに保存
        this.editData[fieldKey] = result.blobUrl || `/${result.path}`
        this.editData._imagePaths = {
          ...((this.editData._imagePaths as Record<string, string>) || {}),
          [fieldKey]: `/${result.path}`,
        }
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
        const path = `${PATH_ASSETS_FILES}/${file.name}`
        await this.fs.writeBlob(path, new Blob([buffer]))
        this.editData[fieldKey] = `/${path}`
        this.showToast(`${file.name} をアップロードしました`)
      } catch (e) {
        console.error('ファイルアップロードエラー:', e)
        this.showToast('ファイルのアップロードに失敗しました')
      }
    },

    /** ファビコンアップロード: assets/files/favicon.<ext> に保存し、siteConfig.favicon にパスを記録 */
    async handleFaviconUpload(event: Event) {
      const input = event.target as HTMLInputElement
      const file = input.files?.[0]
      if (!file || !this.fs) return
      // 拡張子判定（MIMEタイプ優先、フォールバックでファイル名）
      const mimeExtMap: Record<string, string> = {
        'image/x-icon': 'ico',
        'image/vnd.microsoft.icon': 'ico',
        'image/png': 'png',
        'image/svg+xml': 'svg',
        'image/webp': 'webp',
      }
      let ext = mimeExtMap[file.type]
      if (!ext) {
        const match = file.name.match(/\.(ico|png|svg|webp)$/i)
        ext = match ? match[1].toLowerCase() : ''
      }
      if (!ext) {
        this.showToast('ico / png / svg / webp 形式のみアップロードできます', 5000)
        input.value = ''
        return
      }
      try {
        // 古い拡張子のファビコンが残っていたら削除（拡張子切替時）
        const filesDir = await this.fs.getDir(PATH_ASSETS_FILES)
        if (filesDir) {
          for (const oldExt of ['ico', 'png', 'svg', 'webp']) {
            if (oldExt === ext) continue
            try {
              await filesDir.removeEntry(`favicon.${oldExt}`)
            } catch {
              /* skip */
            }
          }
        }
        const buffer = await file.arrayBuffer()
        const path = `${PATH_ASSETS_FILES}/favicon.${ext}`
        await this.fs.writeBlob(path, new Blob([buffer]))
        this.siteConfig.favicon = `/${path}`
        await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
        this.faviconBlobUrl = await loadFaviconBlobUrl(this.fs, this.siteConfig.favicon)
        applyFaviconLink(this.faviconBlobUrl)
        this.showToast('ファビコンをアップロードしました')
      } catch (e) {
        console.error('ファビコンアップロードエラー:', e)
        this.showToast('ファビコンの処理に失敗しました')
      } finally {
        input.value = ''
      }
    },

    /** ファビコン削除 */
    async removeFavicon() {
      if (!this.fs) return
      if (!(await this.showConfirm('ファビコンを削除しますか？'))) return
      const filesDir = await this.fs.getDir(PATH_ASSETS_FILES)
      if (filesDir) {
        for (const ext of ['ico', 'png', 'svg', 'webp']) {
          try {
            await filesDir.removeEntry(`favicon.${ext}`)
          } catch {
            /* skip */
          }
        }
      }
      delete (this.siteConfig as any).favicon
      await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
      clearFaviconBlobUrl()
      this.faviconBlobUrl = ''
      applyFaviconLink('')
      this.showToast('ファビコンを削除しました')
    },

    // --- 保存（リビジョン自動作成付き） ---

    async savePage(opts: { silent?: boolean } = {}) {
      if (!this.fs) return
      const silent = opts.silent === true
      // Editor.jsの内容を先に取得（バリデーション前に必要）
      if (this.editor) {
        this.editData.body = await this.getEditorHtml()
      }
      // 必須フィールドバリデーション
      if (!this.editData.title?.trim()) {
        if (!silent) this.showToast('タイトルを入力してください')
        return
      }
      if (this.currentType) {
        const missing = this.currentType.fields
          .filter((f) => f.required && f.key !== 'title')
          .filter((f) => {
            const val = (this.editData as any)[f.key]
            return val === undefined || val === null || val === ''
          })
        if (missing.length > 0) {
          if (!silent) {
            this.showToast(
              `必須フィールドを入力してください: ${missing.map((f) => f.label).join(', ')}`,
            )
          }
          return
        }
      }
      this.editData._meta = {
        ...this.editData._meta,
        updatedAt: new Date().toISOString().split('T')[0],
        author: this.authorName,
      }

      // IDはフォルダ名で固定（スラッグ変更で複製されないように元のIDを使う）
      const pageId = this.currentPage?.id || this.editData.id || ''
      const typePath = this.currentType ? this.currentType.id : 'pages'

      if (this.currentType) {
        await this.fs.saveContent(this.currentType.id, pageId, this.currentLang, this.editData)
        // 自動保存中はリストを再読込すると現在の編集 editData を差し替えてしまうので抑制
        if (!silent) {
          this.contentItems = await this.fs.readContentList(this.currentType.id, this.currentLang)
        }
      } else {
        await this.fs.savePage(pageId, this.currentLang, this.editData)
        if (!silent) {
          this.pages = await this.fs.readPages(this.currentLang)
        }
      }

      if (this.revisionMgr) {
        await this.revisionMgr.save(typePath, pageId, this.currentLang, this.editData)
      }

      this.resetDirty()
      if (!silent) this.showToast('保存しました')
    },

    async saveSiteConfig() {
      if (!this.fs) return
      await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
      this.showToast('サイト設定を保存しました')
    },

    // --- 削除 ---

    async deleteContent() {
      if (!this.fs || !this.currentType || !this.currentPage) return
      const title = this.currentPage.title || this.currentPage.id
      if (!(await this.showConfirm(`「${title}」を削除しますか？`))) return
      const dir = await this.fs.getDir(`content/${this.currentType.id}/${this.currentPage.id}`)
      if (dir) {
        // ディレクトリ内の全ファイルを削除
        const parentDir = await this.fs.getDir(`content/${this.currentType.id}`)
        if (parentDir) {
          try {
            await parentDir.removeEntry(this.currentPage.id, { recursive: true })
          } catch {
            /* skip */
          }
        }
      }
      this.contentItems = await this.fs.readContentList(this.currentType.id, this.currentLang)
      this.currentPage = null
      this.view = 'content-list'
      this.showToast('削除しました')
    },

    async deletePage() {
      if (!this.fs || !this.currentPage) return
      const title = this.currentPage.title || this.currentPage.id
      if (!(await this.showConfirm(`「${title}」を削除しますか？`))) return
      const parentDir = await this.fs.getDir('content/pages')
      if (parentDir) {
        try {
          await parentDir.removeEntry(this.currentPage.id, { recursive: true })
        } catch {
          /* skip */
        }
      }
      this.pages = await this.fs.readPages(this.currentLang)
      this.currentPage = null
      this.view = 'welcome'
      this.showToast('削除しました')
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

    // --- 多言語 ---

    /** 言語切替（現在の編集を保存してから切替） */
    async switchLang(lang: string) {
      if (!this.fs || lang === this.currentLang) return

      // 現在の編集内容を自動保存（dirty 時のみ）
      if (
        this.isDirty &&
        this.editor &&
        (this.view === 'page-edit' || this.view === 'content-edit')
      ) {
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
          this.suppressDirty = true
          this.editData = { id: this.currentPage.id, title: '', body: '', status: 'draft' }
          this.initEditor('')
          this.$nextTick(() => {
            this.resetDirty()
            this.suppressDirty = false
          })
        }
      } else if (this.currentPage && this.view === 'content-edit' && this.currentType) {
        const item = this.contentItems.find((i) => i.id === this.currentPage?.id)
        if (item) {
          await this.openContent(item)
        } else {
          this.suppressDirty = true
          this.editData = { id: this.currentPage.id, title: '', body: '', status: 'draft' }
          this.$nextTick(() => {
            this.resetDirty()
            this.suppressDirty = false
          })
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

      this.suppressDirty = true
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
      this.$nextTick(() => {
        this.suppressDirty = false
        this.markDirty()
      })
      this.showToast(`${sourceLang} の内容をコピーしました`)
    },

    /** 翻訳ステータスを取得・更新
     *  missing:    その言語のファイル自体が無い
     *  translated: 公開済み（status === 'published'）
     *  draft:      ファイルはあるが公開されていない
     */
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

        let status: 'missing' | 'translated' | 'draft' = 'missing'
        if (data) {
          status = data.status === 'published' ? 'translated' : 'draft'
        }

        statuses.push({ code: locale.code, flag: locale.flag, status })
      }
      return statuses
    },

    async refreshTranslationStatus() {
      this.translationStatuses = await this.getTranslationStatus()
    },

    /** 翻訳ステータス用アイコンを static SVG 文字列で返す（Lucide 変換を介さないため Alpine 再レンダリングで増殖しない） */
    langStatusIconSvg(ts: { code: string; status: string }): string {
      const status = ts.code === this.currentLang ? 'current' : ts.status
      return LANG_STATUS_ICONS[status] || ''
    },

    /** 親ページとして選択可能なページ一覧を返す（自身と自身の子孫を除外して循環参照を防ぐ） */
    availableParentPages(): ContentData[] {
      const currentId = this.currentPage?.id || ''
      if (!currentId) return this.pages.slice()
      // currentId の子孫 id 集合を計算（BFS）
      const descendants = new Set<string>()
      const queue: string[] = [currentId]
      while (queue.length) {
        const id = queue.shift() as string
        for (const p of this.pages) {
          if ((p.parent || '') === id && !descendants.has(p.id)) {
            descendants.add(p.id)
            queue.push(p.id)
          }
        }
      }
      return this.pages.filter((p) => p.id !== currentId && !descendants.has(p.id))
    },

    /** ページ一覧を親子ツリー構造の順序（DFS）で depth 付きで返す */
    pagesTree(): Array<ContentData & { depth: number }> {
      const byParent = new Map<string, ContentData[]>()
      for (const p of this.pages) {
        const parent = (p.parent as string | undefined) || ''
        if (!byParent.has(parent)) byParent.set(parent, [])
        byParent.get(parent)!.push(p)
      }
      // 兄弟は menuOrder → タイトルで並び替え
      for (const list of byParent.values()) {
        list.sort((a, b) => {
          const ao = a.menuOrder ?? 1e9
          const bo = b.menuOrder ?? 1e9
          if (ao !== bo) return ao - bo
          return (a.title || a.id).localeCompare(b.title || b.id)
        })
      }
      const result: Array<ContentData & { depth: number }> = []
      const visit = (parentId: string, depth: number): void => {
        const children = byParent.get(parentId) || []
        for (const child of children) {
          result.push({ ...child, depth })
          visit(child.id, depth + 1)
        }
      }
      visit('', 0)
      // 親が存在しない孤立ページも拾う（親IDが不正な場合）
      const collected = new Set(result.map((p) => p.id))
      for (const p of this.pages) {
        if (!collected.has(p.id)) {
          result.push({ ...p, depth: 0 })
        }
      }
      return result
    },

    /** 編集中ページの最終的な URL パスを親チェーンから計算してプレビュー表示 */
    pagePathPreview(): string {
      const slugOf = (p: ContentData): string => p.slug || p.id
      const currentSlug = this.editData.slug || this.editData.id || ''
      if (!currentSlug || currentSlug === 'index') return '/'
      const chain: string[] = []
      let parentId = (this.editData.parent as string | undefined) || ''
      const visited = new Set<string>()
      while (parentId && !visited.has(parentId)) {
        visited.add(parentId)
        const parent = this.pages.find((p) => p.id === parentId)
        if (!parent) break
        chain.unshift(slugOf(parent))
        parentId = (parent.parent as string | undefined) || ''
      }
      chain.push(currentSlug)
      return '/' + chain.join('/') + '/'
    },

    // --- コンテンツタイプ管理 ---

    openTypeEditor(type?: ContentType) {
      const raw = type
        ? JSON.parse(JSON.stringify(type))
        : {
            id: '',
            label: '',
            slug: '',
            pagination: 10,
            fieldGroupIds: [] as string[],
          }
      if (!raw.fieldGroupIds) raw.fieldGroupIds = []
      this.editingType = raw
      this.showTypeEditor = true
    },

    addFieldToType() {
      if (!this.editingType) return
      this.editingType.fields.push({
        key: '',
        label: '',
        type: 'text',
        _expanded: false,
        showIf_field: '',
        showIf_value: '',
        options: [],
      } as any)
    },

    removeFieldFromType(idx: number) {
      if (!this.editingType) return
      ;(this.editingType.fields || []).splice(idx, 1)
    },

    // --- フィールドグループ管理 ---

    /** フィールドグループIDからフィールド定義を解決 */
    resolveFields(fieldGroupIds?: string[], fallbackFields?: FieldDefinition[]): FieldDefinition[] {
      if (fieldGroupIds?.length) {
        return fieldGroupIds.flatMap(
          (id) => this.fieldGroups.find((g) => g.id === id)?.fields || [],
        )
      }
      return fallbackFields || []
    },

    async loadFieldGroupEditor() {
      if (!this.fs) return
      this.fieldGroups = await this.fs.readFieldGroups()
      this.currentFieldGroup = null
      this.view = 'field-groups'
      this.updateHash()
    },

    openFieldGroup(group: FieldGroup) {
      this.currentFieldGroup = JSON.parse(JSON.stringify(group))
      // UI用プロパティ付与
      this.currentFieldGroup!.fields = this.currentFieldGroup!.fields.map((f: any) => ({
        ...f,
        _expanded: false,
        showIf_field: f.showIf?.field || '',
        showIf_value:
          f.showIf?.value !== undefined && f.showIf?.value !== null ? String(f.showIf.value) : '',
        options: f.options || [],
      }))
    },

    createFieldGroup() {
      this.currentFieldGroup = {
        id: '',
        label: '',
        fields: [],
      }
    },

    addFieldToGroup() {
      if (!this.currentFieldGroup) return
      this.currentFieldGroup.fields.push({
        key: '',
        label: '',
        type: 'text',
        _expanded: false,
        showIf_field: '',
        showIf_value: '',
        options: [],
      } as any)
    },

    removeFieldFromGroup(idx: number) {
      if (!this.currentFieldGroup) return
      this.currentFieldGroup.fields.splice(idx, 1)
    },

    async saveFieldGroup() {
      if (!this.fs || !this.currentFieldGroup) return
      const g = this.currentFieldGroup
      if (!g.label.trim()) {
        this.showToast('ラベルを入力してください')
        return
      }
      if (!g.id) {
        g.id = g.label
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
      }
      // UI用プロパティを除去
      const cleanedFields = g.fields.map((f: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _expanded, showIf_field, showIf_value, showIf: _showIf, ...rest } = f
        const field: any = { ...rest }
        if (showIf_field?.trim()) {
          let val: unknown = showIf_value
          if (showIf_value === 'true') val = true
          else if (showIf_value === 'false') val = false
          field.showIf = { field: showIf_field.trim(), value: val }
        }
        if (!field.required) delete field.required
        if (!field.options || field.options.length === 0) delete field.options
        if (!field.subFields || field.subFields.length === 0) delete field.subFields
        return field
      })
      await this.fs.writeJson(`content/_fieldGroups/${g.id}.json`, {
        id: g.id,
        label: g.label,
        fields: cleanedFields,
      })
      this.fieldGroups = await this.fs.readFieldGroups()
      this.showToast(`${g.label} を保存しました`)
    },

    async deleteFieldGroup() {
      if (!this.currentFieldGroup?.id) return
      if (!(await this.showConfirm(`「${this.currentFieldGroup.label}」を削除しますか？`))) return
      const dir = await this.fs!.getDir('content/_fieldGroups')
      if (dir) {
        try {
          await dir.removeEntry(`${this.currentFieldGroup.id}.json`)
        } catch {
          /* skip */
        }
      }
      this.fieldGroups = await this.fs!.readFieldGroups()
      this.currentFieldGroup = null
      this.showToast('削除しました')
    },

    /** カスタムフィールドのテンプレートコードを生成 */
    getFieldTemplateCode(typeArg?: ContentType): string {
      const type = typeArg || this.editingType
      if (!type) return ''
      const lines: string[] = []

      // 一覧ページ用
      lines.push('{{!-- 一覧ページ (list.hbs) --}}')
      lines.push(`{{#each items}}`)
      lines.push(`<article>`)
      lines.push(`  <a href="{{url}}">`)
      lines.push(`    <h2>{{page.title}}</h2>`)
      for (const f of type.fields) {
        if (f.key === 'title' || f.key === 'body') continue
        if (f.type === 'image') {
          lines.push(`    {{#if page.${f.key}}}<img src="{{page.${f.key}}}" alt="">{{/if}}`)
        } else if (f.type === 'date' || f.type === 'datetime') {
          lines.push(`    <time>{{page.${f.key}}}</time>`)
        } else if (
          [
            'text',
            'textarea',
            'number',
            'url',
            'email',
            'year',
            'color',
            'select',
            'radio',
          ].includes(f.type)
        ) {
          lines.push(`    <span>{{page.${f.key}}}</span>`)
        }
      }
      lines.push(`  </a>`)
      lines.push(`</article>`)
      lines.push(`{{/each}}`)

      lines.push('')
      lines.push('{{!-- 詳細ページ (detail.hbs) --}}')
      lines.push(`<h1>{{page.title}}</h1>`)
      for (const f of type.fields) {
        if (f.key === 'title') continue
        if (f.key === 'body') {
          lines.push(`{{{page.body}}}`)
        } else if (f.type === 'image') {
          lines.push(
            `{{#if page.${f.key}}}<img src="{{page.${f.key}}}" alt="{{page.title}}">{{/if}}`,
          )
        } else if (f.type === 'imagelist') {
          lines.push(`{{#each page.${f.key}}}`)
          lines.push(`  <img src="{{this}}" alt="">`)
          lines.push(`{{/each}}`)
        } else if (f.type === 'file') {
          lines.push(`{{#if page.${f.key}}}<a href="{{page.${f.key}}}">ダウンロード</a>{{/if}}`)
        } else if (f.type === 'richtext') {
          lines.push(`{{{page.${f.key}}}}`)
        } else if (f.type === 'date' || f.type === 'datetime') {
          lines.push(`<time>{{page.${f.key}}}</time>`)
        } else if (f.type === 'daterange') {
          lines.push(`<span>{{page.${f.key}_from}} 〜 {{page.${f.key}_to}}</span>`)
        } else if (f.type === 'url') {
          lines.push(
            `{{#if page.${f.key}}}<a href="{{page.${f.key}}}">{{page.${f.key}}}</a>{{/if}}`,
          )
        } else if (f.type === 'multiselect') {
          lines.push(`{{#each page.${f.key}}}`)
          lines.push(`  <span>{{this}}</span>`)
          lines.push(`{{/each}}`)
        } else if (f.type === 'repeater') {
          lines.push(`{{#each page.${f.key}}}`)
          if ((f as any).subFields?.length) {
            for (const sf of (f as any).subFields) {
              if (sf.type === 'image') {
                lines.push(`  {{#if this.${sf.key}}}<img src="{{this.${sf.key}}}" alt="">{{/if}}`)
              } else {
                lines.push(`  <span>{{this.${sf.key}}}</span>`)
              }
            }
          } else {
            lines.push(`  <span>{{this}}</span>`)
          }
          lines.push(`{{/each}}`)
        } else if (f.type === 'checkbox' || f.type === 'toggle') {
          lines.push(`{{#if page.${f.key}}}<span>${f.label}: ON</span>{{/if}}`)
        } else if (f.type === 'hidden') {
          // skip
        } else {
          lines.push(`<span>{{page.${f.key}}}</span>`)
        }
      }
      return lines.join('\n')
    },

    async saveType() {
      if (!this.fs || !this.editingType) return
      const t = this.editingType
      if (!t.label.trim()) {
        this.showToast('ラベルを入力してください')
        return
      }
      if (!t.id) {
        t.id =
          t.slug ||
          t.label
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
      }
      if (!t.slug) t.slug = t.id
      // fieldGroupIds で保存（旧 fields は除去）
      const saveData: any = { ...t }
      delete saveData.fields
      if (!saveData.fieldGroupIds?.length) delete saveData.fieldGroupIds
      await this.fs.writeJson(`content/_types/${t.id}.json`, saveData)
      this.contentTypes = await this.fs.readContentTypes()
      this.showTypeEditor = false
      this.editingType = null
      this.showToast(`${t.label} を保存しました`)
    },

    async deleteType() {
      const typeId = this.currentType?.id || this.editingType?.id
      const typeLabel = this.currentType?.label || this.editingType?.label || typeId || '不明'
      if (!this.fs) return
      if (!(await this.showConfirm(`「${typeLabel}」を削除しますか？`))) return

      const dir = await this.fs.getDir('content/_types')
      if (dir && typeId) {
        try {
          await dir.removeEntry(`${typeId}.json`)
        } catch {
          /* skip */
        }
      }
      // IDが空のファイル(.json)も探して削除
      if (dir && !typeId) {
        try {
          await dir.removeEntry('.json')
        } catch {
          /* skip */
        }
      }
      this.contentTypes = await this.fs.readContentTypes()
      this.showTypeEditor = false
      this.editingType = null
      this.currentType = null
      this.view = 'welcome'
      this.showToast('削除しました')
    },

    // --- メニュー管理 ---

    async loadMenus() {
      if (!this.fs) return
      const data = await this.fs.readJson<any>(PATH_MENUS)
      this.menuData = data || { menus: [] }
      if (this.menuData.menus.length && !this.currentMenuId) {
        this.selectMenu(this.menuData.menus[0].id)
      }
      this.view = 'menus'
      this.updateHash()
    },

    selectMenu(id: string) {
      this.currentMenuId = id
      this.currentMenu = this.menuData.menus.find((m: any) => m.id === id) || null
    },

    async addMenu() {
      const name = await this.showPrompt('メニュー名')
      if (!name?.trim()) return
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      // 英数字がない場合（日本語名等）は連番IDを生成
      const existingIds = new Set(this.menuData.menus.map((m: any) => m.id))
      let id = slug
      if (!id) {
        let n = 1
        while (existingIds.has(`menu-${n}`)) n++
        id = `menu-${n}`
      }
      const menu = { id, name: name.trim(), items: [] }
      this.menuData.menus.push(menu)
      this.selectMenu(id)
    },

    async deleteMenu() {
      if (!this.currentMenu) return
      if (!(await this.showConfirm(`「${this.currentMenu.name}」を削除しますか？`))) return
      this.menuData.menus = this.menuData.menus.filter((m: any) => m.id !== this.currentMenuId)
      this.currentMenu = null
      this.currentMenuId = ''
      if (this.menuData.menus.length) this.selectMenu(this.menuData.menus[0].id)
    },

    addMenuItem(type: string, label?: string, url?: string, object?: string) {
      if (!this.currentMenu) return
      const id = String(Date.now())
      const itemLabel = label || '新規項目'
      this.currentMenu.items.push({
        id,
        label: itemLabel,
        type,
        url: url || '',
        object: object || '',
        target: '',
        parent: '',
        order: this.currentMenu.items.length,
      })
      this.showToast(`「${itemLabel}」を追加しました`)
    },

    async removeMenuItem(idx: number) {
      if (!this.currentMenu) return
      const removed = this.currentMenu.items[idx]
      if (!(await this.showConfirm(`「${removed.label || '項目'}」を削除しますか？`))) return
      // 子項目の親をクリア
      for (const item of this.currentMenu.items) {
        if (item.parent === removed.id) item.parent = removed.parent || ''
      }
      this.currentMenu.items.splice(idx, 1)
    },

    moveMenuItem(idx: number, dir: number) {
      if (!this.currentMenu) return
      const items = this.currentMenu.items
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= items.length) return
      const [moved] = items.splice(idx, 1)
      items.splice(newIdx, 0, moved)
    },

    setItemParent(idx: number, parentId: string) {
      if (!this.currentMenu) return
      this.currentMenu.items[idx].parent = parentId
    },

    async saveMenus() {
      if (!this.fs) return
      // orderを再計算
      for (const menu of this.menuData.menus) {
        menu.items.forEach((item: any, i: number) => {
          item.order = i
        })
      }
      await this.fs.writeJson(PATH_MENUS, this.menuData)
      this.showToast('メニューを保存しました')
    },

    // --- タクソノミー管理 ---

    async loadTaxonomies() {
      if (!this.fs) return
      const cats = await this.fs.readJson<{ items: Array<{ id: string; label: string }> }>(
        PATH_TAXONOMIES_CATEGORIES,
      )
      const tags = await this.fs.readJson<{ items: Array<{ id: string; label: string }> }>(
        PATH_TAXONOMIES_TAGS,
      )
      this.taxonomyData = {
        categories: cats?.items || [],
        tags: tags?.items || [],
      }
    },

    async loadTaxonomy(type: 'categories' | 'tags') {
      await this.loadTaxonomies()
      this.currentTaxonomyType = type
      this.view = `taxonomy-${type}`
      this.updateHash()
    },

    async saveTaxonomies() {
      if (!this.fs) return
      await this.fs.writeJson(PATH_TAXONOMIES_CATEGORIES, {
        id: 'categories',
        label: 'カテゴリ',
        items: this.taxonomyData.categories,
      })
      await this.fs.writeJson(PATH_TAXONOMIES_TAGS, {
        id: 'tags',
        label: 'タグ',
        items: this.taxonomyData.tags,
      })
      this.availableCategories = this.taxonomyData.categories
      this.availableTags = this.taxonomyData.tags
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
      await this.fs.writeJson(PATH_LANGUAGES, this.langEditorData)
      this.languages = JSON.parse(JSON.stringify(this.langEditorData))
      this.showLangEditor = false
      this.showToast('言語設定を保存しました')
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

  return component as any
})

Alpine.start()

/** 翻訳ステータスバッジ用の static SVG（Lucide のアイコンデータから抽出したパス） */
const LANG_STATUS_ICONS: Record<string, string> = {
  current:
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>',
  translated:
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  draft:
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  missing:
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
}

/** html[data-theme] 属性を適切に設定してテーマを反映 */
function applyTheme(mode: ThemeMode): void {
  const effective =
    mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode
  document.documentElement.setAttribute('data-theme', effective)
}

// Alpine 初期化前にフラッシュを避けるため、即座にテーマを適用する
;(function preApplyTheme() {
  const saved = (localStorage.getItem(STORAGE_THEME_KEY) as ThemeMode | null) || 'system'
  applyTheme(saved)
})()

/** ファビコンを Blob URL として読み込み、管理画面タブと設定プレビューの両方を更新 */
let currentFaviconBlobUrl: string | null = null
async function loadFaviconBlobUrl(
  fs: FileSystem | null,
  faviconPath: string | undefined,
): Promise<string> {
  if (!fs || !faviconPath) return ''
  const normalized = faviconPath.replace(/^\//, '')
  const blob = await fs.readBlob(normalized)
  if (!blob) return ''
  if (currentFaviconBlobUrl) URL.revokeObjectURL(currentFaviconBlobUrl)
  currentFaviconBlobUrl = URL.createObjectURL(blob)
  return currentFaviconBlobUrl
}

function applyFaviconLink(blobUrl: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!blobUrl) {
    if (link) link.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = blobUrl
}

function clearFaviconBlobUrl(): void {
  if (currentFaviconBlobUrl) {
    URL.revokeObjectURL(currentFaviconBlobUrl)
    currentFaviconBlobUrl = null
  }
}

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
