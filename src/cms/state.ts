import type { CmsComponent } from './types.ts'
import { extensionNavItems } from './extensions.ts'
import { type SiteConfig, type ContentData, type FieldGroup } from '../types.ts'
import {
  STORAGE_AUTHOR_KEY,
  STORAGE_THEME_KEY,
  STORAGE_UI_LOCALE_KEY,
  APP_VERSION,
  EDITION,
  LICENSE_ID,
  SCHEMA_VERSION,
  type ThemeMode,
} from '../constants.ts'
import { DEFAULT_UI_CATALOGS } from '../i18n-catalogs.ts'
import { FIELD_TYPES, FIELD_TYPE_CATEGORIES, getLocalizedReference } from './template-reference.ts'

export function createInitialState(): Partial<CmsComponent> & ThisType<CmsComponent> {
  // 初期描画時点の UI 言語でリファレンスデータを用意（言語切替時は loadUiCatalog で差し替え）
  const ref = getLocalizedReference(localStorage.getItem(STORAGE_UI_LOCALE_KEY) || 'ja')
  return {
    // 状態管理
    authorName: localStorage.getItem(STORAGE_AUTHOR_KEY) || '',

    authorInput: '',

    folderHandle: null,

    view: 'welcome',

    currentLang: 'ja',

    // 管理画面の表示言語（端末ごと。コンテンツ言語 currentLang とは別）。
    // 初期描画のチラつきを避けるため、既定カタログを先読みしておく。
    uiLocale: localStorage.getItem(STORAGE_UI_LOCALE_KEY) || 'ja',
    uiCatalog:
      DEFAULT_UI_CATALOGS[localStorage.getItem(STORAGE_UI_LOCALE_KEY) || 'ja'] ||
      DEFAULT_UI_CATALOGS.ja,

    exporting: false,
    zipping: false,

    exportResult: null,
    exportProgress: null,

    toast: null,

    // データ
    siteConfig: { name: '', url: '', description: '' } as SiteConfig,

    languages: {
      default: 'ja',
      locales: [{ code: 'ja', label: '日本語', flag: '🇯🇵' }],
    },

    pages: [],

    contentTypes: [],

    contentItems: [],
    contentPage: 1,
    contentPerPage: 50,

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

    // メニュー管理
    menuData: { menus: [] },

    currentMenuId: '',

    currentMenu: null,

    // ページ作成
    showPageCreator: false,

    editingPageId: '',

    editingPageTitle: '',

    // コンテンツタイプ管理
    showTypeEditor: false,

    editingType: null,

    // フィールドタイプ選択ピッカー
    fieldTypes: FIELD_TYPES,
    fieldTypeCategories: FIELD_TYPE_CATEGORIES,
    typePickerTarget: null,

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
    // テーマ（差し替え可能なパッケージ）
    activeThemeManifest: null as CmsComponent['activeThemeManifest'],
    installedThemes: [] as CmsComponent['installedThemes'],

    templateFiles: [] as Array<{ name: string; path: string; isComponent: boolean }>,

    currentTemplateFile: '',

    templateCode: '',

    // テンプレート差分提案アップデート
    templateUpdates: [] as Array<{ path: string; name: string; status: 'safe' | 'conflict' }>,
    showTemplateUpdates: false,
    selectedUpdatePath: '',
    templateUpdateDiff: null,

    // エディタ
    editor: null,
    // richtext カスタムフィールド用の Editor.js インスタンス（field.key 別）
    fieldEditors: {},

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

    // ロゴプレビュー用 Blob URL
    logoBlobUrl: '',

    // テーマ（light / dark / system）
    themeMode: (localStorage.getItem(STORAGE_THEME_KEY) as ThemeMode) || 'system',

    // バージョン・データ移行
    appVersion: APP_VERSION,
    edition: EDITION,
    licenseId: LICENSE_ID,
    dataSchemaVersion: SCHEMA_VERSION,
    lastBackupPath: null,
    schemaWarning: null,

    // 拡張（Pro/プラグイン）が追加するサイドバー項目（無料コアでは空）
    extensionNavItems,

    categorySnippets: ref.categorySnippets,
    tagSnippets: ref.tagSnippets,
    templateDescriptions: ref.templateDescriptions,

    // テンプレートエディタの右パネル開閉状態（デフォルトで「テーマの構成と作り方」を展開）
    templateRefOpenSection: {
      'getting-started': true,
      'page-types': false,
      variables: false,
      page: false,
      helpers: false,
      conditions: false,
      types: false,
      snippets: false,
    } as Record<string, boolean>,

    // 投稿タイプリファレンス用に選択中のタイプ ID
    templateRefSelectedTypeId: '',
    templateReferenceGroups: ref.templateReferenceGroups,

    // relation フィールドの候補リストキャッシュ
    relationCandidatesCache: {} as Record<string, ContentData[]>,

    // FS / エンジン
    fs: null,

    exporter: null,

    diffEngine: null,

    revisionMgr: null,

    // Alpine runtime placeholders
    $nextTick(_fn: () => void) {},

    $watch(_expression: string, _callback: (value: unknown) => void) {},
  }
}
