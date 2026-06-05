import { z } from 'zod'

// ----- サイト設定 -----

export const SiteConfigSchema = z.object({
  name: z.string(),
  url: z.string(),
  description: z.string(),
  // フロントページ（/ にマップする固定ページの id）。未設定時は 'index' にフォールバック。
  frontPageId: z.string().optional(),
  // アクティブテーマの id（プロジェクトフォルダ内 themes/<id>/）。未設定時は 'default'。
  themeId: z.string().optional(),
  // 日付/時刻表示のタイムゾーン（IANA、例 'Asia/Tokyo'）。未設定時は既定値にフォールバック。
  timezone: z.string().optional(),
  favicon: z.string().optional(),
  logo: z.string().optional(),
  /** OGP 既定画像（ページに個別画像が無いときの og:image フォールバック） */
  ogImage: z.string().optional(),
  /** 既定ブランド素材（favicon/logo/ogImage）を一度適用済みかのフラグ。再追加を防ぐ。 */
  _brandingDefaultsApplied: z.boolean().optional(),
  customHeadScript: z.string().optional(),
  customBodyScript: z.string().optional(),
  nav: z
    .array(
      z.object({
        label: z.string(),
        url: z.string(),
      }),
    )
    .optional(),
})

// ----- 多言語 -----

export const LocaleSchema = z.object({
  code: z.string(),
  label: z.string(),
  flag: z.string(),
})

export const LanguagesSchema = z.object({
  default: z.string(),
  locales: z.array(LocaleSchema),
})

// ----- コンテンツメタ -----

export const ContentMetaSchema = z.object({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  author: z.string().optional(),
  status: z.string().optional(),
  translatedAt: z.string().optional(),
  basedOn: z.string().optional(),
  basedOnUpdated: z.string().optional(),
})

// ----- コンテンツデータ -----

export const ContentStatusSchema = z.enum(['draft', 'published', 'archived'])

export const ContentDataSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string().optional(),
    body: z.string().optional(),
    status: ContentStatusSchema.optional(),
    publishedAt: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
    description: z.string().optional(),
    /** 親ページの id（固定ページの階層構造用、空/未指定はルート） */
    parent: z.string().optional(),
    /** 同じ親を持つ兄弟間での並び順（小さい順。未指定は最後） */
    menuOrder: z.number().optional(),
    fieldGroupIds: z.array(z.string()).optional(),
    /** 本文の Editor.js 元 JSON（再編集時の往復用。HTML 化前の生データ） */
    _editorJson: z.unknown().optional(),
    _meta: ContentMetaSchema.optional(),
    _revision: z
      .object({
        savedAt: z.string(),
        author: z.string(),
      })
      .optional(),
  })
  .passthrough()

// ----- カスタムフィールド -----

export const FieldTypeSchema = z.enum([
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
])

export const ShowIfConditionSchema = z.object({
  field: z.string(),
  value: z.unknown(),
})

export const SubFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['text', 'textarea', 'number', 'url', 'email', 'date', 'image', 'select']),
})

export const FieldDefinitionSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: FieldTypeSchema,
  /** 記入者向けの補足説明（編集画面で項目の下に表示） */
  description: z.string().optional(),
  required: z.boolean().optional(),
  options: z
    .array(z.union([z.object({ value: z.string(), label: z.string() }), z.string()]))
    .optional(),
  showIf: ShowIfConditionSchema.optional(),
  subFields: z.array(SubFieldSchema).optional(),
  /** relation 型で参照するコンテンツタイプの id */
  relationType: z.string().optional(),
  /** relation 型で複数選択を許可するか */
  relationMultiple: z.boolean().optional(),
})

// ----- フィールドグループ -----

/** フィールドグループの表示条件（ACF のロケーションルール相当）。
 *  target: 'page'（固定ページ）/ 'contentType'（投稿タイプ）
 *  value: 対象の id。'*' はその種別すべてにマッチ。 */
export const LocationRuleSchema = z.object({
  target: z.enum(['page', 'contentType']),
  value: z.string(),
})

export const FieldGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  fields: z.array(FieldDefinitionSchema),
  /** いずれかに一致する編集画面でこのグループを表示する（OR 条件） */
  locations: z.array(LocationRuleSchema).optional(),
})

// ----- コンテンツタイプ -----

export const ContentTypeSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  slug: z.string(),
  order: z.string().optional(),
  // タイトル・本文・サムネイル・カテゴリ・タグは全タイプ共通の既定項目（フラグ不要）。
  hasDate: z.boolean().optional(),
  pagination: z.number().optional(),
  fields: z.array(FieldDefinitionSchema).optional(), // 後方互換
  fieldGroupIds: z.array(z.string()).optional(),
})

// ----- 書き出し -----

export const ExportFileSchema = z.object({
  path: z.string(),
  content: z.string(),
})

export const ExportResultSchema = z.object({
  totalFiles: z.number(),
  changedFiles: z.number(),
  removedFiles: z.number(),
  /** 今回 changed/ に出力された更新ファイルのパス一覧（dist/ 基準の相対パス） */
  changedPaths: z.array(z.string()).optional(),
  /** 今回削除されたファイルのパス一覧 */
  removedPaths: z.array(z.string()).optional(),
})

// ----- リビジョン -----

export const RevisionEntrySchema = z.object({
  filename: z.string(),
  timestamp: z.string(),
  author: z.string(),
  savedAt: z.string(),
  data: ContentDataSchema,
})

// ----- 画像 -----

export const ImageOptionsSchema = z.object({
  maxWidth: z.number().optional(),
  quality: z.number().optional(),
  format: z.string().optional(),
})

export const ImageSaveResultSchema = z.object({
  path: z.string(),
  filename: z.string(),
  width: z.number(),
  height: z.number(),
  size: z.number(),
  originalSize: z.number(),
  blobUrl: z.string().optional(),
})
