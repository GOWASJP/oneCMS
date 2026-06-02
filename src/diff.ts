import type { FileSystem } from './fs.ts'
import type { ExportFile, DiffResult } from './types.ts'
import { PATH_DIST, PATH_CHANGED, PATH_ASSETS_IMAGES, PATH_ASSETS_FILES } from './constants.ts'

/**
 * 差分抽出エンジン
 * Web Crypto APIでSHA-256ハッシュを計算し、manifest.jsonと比較して差分を検出
 */
export class DiffEngine {
  private fs: FileSystem

  constructor(fs: FileSystem) {
    this.fs = fs
  }

  /** 文字列のSHA-256ハッシュを計算 */
  async hash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /** 前回のmanifest.jsonを読み込み */
  async loadManifest(): Promise<Record<string, string>> {
    return (await this.fs.readJson<Record<string, string>>(`${PATH_DIST}/manifest.json`)) || {}
  }

  /** 書き出しファイルのハッシュを計算し、差分を検出（ハッシュ計算を並列化） */
  async detectChanges(files: ExportFile[]): Promise<DiffResult> {
    const oldManifest = await this.loadManifest()
    const newManifest: Record<string, string> = {}
    const changed: ExportFile[] = []

    const hashes = await Promise.all(files.map((f) => this.hash(f.content)))
    files.forEach((file, i) => {
      newManifest[file.path] = hashes[i]
      if (oldManifest[file.path] !== hashes[i]) {
        changed.push(file)
      }
    })

    const removed = Object.keys(oldManifest).filter((p) => !newManifest[p])

    return { manifest: newManifest, changed, removed }
  }

  /** dist/ に全ファイルを書き出し、changed/ に差分のみコピー、アセットもコピー */
  async writeToDisk(
    files: ExportFile[],
    manifest: Record<string, string>,
    changed: ExportFile[],
  ): Promise<{ totalFiles: number; changedFiles: number }> {
    // HTML/XML/txt ファイル書き出し
    for (const file of files) {
      await this.fs.writeText(`${PATH_DIST}/${file.path}`, file.content)
    }

    await this.fs.writeJson(`${PATH_DIST}/manifest.json`, manifest)

    // changed/ に差分のみ
    for (const file of changed) {
      await this.fs.writeText(`${PATH_CHANGED}/${file.path}`, file.content)
    }

    // assets/ を dist/assets/ と changed/assets/ にコピー
    await this.fs.copyDir(PATH_ASSETS_IMAGES, `${PATH_DIST}/${PATH_ASSETS_IMAGES}`)
    await this.fs.copyDir(PATH_ASSETS_FILES, `${PATH_DIST}/${PATH_ASSETS_FILES}`)
    await this.fs.copyDir(PATH_ASSETS_IMAGES, `${PATH_CHANGED}/${PATH_ASSETS_IMAGES}`)
    await this.fs.copyDir(PATH_ASSETS_FILES, `${PATH_CHANGED}/${PATH_ASSETS_FILES}`)

    return {
      totalFiles: files.length,
      changedFiles: changed.length,
    }
  }
}
