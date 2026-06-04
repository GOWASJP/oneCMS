/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CmsComponent } from './types.ts'
import { type SiteConfig, type Languages } from '../types.ts'
import { FileSystem } from '../fs.ts'
import { Exporter } from '../export.ts'
import { DiffEngine } from '../diff.ts'
import { RevisionManager } from '../revision.ts'
import { saveFolderHandle, restoreFolderHandle } from '../storage.ts'
import { INITIAL_TEMPLATES } from '../initial-templates.ts'
import {
  STORAGE_AUTHOR_KEY,
  STORAGE_THEME_KEY,
  TOAST_DURATION,
  AUTOSAVE_DEBOUNCE_MS,
  PATH_SITE_CONFIG,
  PATH_LANGUAGES,
  PATH_TAXONOMIES_CATEGORIES,
  PATH_TAXONOMIES_TAGS,
  PATH_ASSETS_FILES,
  SCHEMA_VERSION,
  type ThemeMode,
} from '../constants.ts'
import {
  applyTheme,
  loadFaviconBlobUrl,
  applyFaviconLink,
  clearFaviconBlobUrl,
  loadAssetBlobUrl,
  hasFile,
  hasDir,
} from './dom.ts'
import { TEMPLATE_DESCRIPTIONS } from './template-reference.ts'
import { readMeta, writeMeta, runMigrations, currentMeta } from '../migrations.ts'
import { runExtensionInit } from './extensions.ts'

/** アップロードファイルの拡張子を判定（MIME タイプ優先、フォールバックでファイル名）。
 *  jpeg は jpg に正規化する。判定できなければ空文字を返す。 */
function detectAssetExt(
  file: File,
  mimeExtMap: Record<string, string>,
  filenameRe: RegExp,
): string {
  const byMime = mimeExtMap[file.type]
  if (byMime) return byMime
  const match = file.name.match(filenameRe)
  return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : ''
}

/** assets/files/ 配下の旧アセット（baseName.<ext>）を削除する。
 *  keepExt を渡すとその拡張子は残す（拡張子切替時の掃除に使用）。 */
async function removeOldAssetFiles(
  fs: FileSystem,
  baseName: string,
  exts: string[],
  keepExt?: string,
): Promise<void> {
  const filesDir = await fs.getDir(PATH_ASSETS_FILES)
  if (!filesDir) return
  for (const ext of exts) {
    if (ext === keepExt) continue
    try {
      await filesDir.removeEntry(`${baseName}.${ext}`)
    } catch {
      /* 存在しなければ無視 */
    }
  }
}

const FAVICON_EXTS = ['ico', 'png', 'svg', 'webp']
const LOGO_EXTS = ['png', 'svg', 'webp', 'jpg']

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
    // 管理画面のブラウザタブと設定プレビュー用にファビコン Blob URL を生成
    this.faviconBlobUrl = await loadFaviconBlobUrl(this.fs, this.siteConfig.favicon)
    applyFaviconLink(this.faviconBlobUrl)
    // ロゴプレビュー用 Blob URL を生成
    this.logoBlobUrl = await loadAssetBlobUrl(this.fs, this.siteConfig.logo)
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

  /** 旧データ移行: 投稿タイプの fieldGroupIds を、各フィールドグループの表示条件
   *  （locations: { target:'contentType', value:<typeId> }）へ移し替え、type 側からは除去する。
   *  冪等。fieldGroupIds を持つタイプが無ければ何もしない。 */
  async migrateTypeFieldGroupsToLocations() {
    if (!this.fs) return
    const pending = this.contentTypes.filter((t) => (t.fieldGroupIds?.length ?? 0) > 0)
    if (!pending.length) return
    let groupsChanged = false
    for (const type of pending) {
      for (const gid of type.fieldGroupIds || []) {
        const g = this.fieldGroups.find((x) => x.id === gid)
        if (!g) continue
        if (!g.locations) g.locations = []
        if (!g.locations.some((l) => l.target === 'contentType' && l.value === type.id)) {
          g.locations.push({ target: 'contentType', value: type.id })
          await this.fs.writeJson(`content/_fieldGroups/${g.id}.json`, {
            id: g.id,
            label: g.label,
            fields: g.fields,
            locations: g.locations,
          })
          groupsChanged = true
        }
      }
      // type 側から fieldGroupIds を除去して書き戻す
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fieldGroupIds, ...rest } = type
      await this.fs.writeJson(`content/_types/${type.id}.json`, rest)
      delete (type as { fieldGroupIds?: string[] }).fieldGroupIds
    }
    if (groupsChanged) this.fieldGroups = await this.fs.readFieldGroups()
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
      frontPageId: 'index',
      themeId: 'default',
      timezone: 'Asia/Tokyo',
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
      hasDate: true,
      pagination: 10,
      fields: [
        { key: 'title', label: 'タイトル', type: 'text', required: true },
        { key: 'body', label: '本文', type: 'richtext' },
        { key: 'image', label: '画像', type: 'image' },
      ],
    })

    // 固定ページ: トップ（フロントページ。通常ページとして本文を編集する）
    await this.fs.writeJson('content/pages/index/ja.json', {
      title: 'ホーム',
      body: '<p>ようこそ。サイトの特徴やサービスをここで紹介します。</p>',
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

    // フィールドグループ: サンプル（製作者が自由に編集・追加・削除可能。投稿タイプに割当可能）
    await this.fs.writeJson('content/_fieldGroups/home-hero.json', {
      id: 'home-hero',
      label: 'ヒーロー',
      fields: [
        { key: 'heroHeading', label: '見出し', type: 'text' },
        { key: 'heroSubheading', label: 'サブ見出し', type: 'textarea' },
        { key: 'heroImage', label: '背景画像', type: 'image' },
      ],
    })
    await this.fs.writeJson('content/_fieldGroups/home-carousel.json', {
      id: 'home-carousel',
      label: 'カルーセル',
      fields: [
        {
          key: 'carousel',
          label: 'スライド',
          type: 'repeater',
          subFields: [
            { key: 'image', label: '画像', type: 'image' },
            { key: 'caption', label: 'キャプション', type: 'text' },
            { key: 'link', label: 'リンク先', type: 'url' },
          ],
        },
      ],
    })
    await this.fs.writeJson('content/_fieldGroups/home-featured-news.json', {
      id: 'home-featured-news',
      label: '注目のお知らせ',
      fields: [
        {
          key: 'featuredNews',
          label: '掲載するお知らせ',
          type: 'relation',
          relationType: 'news',
          relationMultiple: true,
        },
      ],
    })
    await this.fs.writeJson('content/_fieldGroups/home-banners.json', {
      id: 'home-banners',
      label: 'バナーエリア',
      fields: [
        {
          key: 'banners',
          label: 'バナー',
          type: 'repeater',
          subFields: [
            { key: 'image', label: '画像', type: 'image' },
            { key: 'alt', label: '代替テキスト', type: 'text' },
            { key: 'link', label: 'リンク先', type: 'url' },
          ],
        },
      ],
    })

    // 初期テンプレート一式を書き出し（INITIAL_TEMPLATES は templates/ 配下の実ファイルから
    // Vite の ?raw import で取り込んだもの）。製作者はインストール後に自由にカスタマイズ可能
    for (const [path, content] of Object.entries(INITIAL_TEMPLATES)) {
      await this.fs.writeText(path, content)
    }
  },

  /** バンドル内のテンプレートで、ユーザーフォルダに存在しないファイルだけ補完。
   *  既存ファイルは絶対に上書きしない。新しいテンプレートが ONE CMS に追加されたとき、
   *  既存プロジェクトにも自動で反映されるための仕組み。 */
  async ensureMissingTemplates() {
    if (!this.fs) return
    for (const [path, content] of Object.entries(INITIAL_TEMPLATES)) {
      const existing = await this.fs.readText(path)
      if (existing === null) {
        await this.fs.writeText(path, content)
      }
    }
  },

  /**
   * データ形式のバージョンを確認し、必要なら最新へ移行する。
   * - 旧版/未記録データ → 移行（破壊的変更がある場合は移行前にバックアップ）し、メタを更新
   * - データの方が新しい（ダウングレード）→ 移行せず警告を表示
   */
  async checkVersionAndMigrate() {
    if (!this.fs) return
    const meta = await readMeta(this.fs)
    const from = meta?.schemaVersion ?? 0
    try {
      const result = await runMigrations(this.fs, from)
      if (result.downgrade) {
        // データが本体より新しい。移行もメタ更新もせず、警告のみ。
        this.dataSchemaVersion = from
        this.schemaWarning =
          `このデータは新しいバージョン（データ形式 v${from}）で作成されています。` +
          `現在の本体は v${SCHEMA_VERSION} までの対応です。最新の cms.html をご利用ください。`
        this.showToast(this.t('toast.dataNewerWarning'), 6000)
        return
      }
      this.schemaWarning = null
      this.dataSchemaVersion = SCHEMA_VERSION
      this.lastBackupPath = result.backupPath
      // メタ情報を現行の本体情報で更新（本体バージョン・エディションの記録も兼ねる）
      await writeMeta(this.fs, currentMeta())
      if (result.applied.length > 0) {
        this.showToast(this.t('toast.migrated', { path: result.backupPath || '' }), 6000)
      }
    } catch (e) {
      console.error('[CMS] データ移行に失敗:', e)
      this.showToast(this.t('toast.migrationError'), 6000)
    }
  },

  /** ファビコンアップロード: assets/files/favicon.<ext> に保存し、siteConfig.favicon にパスを記録 */
  async handleFaviconUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !this.fs) return
    const ext = detectAssetExt(
      file,
      {
        'image/x-icon': 'ico',
        'image/vnd.microsoft.icon': 'ico',
        'image/png': 'png',
        'image/svg+xml': 'svg',
        'image/webp': 'webp',
      },
      /\.(ico|png|svg|webp)$/i,
    )
    if (!ext) {
      this.showToast(this.t('toast.faviconFormat'), 5000)
      input.value = ''
      return
    }
    try {
      // 古い拡張子のファビコンが残っていたら削除（拡張子切替時）
      await removeOldAssetFiles(this.fs, 'favicon', FAVICON_EXTS, ext)
      const buffer = await file.arrayBuffer()
      const path = `${PATH_ASSETS_FILES}/favicon.${ext}`
      await this.fs.writeBlob(path, new Blob([buffer]))
      this.siteConfig.favicon = `/${path}`
      await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
      this.faviconBlobUrl = await loadFaviconBlobUrl(this.fs, this.siteConfig.favicon)
      applyFaviconLink(this.faviconBlobUrl)
      this.showToast(this.t('toast.faviconUploaded'))
    } catch (e) {
      console.error('ファビコンアップロードエラー:', e)
      this.showToast(this.t('toast.faviconFailed'))
    } finally {
      input.value = ''
    }
  },

  /** ファビコン削除 */
  async removeFavicon() {
    if (!this.fs) return
    if (!(await this.showConfirm(this.t('confirm.removeFavicon')))) return
    await removeOldAssetFiles(this.fs, 'favicon', FAVICON_EXTS)
    delete (this.siteConfig as any).favicon
    await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
    clearFaviconBlobUrl()
    this.faviconBlobUrl = ''
    applyFaviconLink('')
    this.showToast(this.t('toast.faviconRemoved'))
  },

  /** サイトロゴアップロード: assets/files/logo.<ext> に保存し、siteConfig.logo にパスを記録 */
  async handleLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !this.fs) return
    const ext = detectAssetExt(
      file,
      {
        'image/png': 'png',
        'image/svg+xml': 'svg',
        'image/webp': 'webp',
        'image/jpeg': 'jpg',
      },
      /\.(png|svg|webp|jpe?g)$/i,
    )
    if (!ext) {
      this.showToast(this.t('toast.logoFormat'), 5000)
      input.value = ''
      return
    }
    try {
      // 古い拡張子のロゴが残っていたら削除（拡張子切替時）
      await removeOldAssetFiles(this.fs, 'logo', LOGO_EXTS, ext)
      const buffer = await file.arrayBuffer()
      const path = `${PATH_ASSETS_FILES}/logo.${ext}`
      await this.fs.writeBlob(path, new Blob([buffer]))
      this.siteConfig.logo = `/${path}`
      await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
      this.logoBlobUrl = await loadAssetBlobUrl(this.fs, this.siteConfig.logo)
      this.showToast(this.t('toast.logoUploaded'))
    } catch (e) {
      console.error('ロゴアップロードエラー:', e)
      this.showToast(this.t('toast.logoFailed'))
    } finally {
      input.value = ''
    }
  },

  /** ロゴ削除 */
  async removeLogo() {
    if (!this.fs) return
    if (!(await this.showConfirm(this.t('confirm.removeLogo')))) return
    await removeOldAssetFiles(this.fs, 'logo', LOGO_EXTS)
    delete (this.siteConfig as any).logo
    await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
    if (this.logoBlobUrl) URL.revokeObjectURL(this.logoBlobUrl)
    this.logoBlobUrl = ''
    this.showToast(this.t('toast.logoRemoved'))
  },

  async saveSiteConfig() {
    if (!this.fs) return
    await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
    this.showToast(this.t('toast.siteConfigSaved'))
  },
}
