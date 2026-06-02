import { z } from 'zod'

// ----- サイト設定 -----

export const SiteConfigSchema = z.object({
  name: z.string(),
  url: z.string(),
  description: z.string(),
  favicon: z.string().optional(),
  logo: z.string().optional(),
  customHeadScript: z.string().optional(),
  customBodyScript: z.string().optional(),
  theme: z
    .object({
      id: z.string().optional(),
      primary: z.string().optional(),
      secondary: z.string().optional(),
      fontId: z.string().optional(),
      fontFamily: z.string().optional(),
      fontCdn: z.string().optional(),
    })
    .optional(),
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

export const FieldGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  fields: z.array(FieldDefinitionSchema),
})

// ----- コンテンツタイプ -----

export const ContentTypeSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  slug: z.string(),
  order: z.string().optional(),
  hasCategory: z.boolean().optional(),
  hasTag: z.boolean().optional(),
  hasThumbnail: z.boolean().optional(),
  hasDate: z.boolean().optional(),
  hasBody: z.boolean().optional(),
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
