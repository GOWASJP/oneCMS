/**
 * データ移行（マイグレーション）基盤
 *
 * content/ や templates/ のスキーマ（構造）が新版で変わったとき、
 * 旧バージョンで作られたデータを壊さずに最新へ追従させるための仕組み。
 *
 * - データのバージョンは `.cms/version.json`（PATH_CMS_META）に記録する
 * - 破壊的変更を加えたら constants.ts の SCHEMA_VERSION を +1 し、
 *   下記 MIGRATIONS に `to`（その変更後のバージョン）の移行を追加する
 * - 移行は必ず昇順に適用され、実行前に content/・templates/ をバックアップする
 */
import type { FileSystem } from './fs.ts'
import {
  SCHEMA_VERSION,
  APP_VERSION,
  EDITION,
  PATH_CMS_META,
  PATH_CMS_BACKUP_DIR,
  type Edition,
} from './constants.ts'

/** `.cms/version.json` に記録するメタ情報 */
export interface CmsMeta {
  /** データ構造のバージョン */
  schemaVersion: number
  /** このデータを最後に扱った本体バージョン */
  cmsVersion: string
  /** 最後に扱ったエディション */
  edition: Edition
  /** 最終更新時刻（ISO） */
  updatedAt: string
}

/** 1 つの移行ステップ */
export interface Migration {
  /** この移行を適用した後のスキーマバージョン */
  to: number
  /** 変更内容の説明（ログ・UI 表示用） */
  description: string
  /** 実際の変換処理。content/templates を読み書きして新構造へ変換する */
  up(fs: FileSystem): Promise<void>
}

/**
 * 順序付きマイグレーション一覧（`to` の昇順で定義する）。
 *
 * 例: スキーマ v2 で投稿の `tags` を文字列配列からオブジェクト配列に変える場合
 *   { to: 2, description: 'tags を {id,label} 形式に変換', up: async (fs) => { ... } }
 *
 * 現時点では破壊的変更はないため空。バージョン記録のみ行われる。
 */
export const MIGRATIONS: Migration[] = []

/** 現在の本体が書き込むべきメタ情報 */
export function currentMeta(): CmsMeta {
  return {
    schemaVersion: SCHEMA_VERSION,
    cmsVersion: APP_VERSION,
    edition: EDITION,
    updatedAt: new Date().toISOString(),
  }
}

/** メタ情報を読み込む。未記録（旧データ／新規）なら null */
export async function readMeta(fs: FileSystem): Promise<CmsMeta | null> {
  return await fs.readJson<CmsMeta>(PATH_CMS_META)
}

/** メタ情報を書き込む */
export async function writeMeta(fs: FileSystem, meta: CmsMeta): Promise<void> {
  await fs.writeJson(PATH_CMS_META, meta)
}

/** content/ と templates/ を .cms/backup/<timestamp>/ にスナップショットし、保存先パスを返す */
export async function backupData(fs: FileSystem): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = `${PATH_CMS_BACKUP_DIR}/${stamp}`
  await fs.copyDir('content', `${dest}/content`)
  await fs.copyDir('templates', `${dest}/templates`)
  return dest
}

export interface MigrationResult {
  /** 移行前のスキーマバージョン */
  from: number
  /** 移行後のスキーマバージョン */
  to: number
  /** 適用した移行の一覧 */
  applied: Array<{ to: number; description: string }>
  /** 取得したバックアップのパス（移行を実行した場合のみ） */
  backupPath: string | null
  /** データ側が本体より新しい（ダウングレード）場合 true */
  downgrade: boolean
}

/**
 * 現行データを最新スキーマまで移行する。
 *
 * - from < SCHEMA_VERSION: 該当する移行を昇順に適用（実行前にバックアップ）
 * - from > SCHEMA_VERSION: ダウングレード。移行せず downgrade=true を返す
 * - from === SCHEMA_VERSION: 何もしない
 */
export async function runMigrations(fs: FileSystem, fromVersion: number): Promise<MigrationResult> {
  const target = SCHEMA_VERSION

  if (fromVersion > target) {
    return { from: fromVersion, to: fromVersion, applied: [], backupPath: null, downgrade: true }
  }

  const pending = MIGRATIONS.filter((m) => m.to > fromVersion && m.to <= target).sort(
    (a, b) => a.to - b.to,
  )

  if (pending.length === 0) {
    return { from: fromVersion, to: target, applied: [], backupPath: null, downgrade: false }
  }

  // 破壊的変更を適用する前に必ずバックアップを取る
  const backupPath = await backupData(fs)
  const applied: Array<{ to: number; description: string }> = []
  for (const m of pending) {
    await m.up(fs)
    applied.push({ to: m.to, description: m.description })
  }
  return { from: fromVersion, to: target, applied, backupPath, downgrade: false }
}
