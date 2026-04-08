import type { FileSystem } from './fs.ts'
import { MAX_REVISIONS, PATH_REVISIONS_DIR } from './constants.ts'
import type { ContentData, RevisionEntry } from './types.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */
async function collectEntries(
  dir: FileSystemDirectoryHandle,
): Promise<[string, FileSystemHandle][]> {
  const result: [string, FileSystemHandle][] = []
  const iter: AsyncIterableIterator<[string, FileSystemHandle]> = (dir as any).entries()
  while (true) {
    const { done, value } = await iter.next()
    if (done) break
    result.push(value)
  }
  return result
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * リビジョン管理
 * 保存ごとに .revisions/ にスナップショットを保存（最大20件）
 */
export class RevisionManager {
  private fs: FileSystem
  private max: number

  constructor(fs: FileSystem, maxRevisions = MAX_REVISIONS) {
    this.fs = fs
    this.max = maxRevisions
  }

  private _dirPath(typePath: string, pageId: string, lang: string): string {
    return `${PATH_REVISIONS_DIR}/${typePath}/${pageId}/${lang}`
  }

  private _timestamp(): string {
    const now = new Date()
    const y = now.getFullYear()
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const h = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    return `${y}-${mo}-${d}_${h}${mi}`
  }

  /** リビジョンを保存 */
  async save(typePath: string, pageId: string, lang: string, data: ContentData): Promise<void> {
    const dirPath = this._dirPath(typePath, pageId, lang)
    const fileName = `${this._timestamp()}.json`
    const filePath = `${dirPath}/${fileName}`

    await this.fs.writeJson(filePath, {
      ...data,
      _revision: {
        savedAt: new Date().toISOString(),
        author: data._meta?.author || '',
      },
    })

    await this._prune(dirPath)
  }

  /** リビジョン一覧を取得（新しい順） */
  async list(typePath: string, pageId: string, lang: string): Promise<RevisionEntry[]> {
    const dirPath = this._dirPath(typePath, pageId, lang)
    const dir = await this.fs.getDir(dirPath)
    if (!dir) return []

    const entries = await collectEntries(dir)
    const revisions: RevisionEntry[] = []
    for (const [name, handle] of entries) {
      if (handle.kind === 'file' && name.endsWith('.json')) {
        try {
          const file = await (handle as FileSystemFileHandle).getFile()
          const text = await file.text()
          const data = JSON.parse(text) as ContentData
          revisions.push({
            filename: name,
            timestamp: name.replace('.json', ''),
            author: data._revision?.author || data._meta?.author || '',
            savedAt: (data._revision?.savedAt as string) || '',
            data,
          })
        } catch {
          // skip
        }
      }
    }

    revisions.sort((a, b) => b.filename.localeCompare(a.filename))
    return revisions
  }

  /** 古いリビジョンを削除 */
  private async _prune(dirPath: string): Promise<void> {
    const dir = await this.fs.getDir(dirPath)
    if (!dir) return

    const entries = await collectEntries(dir)
    const files: string[] = []
    for (const [name, handle] of entries) {
      if (handle.kind === 'file' && name.endsWith('.json')) {
        files.push(name)
      }
    }

    files.sort()
    const toDelete = files.slice(0, Math.max(0, files.length - this.max))

    for (const name of toDelete) {
      try {
        await dir.removeEntry(name)
      } catch {
        // skip
      }
    }
  }
}
