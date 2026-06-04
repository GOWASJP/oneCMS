import type { ContentData, ContentType, FieldGroup } from './types.ts'
import { ContentTypeSchema, ContentDataSchema, FieldGroupSchema } from './schemas.ts'

/**
 * FileSystemDirectoryHandle の非同期イテレーターから全エントリを収集する。
 * Vite/Rollup の for-await トランスパイルが
 * ネイティブ async iterable を壊す問題を回避する。
 */
async function collectEntries(
  dir: FileSystemDirectoryHandle,
): Promise<[string, FileSystemHandle][]> {
  const result: [string, FileSystemHandle][] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iter: AsyncIterableIterator<[string, FileSystemHandle]> = (dir as any).entries()
  while (true) {
    const { done, value } = await iter.next()
    if (done) break
    result.push(value)
  }
  return result
}

/** 同時に開くファイル数の上限。読み取りを並列化しつつハンドルの過剰確保を防ぐ。 */
const READ_CONCURRENCY = 32

/** 軽量インデックスの1件分（一覧表示に必要な最小フィールド） */
interface LightEntry {
  title: string
  status?: string
  publishedAt?: string
  createdAt?: string
}

/** content/{type}/_index.json の構造（言語 → id → 軽量エントリ） */
interface ContentIndex {
  v: number
  byLang: Record<string, Record<string, LightEntry>>
}

/** 配列を一定数ずつ並列処理する（読み取り専用の高速化用） */
async function mapBatched<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    const batch = await Promise.all(items.slice(i, i + size).map(fn))
    out.push(...batch)
  }
  return out
}

/**
 * File System Access API ラッパー
 */
export class FileSystem {
  private root: FileSystemDirectoryHandle

  constructor(rootHandle: FileSystemDirectoryHandle) {
    this.root = rootHandle
  }

  /** パスを辿ってディレクトリハンドルを取得 */
  async getDir(path: string, create = false): Promise<FileSystemDirectoryHandle | null> {
    const parts = path.split('/').filter(Boolean)
    let handle: FileSystemDirectoryHandle = this.root
    for (const part of parts) {
      try {
        handle = await handle.getDirectoryHandle(part, { create })
      } catch {
        return null
      }
    }
    return handle
  }

  /** ファイルハンドルを取得 */
  async getFile(path: string, create = false): Promise<FileSystemFileHandle | null> {
    const parts = path.split('/').filter(Boolean)
    const fileName = parts.pop()
    if (!fileName) return null
    let dir: FileSystemDirectoryHandle = this.root
    for (const part of parts) {
      try {
        dir = await dir.getDirectoryHandle(part, { create })
      } catch {
        return null
      }
    }
    try {
      return await dir.getFileHandle(fileName, { create })
    } catch {
      return null
    }
  }

  /** テキストファイルを読み込み */
  async readText(path: string): Promise<string | null> {
    const handle = await this.getFile(path)
    if (!handle) return null
    try {
      const file = await handle.getFile()
      return await file.text()
    } catch {
      return null
    }
  }

  /** テキストファイルを書き込み */
  async writeText(path: string, text: string): Promise<void> {
    const handle = await this.getFile(path, true)
    if (!handle) return
    const writable = await handle.createWritable()
    await writable.write(text)
    await writable.close()
  }

  /** バイナリファイルを書き込み */
  async writeBlob(path: string, blob: Blob): Promise<void> {
    const handle = await this.getFile(path, true)
    if (!handle) return
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
  }

  /** バイナリファイルを Blob として読み込み */
  async readBlob(path: string): Promise<Blob | null> {
    const handle = await this.getFile(path)
    if (!handle) return null
    try {
      return await handle.getFile()
    } catch {
      return null
    }
  }

  /** 指定ディレクトリ配下の全ファイルを再帰的に読み、
   *  相対パス（ディレクトリ基準）→バイト列の一覧を返す。ZIP 化などに使用。 */
  async readDirFilesRecursive(path: string): Promise<Array<{ path: string; bytes: Uint8Array }>> {
    const dir = await this.getDir(path)
    if (!dir) return []
    const out: Array<{ path: string; bytes: Uint8Array }> = []
    const walk = async (handle: FileSystemDirectoryHandle, prefix: string): Promise<void> => {
      const entries = await collectEntries(handle)
      for (const [name, h] of entries) {
        const rel = prefix ? `${prefix}/${name}` : name
        if (h.kind === 'file') {
          const file = await (h as FileSystemFileHandle).getFile()
          const buf = await file.arrayBuffer()
          out.push({ path: rel, bytes: new Uint8Array(buf) })
        } else if (h.kind === 'directory') {
          await walk(h as FileSystemDirectoryHandle, rel)
        }
      }
    }
    await walk(dir, '')
    return out
  }

  /** JSONファイルを読み込み */
  async readJson<T = unknown>(path: string): Promise<T | null> {
    const handle = await this.getFile(path)
    if (!handle) return null
    try {
      const file = await handle.getFile()
      const text = await file.text()
      return JSON.parse(text) as T
    } catch {
      return null
    }
  }

  /** JSONファイルを書き込み */
  async writeJson(path: string, data: unknown): Promise<void> {
    const handle = await this.getFile(path, true)
    if (!handle) return
    const writable = await handle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
  }

  /** コンテンツタイプ定義を読み込み */
  async readContentTypes(): Promise<ContentType[]> {
    const dir = await this.getDir('content/_types')
    if (!dir) return []
    const entries = await collectEntries(dir)
    const types: ContentType[] = []
    for (const [name, handle] of entries) {
      if (handle.kind === 'file' && name.endsWith('.json')) {
        try {
          const file = await (handle as FileSystemFileHandle).getFile()
          const text = await file.text()
          const parsed = ContentTypeSchema.safeParse(JSON.parse(text))
          if (parsed.success) types.push(parsed.data)
          else console.warn(`[CMS] Invalid content type ${name}:`, parsed.error.message)
        } catch {
          // skip invalid files
        }
      }
    }
    return types
  }

  /** 固定ページ一覧を読み込み（ファイル読み取りを並列化） */
  async readPages(lang: string): Promise<ContentData[]> {
    const dir = await this.getDir('content/pages')
    if (!dir) return []
    const entries = await collectEntries(dir)
    const dirs = entries.filter(([, handle]) => handle.kind === 'directory')
    const results = await mapBatched(dirs, READ_CONCURRENCY, async ([name, handle]) => {
      try {
        const subDir = handle as FileSystemDirectoryHandle
        const fileHandle = await subDir.getFileHandle(`${lang}.json`)
        const file = await fileHandle.getFile()
        const text = await file.text()
        const parsed = ContentDataSchema.safeParse({ ...JSON.parse(text), id: name })
        return parsed.success ? parsed.data : null
      } catch {
        return null
      }
    })
    return results.filter((p): p is ContentData => p !== null)
  }

  /** コンテンツ一覧を読み込み（ファイル読み取りを並列化） */
  async readContentList(typeId: string, lang: string): Promise<ContentData[]> {
    const dir = await this.getDir(`content/${typeId}`)
    if (!dir) return []
    const entries = await collectEntries(dir)
    const dirs = entries.filter(([, handle]) => handle.kind === 'directory')
    const results = await mapBatched(dirs, READ_CONCURRENCY, async ([name, handle]) => {
      try {
        const subDir = handle as FileSystemDirectoryHandle
        const fileHandle = await subDir.getFileHandle(`${lang}.json`)
        const file = await fileHandle.getFile()
        const text = await file.text()
        const parsed = ContentDataSchema.safeParse({ ...JSON.parse(text), id: name })
        return parsed.success ? parsed.data : null
      } catch {
        return null
      }
    })
    const items = results.filter((i): i is ContentData => i !== null)
    items.sort((a, b) =>
      (b.publishedAt || b._meta?.createdAt || '').localeCompare(
        a.publishedAt || a._meta?.createdAt || '',
      ),
    )
    return items
  }

  /**
   * ディレクトリ配下のファイルの署名（相対パス:サイズ:更新時刻）を再帰的に集める。
   * 内容を読まずにメタ情報のみ取得するため軽量。書き出しの変更検知（アセット差し替え検出）に使う。
   */
  async listDirSignatures(path: string): Promise<string[]> {
    const dir = await this.getDir(path)
    if (!dir) return []
    const out: string[] = []
    const walk = async (d: FileSystemDirectoryHandle, prefix: string): Promise<void> => {
      const entries = await collectEntries(d)
      for (const [name, handle] of entries) {
        if (handle.kind === 'file') {
          try {
            const f = await (handle as FileSystemFileHandle).getFile()
            out.push(`${prefix}${name}:${f.size}:${f.lastModified}`)
          } catch {
            /* skip */
          }
        } else {
          await walk(handle as FileSystemDirectoryHandle, `${prefix}${name}/`)
        }
      }
    }
    await walk(dir, '')
    out.sort()
    return out
  }

  /** ディレクトリ内のファイルを再帰的に別ディレクトリへコピー */
  async copyDir(srcPath: string, destPath: string): Promise<number> {
    const srcDir = await this.getDir(srcPath)
    if (!srcDir) return 0
    let count = 0
    const entries = await collectEntries(srcDir)
    for (const [name, handle] of entries) {
      if (handle.kind === 'file') {
        try {
          const file = await (handle as FileSystemFileHandle).getFile()
          const buffer = await file.arrayBuffer()
          await this.writeBlob(`${destPath}/${name}`, new Blob([buffer]))
          count++
        } catch {
          // skip
        }
      } else if (handle.kind === 'directory') {
        count += await this.copyDir(`${srcPath}/${name}`, `${destPath}/${name}`)
      }
    }
    return count
  }

  /** 固定ページを保存 */
  async savePage(pageId: string, lang: string, data: ContentData): Promise<void> {
    await this.writeJson(`content/pages/${pageId}/${lang}.json`, data)
  }

  /** コンテンツを保存（軽量インデックスも同時に更新） */
  async saveContent(
    typeId: string,
    contentId: string,
    lang: string,
    data: ContentData,
  ): Promise<void> {
    await this.writeJson(`content/${typeId}/${contentId}/${lang}.json`, data)
    await this.upsertContentIndex(typeId, lang, contentId, data)
  }

  // ---- 軽量インデックス（管理画面の一覧高速化用。表示専用で、編集時はフルJSONを読み直す） ----

  private _indexPath(typeId: string): string {
    return `content/${typeId}/_index.json`
  }

  private _toLight(item: ContentData): LightEntry {
    return {
      title: item.title || '',
      status: item.status,
      publishedAt: item.publishedAt,
      createdAt: item._meta?.createdAt,
    }
  }

  /** タイプのインデックスを読み込み（無ければ null） */
  async readContentIndex(typeId: string): Promise<ContentIndex | null> {
    return this.readJson<ContentIndex>(this._indexPath(typeId))
  }

  /**
   * 軽量一覧を返す。インデックスがあれば1ファイル読込で返し、
   * 無ければフル読込してインデックスを生成する。表示専用（編集時は readContent でフル取得）。
   */
  async readContentListLight(typeId: string, lang: string): Promise<ContentData[]> {
    const idx = await this.readContentIndex(typeId)
    if (idx?.byLang?.[lang]) {
      const list = Object.entries(idx.byLang[lang]).map(
        ([id, e]) =>
          ({
            id,
            title: e.title,
            status: e.status,
            publishedAt: e.publishedAt,
            _meta: { createdAt: e.createdAt },
          }) as ContentData,
      )
      list.sort((a, b) =>
        (b.publishedAt || b._meta?.createdAt || '').localeCompare(
          a.publishedAt || a._meta?.createdAt || '',
        ),
      )
      return list
    }
    // フォールバック: フル読込してインデックスを生成
    const items = await this.readContentList(typeId, lang)
    await this.rebuildContentIndexForLang(typeId, lang, items)
    return items
  }

  /** 指定タイプ・言語のフルデータからインデックスを作り直す（再構築・自己修復用） */
  async rebuildContentIndexForLang(
    typeId: string,
    lang: string,
    items?: ContentData[],
  ): Promise<ContentData[]> {
    const list = items || (await this.readContentList(typeId, lang))
    const idx = (await this.readContentIndex(typeId)) || { v: 1, byLang: {} }
    const byId: Record<string, LightEntry> = {}
    for (const item of list) byId[item.id] = this._toLight(item)
    idx.byLang[lang] = byId
    await this.writeJson(this._indexPath(typeId), idx)
    return list
  }

  /** 1件のインデックスエントリを追加・更新 */
  async upsertContentIndex(
    typeId: string,
    lang: string,
    id: string,
    item: ContentData,
  ): Promise<void> {
    const idx = (await this.readContentIndex(typeId)) || { v: 1, byLang: {} }
    if (!idx.byLang[lang]) idx.byLang[lang] = {}
    idx.byLang[lang][id] = this._toLight({ ...item, id })
    await this.writeJson(this._indexPath(typeId), idx)
  }

  /** 指定 id を全言語のインデックスから削除 */
  async removeFromContentIndex(typeId: string, id: string): Promise<void> {
    const idx = await this.readContentIndex(typeId)
    if (!idx) return
    let changed = false
    for (const lang of Object.keys(idx.byLang)) {
      if (idx.byLang[lang] && id in idx.byLang[lang]) {
        delete idx.byLang[lang][id]
        changed = true
      }
    }
    if (changed) await this.writeJson(this._indexPath(typeId), idx)
  }

  /** 1件のフルデータを読み込む（一覧クリック時に正確なデータで開くため） */
  async readContent(typeId: string, id: string, lang: string): Promise<ContentData | null> {
    const json = await this.readJson<Record<string, unknown>>(
      `content/${typeId}/${id}/${lang}.json`,
    )
    if (!json) return null
    const parsed = ContentDataSchema.safeParse({ ...json, id })
    return parsed.success ? parsed.data : null
  }

  /** フィールドグループ一覧を読み込み */
  async readFieldGroups(): Promise<FieldGroup[]> {
    const dir = await this.getDir('content/_fieldGroups')
    if (!dir) return []
    const entries = await collectEntries(dir)
    const groups: FieldGroup[] = []
    for (const [name, handle] of entries) {
      if (handle.kind === 'file' && name.endsWith('.json')) {
        try {
          const file = await (handle as FileSystemFileHandle).getFile()
          const text = await file.text()
          const parsed = FieldGroupSchema.safeParse(JSON.parse(text))
          if (parsed.success) groups.push(parsed.data)
        } catch {
          // skip
        }
      }
    }
    return groups.sort((a, b) => a.label.localeCompare(b.label))
  }

  /** 指定ディレクトリ直下のサブディレクトリ名一覧を返す（themes/ のテーマ列挙などに使用） */
  async listSubdirectories(path: string): Promise<string[]> {
    const dir = await this.getDir(path)
    if (!dir) return []
    const entries = await collectEntries(dir)
    return entries.filter(([, handle]) => handle.kind === 'directory').map(([name]) => name)
  }

  /** テンプレートファイル一覧を取得（baseDir 配下。既定はアクティブテーマのフォルダを渡す） */
  async readTemplateFiles(
    baseDir = 'templates',
  ): Promise<Array<{ name: string; path: string; isComponent: boolean }>> {
    const files: Array<{ name: string; path: string; isComponent: boolean }> = []
    const dir = await this.getDir(baseDir)
    if (!dir) return files

    const entries = await collectEntries(dir)
    for (const [name, handle] of entries) {
      if (handle.kind === 'file' && name.endsWith('.hbs')) {
        files.push({ name, path: `${baseDir}/${name}`, isComponent: false })
      } else if (handle.kind === 'directory' && name === '_components') {
        const compDir = handle as FileSystemDirectoryHandle
        const compEntries = await collectEntries(compDir)
        for (const [cname, chandle] of compEntries) {
          if (chandle.kind === 'file' && cname.endsWith('.hbs')) {
            files.push({
              name: cname,
              path: `${baseDir}/_components/${cname}`,
              isComponent: true,
            })
          }
        }
      }
    }

    // ルートファイルを先に、コンポーネントを後に
    files.sort((a, b) => {
      if (a.isComponent !== b.isComponent) return a.isComponent ? 1 : -1
      return a.name.localeCompare(b.name)
    })
    return files
  }
}
