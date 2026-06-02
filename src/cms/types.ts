import EditorJS from '@editorjs/editorjs'
import {
  type SiteConfig,
  type Languages,
  type ContentData,
  type ContentType,
  type FieldDefinition,
  type FieldGroup,
  type RevisionEntry,
  type ExportResult,
  type Menu,
  type MenuData,
} from '../types.ts'
import { type EditorData } from '../editor.ts'
import { FileSystem } from '../fs.ts'
import { Exporter } from '../export.ts'
import { DiffEngine } from '../diff.ts'
import { RevisionManager } from '../revision.ts'
import { type ThemeMode, type Edition } from '../constants.ts'

export interface CmsComponent {
  authorName: string
  authorInput: string
  folderHandle: FileSystemDirectoryHandle | null
  view: string
  currentLang: string
  exporting: boolean
  exportResult: ExportResult | null
  exportProgress: { step: number; total: number } | null
  toast: string | null

  siteConfig: SiteConfig
  languages: Languages
  pages: ContentData[]
  contentTypes: ContentType[]
  contentItems: ContentData[]
  contentPage: number
  contentPerPage: number
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
  // ロゴプレビュー用 Blob URL
  logoBlobUrl: string

  // テーマ
  themeMode: ThemeMode
  setThemeMode(mode: ThemeMode): void

  // バージョン・データ移行
  appVersion: string
  edition: Edition
  dataSchemaVersion: number
  lastBackupPath: string | null
  schemaWarning: string | null
  checkVersionAndMigrate(): Promise<void>

  // テンプレート/コンポーネントの役割説明
  templateDescription(name: string): string

  // タクソノミー管理画面用テンプレートスニペット
  categorySnippets: Array<{ label: string; code: string }>
  tagSnippets: Array<{ label: string; code: string }>

  // テンプレートエディタ用リファレンスデータ（全体）
  templateReferenceGroups: Array<{
    id: string
    label: string
    items: Array<{ label: string; code: string; note?: string }>
  }>
  // テンプレートエディタの右パネルの開閉状態（id → bool）
  templateRefOpenSection: Record<string, boolean>
  // 投稿タイプリファレンス用に選択中のタイプ ID
  templateRefSelectedTypeId: string
  templateRefTypeFields(): Array<{ label: string; code: string; note?: string }>
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
  ensureMissingTemplates(): Promise<void>
  createPage(): void
  confirmCreatePage(): void
  openHomePage(): Promise<void>
  showPageCreator: boolean
  editingPageId: string
  editingPageTitle: string
  loadPageList(): Promise<void>
  // ページ設定
  pagesConfig: {
    hasBody?: boolean
    fieldGroupIds?: string[]
    overrides?: Record<string, { hasBody?: boolean; fieldGroupIds?: string[] }>
  }
  showPagesConfigEditor: boolean
  editingPagesConfig: {
    hasBody?: boolean
    fieldGroupIds?: string[]
    overrides?: Record<string, { hasBody?: boolean; fieldGroupIds?: string[] }>
  } | null
  openPagesConfigEditor(): void
  savePagesConfig(): Promise<void>
  openPage(page: ContentData): Promise<void>
  openContentType(type: ContentType): Promise<void>
  rebuildContentList(): Promise<void>
  openContent(item: ContentData): Promise<void>
  createContent(): void
  initEditor(bodyData: string | EditorData): void
  getEditorHtml(): Promise<string>
  handleImageUpload(event: Event, fieldKey: string): Promise<void>
  handleFileUpload(event: Event, fieldKey: string): Promise<void>
  handleFaviconUpload(event: Event): Promise<void>
  removeFavicon(): Promise<void>
  handleLogoUpload(event: Event): Promise<void>
  removeLogo(): Promise<void>
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
  relationCandidates(typeId: string): ContentData[]
  relationCandidatesCache: Record<string, ContentData[]>
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
  menuData: MenuData
  currentMenuId: string
  currentMenu: Menu | null
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
  addFieldToType(): void
  removeFieldFromType(idx: number): void
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
  // フィールドタイプ選択ピッカー（非エンジニア向け）
  fieldTypes: Array<{ id: string; label: string; icon: string; desc: string; category: string }>
  fieldTypeCategories: Array<{ id: string; label: string }>
  typePickerTarget: FieldDefinition | null
  openTypePicker(field: FieldDefinition): void
  selectFieldType(id: string): void
  fieldTypeLabel(id: string): string
  fieldTypeIcon(id: string): string
  onFieldLabelInput(field: FieldDefinition): void
  goEditFieldGroup(id?: string): Promise<void>
  // 編集画面でカスタム項目をグループ単位のセクションに分けて表示
  fieldSections(): Array<{ label: string; fields: FieldDefinition[] }>
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
  // 既定テンプレートの差分提案アップデート
  templateUpdates: Array<{ path: string; name: string; status: 'safe' | 'conflict' }>
  showTemplateUpdates: boolean
  selectedUpdatePath: string
  templateUpdateDiff: string | null
  checkTemplateUpdates(): Promise<void>
  viewTemplateUpdateDiff(path: string): Promise<void>
  applyTemplateUpdate(path: string): Promise<void>
  applySafeTemplateUpdates(): Promise<void>
}
