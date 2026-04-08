import { z } from 'zod'
import {
  SiteConfigSchema,
  LocaleSchema,
  LanguagesSchema,
  ContentMetaSchema,
  ContentDataSchema,
  ShowIfConditionSchema,
  FieldDefinitionSchema,
  ContentTypeSchema,
  ExportFileSchema,
  ExportResultSchema,
  RevisionEntrySchema,
  ImageOptionsSchema,
  ImageSaveResultSchema,
} from './schemas.ts'

/** サイト設定 */
export type SiteConfig = z.infer<typeof SiteConfigSchema>

/** 言語ロケール */
export type Locale = z.infer<typeof LocaleSchema>

/** 多言語設定 */
export type Languages = z.infer<typeof LanguagesSchema>

/** メタ情報 */
export type ContentMeta = z.infer<typeof ContentMetaSchema>

/** コンテンツデータ（ページ・記事共通） */
export type ContentData = z.infer<typeof ContentDataSchema>

/** カスタムフィールドの条件付き表示 */
export type ShowIfCondition = z.infer<typeof ShowIfConditionSchema>

/** カスタムフィールド定義 */
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>

/** コンテンツタイプ定義 */
export type ContentType = z.infer<typeof ContentTypeSchema>

/** 書き出しファイル */
export type ExportFile = z.infer<typeof ExportFileSchema>

/** 書き出し結果 */
export type ExportResult = z.infer<typeof ExportResultSchema>

/** リビジョンエントリ */
export type RevisionEntry = z.infer<typeof RevisionEntrySchema>

/** 画像最適化オプション */
export type ImageOptions = z.infer<typeof ImageOptionsSchema>

/** 画像保存結果 */
export type ImageSaveResult = z.infer<typeof ImageSaveResultSchema>

/** 差分検出結果 */
export interface DiffResult {
  manifest: Record<string, string>
  changed: ExportFile[]
  removed: string[]
}
