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
  LICENSE_ID,
  PATH_CMS_META,
  PATH_CMS_BACKUP_DIR,
  PATH_SITE_CONFIG,
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
  /** ライセンス識別子（配布ビルドに埋め込まれた顧客ID） */
  licenseId?: string
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
export const MIGRATIONS: Migration[] = [
  {
    to: 2,
    description: '単一 templates/ を差し替え可能なテーマパッケージ themes/default/ へ移行',
    up: async (fs) => {
      const hasThemes = !!(await fs.getDir('themes'))
      const hasLegacy = !!(await fs.getDir('templates'))
      // 旧構造（フラット templates/）かつ themes/ 未作成のときだけ移行（ユーザー編集を保全）
      if (!hasLegacy || hasThemes) return
      await fs.copyDir('templates', 'themes/default')
      // theme.json が無ければ旧 config.json から生成（themes キー → colors に改称）
      const manifest = await fs.readJson('themes/default/theme.json')
      if (!manifest) {
        const old =
          (await fs.readJson<{
            engine?: string
            version?: string
            name?: string
            description?: string
            author?: string
          }>('themes/default/config.json')) || {}
        await fs.writeJson('themes/default/theme.json', {
          id: 'default',
          name: old.name || 'Default',
          version: old.version || '1.0',
          author: old.author || '',
          description: old.description || '',
          engine: old.engine || 'handlebars',
          apiVersion: '1',
        })
      }
      // アクティブテーマを default に設定
      const site = await fs.readJson<Record<string, unknown>>(PATH_SITE_CONFIG)
      if (site && !site.themeId) {
        site.themeId = 'default'
        await fs.writeJson(PATH_SITE_CONFIG, site)
      }
    },
  },
]

/** 現在の本体が書き込むべきメタ情報 */
export function currentMeta(): CmsMeta {
  return {
    schemaVersion: SCHEMA_VERSION,
    cmsVersion: APP_VERSION,
    edition: EDITION,
    licenseId: LICENSE_ID,
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

/** content/・templates/・themes/ を .cms/backup/<timestamp>/ にスナップショットし、保存先パスを返す */
export async function backupData(fs: FileSystem): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = `${PATH_CMS_BACKUP_DIR}/${stamp}`
  await fs.copyDir('content', `${dest}/content`)
  // 旧構造（templates/）・新構造（themes/）はどちらか一方のことがあるので存在時のみ退避
  if (await fs.getDir('templates')) await fs.copyDir('templates', `${dest}/templates`)
  if (await fs.getDir('themes')) await fs.copyDir('themes', `${dest}/themes`)
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
