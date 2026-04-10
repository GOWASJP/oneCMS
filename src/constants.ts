/**
 * ONE CMS 定数定義
 */

// --- アプリケーション ---
export const APP_NAME = 'ONE CMS'
export const APP_VERSION = '1.0.0'

// --- ストレージ ---
export const STORAGE_DB_NAME = 'one-cms'
export const STORAGE_HANDLE_KEY = 'rootFolder'
export const STORAGE_AUTHOR_KEY = 'one-cms-author'

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
export const PATH_ASSETS_IMAGES = 'assets/images'
export const PATH_ASSETS_FILES = 'assets/files'
export const PATH_ASSETS_ORIGINALS = 'assets/_originals'
export const PATH_DIST = 'dist'
export const PATH_CHANGED = 'changed'

// --- ステータス ---
export const CONTENT_STATUSES = [
  { value: 'draft', label: '下書き' },
  { value: 'published', label: '公開中' },
  { value: 'preview', label: 'プレビュー' },
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
