/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CmsComponent } from './types.ts'
import { type SiteConfig, type Languages } from '../types.ts'
import { FileSystem } from '../fs.ts'
import { Exporter } from '../export.ts'
import { DiffEngine } from '../diff.ts'
import { RevisionManager } from '../revision.ts'
import { saveFolderHandle, restoreFolderHandle } from '../storage.ts'
import {
  STORAGE_AUTHOR_KEY,
  STORAGE_THEME_KEY,
  TOAST_DURATION,
  AUTOSAVE_DEBOUNCE_MS,
  PATH_SITE_CONFIG,
  PATH_LANGUAGES,
  PATH_TAXONOMIES_CATEGORIES,
  PATH_TAXONOMIES_TAGS,
  type ThemeMode,
} from '../constants.ts'
import {
  applyTheme,
  loadFaviconBlobUrl,
  applyFaviconLink,
  loadAssetBlobUrl,
  hasFile,
  hasDir,
} from './dom.ts'
import { TEMPLATE_DESCRIPTIONS } from './template-reference.ts'
import { runExtensionInit } from './extensions.ts'

export const coreMixin: Partial<CmsComponent> & ThisType<CmsComponent> = {
  /** テンプレート/コンポーネントの役割説明（ファイル名 → 説明） */
  templateDescription(name: string): string {
    return (this.templateDescriptions || TEMPLATE_DESCRIPTIONS)[name] || ''
  },

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

    // 拡張（Pro / プラグイン）の初期化。無料コアでは no-op
    await runExtensionInit(this)

    if (!this.authorName) return
    const handle = await restoreFolderHandle()
    if (!handle) return

    // 誤って content/ を選択していた場合は復元しない
    const isContentDir = (await hasFile(handle, 'site.json')) && !(await hasDir(handle, 'content'))
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
    } else if (this.view === 'site-info') {
      hash = '#/site-info'
    } else if (this.view === 'menus') {
      hash = '#/menus'
    } else if (this.view === 'templates') {
      hash = '#/templates'
    } else if (this.view === 'themes') {
      hash = '#/themes'
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

    if (parts[0] === 'home') {
      await this.openHomePage()
    } else if (parts[0] === 'settings') {
      this.view = 'settings'
    } else if (parts[0] === 'site-info') {
      this.view = 'site-info'
    } else if (parts[0] === 'templates') {
      await this.loadTemplateEditor()
    } else if (parts[0] === 'themes') {
      await this.loadThemesPage()
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
        this.showToast(this.t('toast.selectRootFolder'), 5000)
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
    // データ形式のバージョン確認・必要なら移行。
    // ※ ensureMissingTemplates より前に実行すること。旧 templates/ → themes/default/ への
    //   移行は「themes/ がまだ無い」ことを条件にユーザー編集を保全するため、先に themes/ を
    //   作ってしまう ensureMissingTemplates より前である必要がある。
    await this.checkVersionAndMigrate()
    // バンドル内のテンプレートで未作成のものがあれば補完（既存ファイルは上書きしない）
    await this.ensureMissingTemplates()

    this.siteConfig = (await this.fs.readJson<SiteConfig>(PATH_SITE_CONFIG)) || {
      name: '',
      url: '',
      description: '',
    }
    // 既定ブランド素材（ファビコン・ロゴ・OGP）を未設定項目だけ補完（初回のみ）
    await this.ensureDefaultBranding()
    // 管理画面のブラウザタブと設定プレビュー用にファビコン Blob URL を生成
    this.faviconBlobUrl = await loadFaviconBlobUrl(this.fs, this.siteConfig.favicon)
    applyFaviconLink(this.faviconBlobUrl)
    // ロゴ・OGPプレビュー用 Blob URL を生成
    this.logoBlobUrl = await loadAssetBlobUrl(this.fs, this.siteConfig.logo)
    this.ogImageBlobUrl = await loadAssetBlobUrl(this.fs, this.siteConfig.ogImage)
    this.languages = (await this.fs.readJson<Languages>(PATH_LANGUAGES)) || this.languages
    this.currentLang = this.languages.default || 'ja'
    // 管理画面UIの翻訳カタログを用意し、選択中UI言語のカタログを読み込む
    await this.ensureI18nFiles()
    await this.loadUiCatalog()
    this.contentTypes = await this.fs.readContentTypes()
    this.fieldGroups = await this.fs.readFieldGroups()
    // 旧: 投稿タイプ側の fieldGroupIds → 新: フィールドグループ側の表示条件 へ自動移行
    await this.migrateTypeFieldGroupsToLocations()
    // テーマ（アクティブ manifest と一覧）を読み込む（色/フォント選択肢・テーマ切替 UI 用）
    await this.loadActiveThemeManifest()
    await this.loadInstalledThemes()
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

  async saveSiteConfig() {
    if (!this.fs) return
    await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
    this.showToast(this.t('toast.siteConfigSaved'))
  },
}
