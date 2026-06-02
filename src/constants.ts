/**
 * ONE CMS 定数定義
 */

// --- アプリケーション ---
export const APP_NAME = 'ONE CMS'
export const APP_VERSION = '1.0.0'

// エディション。Pro ビルドは VITE_EDITION=pro でビルドして上書きする。
export type Edition = 'free' | 'pro'
export const EDITION: Edition = import.meta.env.VITE_EDITION === 'pro' ? 'pro' : 'free'

// データ（content/templates）のスキーマバージョン。
// 破壊的な構造変更を加えたら +1 し、src/migrations.ts にマイグレーションを追加する。
export const SCHEMA_VERSION = 1

// --- ストレージ ---
export const STORAGE_DB_NAME = 'one-cms'
export const STORAGE_HANDLE_KEY = 'rootFolder'
export const STORAGE_AUTHOR_KEY = 'one-cms-author'
export const STORAGE_THEME_KEY = 'one-cms-theme'

export type ThemeMode = 'light' | 'dark' | 'system'

// --- リビジョン ---
export const MAX_REVISIONS = 20

// --- 画像最適化 ---
export const IMAGE_MAX_WIDTH = 1200
export const IMAGE_QUALITY = 0.8
export const IMAGE_FORMAT = 'image/webp'

// --- エディタ ---
export const EDITOR_HOLDER_ID = 'editorjs'
export const EDITOR_PLACEHOLDER = '/ でメニューを開く、またはテキストを入力...'

// --- トースト ---
export const TOAST_DURATION = 3000

// --- 自動保存 ---
export const AUTOSAVE_DEBOUNCE_MS = 3000

// --- ファイルパス ---
export const PATH_SITE_CONFIG = 'content/site.json'
export const PATH_LANGUAGES = 'content/languages.json'
export const PATH_TYPES_DIR = 'content/_types'
export const PATH_PAGES_DIR = 'content/pages'
export const PATH_PAGES_CONFIG = 'content/pages/_config.json'
export const PATH_TAXONOMIES_CATEGORIES = 'content/taxonomies/categories.json'
export const PATH_TAXONOMIES_TAGS = 'content/taxonomies/tags.json'
export const PATH_MENUS = 'content/menus.json'
export const PATH_REVISIONS_DIR = '.revisions'
// CMS メタ情報（スキーマ版・本体版・エディションの記録）と移行前バックアップ
export const PATH_CMS_META = '.cms/version.json'
export const PATH_CMS_BACKUP_DIR = '.cms/backup'
// 既定テンプレートの基準ハッシュ（差分提案アップデートで「未編集」を判定するため）
export const PATH_TEMPLATES_BASELINE = '.cms/templates-baseline.json'
// 前回書き出し時のソース署名（変更がなければ書き出しをスキップするため）
export const PATH_EXPORT_SOURCE = '.cms/export-source.json'
export const PATH_ASSETS_IMAGES = 'assets/images'
export const PATH_ASSETS_FILES = 'assets/files'
export const PATH_ASSETS_ORIGINALS = 'assets/_originals'
export const PATH_DIST = 'dist'
export const PATH_CHANGED = 'changed'

// --- ステータス ---
export const CONTENT_STATUSES = [
  { value: 'draft', label: '下書き' },
  { value: 'published', label: '公開中' },
  { value: 'archived', label: 'アーカイブ' },
] as const

// --- カスタムフィールドタイプ ---
export const FIELD_TYPES = [
  'text',
  'textarea',
  'richtext',
  'number',
  'url',
  'email',
  'date',
  'datetime',
  'daterange',
  'image',
  'imagelist',
  'file',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'toggle',
  'relation',
  'repeater',
  'group',
  'year',
  'color',
  'hidden',
] as const
