import { STORAGE_DB_NAME, STORAGE_HANDLE_KEY } from './constants.ts'

/**
 * IndexedDB にFileSystemDirectoryHandleを保存・復元する
 */

const STORE_NAME = 'handles'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(STORAGE_DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** フォルダハンドルをIndexedDBに保存 */
export async function saveFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, STORAGE_HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** 保存済みフォルダハンドルを復元（権限再取得含む） */
export async function restoreFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB()
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(STORAGE_HANDLE_KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })

    if (!handle) return null

    const perm = await handle.requestPermission({ mode: 'readwrite' })
    if (perm === 'granted') return handle

    return null
  } catch {
    return null
  }
}
