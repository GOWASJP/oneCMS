/**
 * ONE CMS 定数定義
 */

// --- アプリケーション ---
export const APP_NAME = 'ONE CMS'
export const APP_VERSION = '1.0.0'

// エディション。Pro ビルドは VITE_EDITION=pro でビルドして上書きする。
export type Edition = 'free' | 'pro'
export const EDITION: Edition = import.meta.env.VITE_EDITION === 'pro' ? 'pro' : 'free'

// ライセンス識別子。配布ビルド時に VITE_LICENSE_ID=<顧客ID> を渡して埋め込む。
// 書き出し HTML に透かしとして注入し、流出元の特定に使う。
export const LICENSE_ID: string = (import.meta.env.VITE_LICENSE_ID as string | undefined) || ''

// カナリア文字列。世界に1つの固有トークンで、コピーされた cms.html や
// 生成サイトを GitHub / PublicWWW 等で検索・発見するための目印。
export const CANARY = 'ONECMS-Cf9K3xQ2-mark'

// 透かしの版。注入仕様を変えたら +1 する（既存サイトの再スタンプを促すため署名に含める）。
export const STAMP_VERSION = 1

// データ（content/templates）のスキーマバージョン。
// 破壊的な構造変更を加えたら +1 し、src/migrations.ts にマイグレーションを追加する。
export const SCHEMA_VERSION = 2

// --- ストレージ ---
export const STORAGE_DB_NAME = 'one-cms'
export const STORAGE_HANDLE_KEY = 'rootFolder'
export const STORAGE_AUTHOR_KEY = 'one-cms-author'
export const STORAGE_THEME_KEY = 'one-cms-theme'
/** 管理画面の表示言語（端末ごと。コンテンツ言語とは別） */
export const STORAGE_UI_LOCALE_KEY = 'one-cms-ui-locale'

/** 管理画面UI翻訳カタログの置き場（プロジェクト内・POファイル風に編集可能） */
export const PATH_I18N_DIR = 'content/i18n'
/** 日付/時刻表示の既定タイムゾーン（IANA） */
export const DEFAULT_TIMEZONE = 'Asia/Tokyo'

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
// テーマ（出力サイトのテンプレートパック）の置き場。themes/<theme-id>/ 配下に theme.json と *.hbs。
export const PATH_THEMES = 'themes'
// 旧構造（フラットな単一テーマ）。移行・フォールバック用。
export const PATH_TEMPLATES_LEGACY = 'templates'
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

// --- 書き出し（静的サイト生成） ---
/** 検索インデックスの本文抜粋の最大文字数 */
export const SEARCH_EXCERPT_LENGTH = 300
/** meta description を本文から自動生成する際の最大文字数 */
export const AUTO_DESCRIPTION_LENGTH = 120
/** コンテンツタイプ一覧の1ページあたり件数（type.pagination 未指定時の既定） */
export const DEFAULT_PAGINATION = 10
/** 詳細ページ書き出しで UI を固めないようメインスレッドを解放する件数間隔 */
export const EXPORT_YIELD_INTERVAL = 50

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
