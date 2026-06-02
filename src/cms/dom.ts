import { createIcons } from 'lucide'
import * as icons from '../icons.ts'
import tailwindBrowserJs from '@tailwindcss/browser?raw'
import alpineJs from 'alpinejs/dist/cdn.min.js?raw'
import type { FileSystem } from '../fs.ts'
import { STORAGE_THEME_KEY, type ThemeMode } from '../constants.ts'

let iconTimer: number | null = null
export function refreshIcons(): void {
  if (iconTimer) return
  iconTimer = requestAnimationFrame(() => {
    createIcons({ icons, nameAttr: 'data-lucide' })
    iconTimer = null
  })
}

/** Alpine.jsコンポーネントの型 */

/** 翻訳ステータスバッジ用の static SVG（Lucide のアイコンデータから抽出したパス） */
export const LANG_STATUS_ICONS: Record<string, string> = {
  current:
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>',
  translated:
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  draft:
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  missing:
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
}

/** html[data-theme] 属性を適切に設定してテーマを反映 */
export function applyTheme(mode: ThemeMode): void {
  const effective =
    mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode
  document.documentElement.setAttribute('data-theme', effective)
}

// Alpine 初期化前にフラッシュを避けるため、即座にテーマを適用する
;(function preApplyTheme() {
  const saved = (localStorage.getItem(STORAGE_THEME_KEY) as ThemeMode | null) || 'system'
  applyTheme(saved)
})()

/** ファビコンを Blob URL として読み込み、管理画面タブと設定プレビューの両方を更新 */
let currentFaviconBlobUrl: string | null = null
export async function loadFaviconBlobUrl(
  fs: FileSystem | null,
  faviconPath: string | undefined,
): Promise<string> {
  if (!fs || !faviconPath) return ''
  const normalized = faviconPath.replace(/^\//, '')
  const blob = await fs.readBlob(normalized)
  if (!blob) return ''
  if (currentFaviconBlobUrl) URL.revokeObjectURL(currentFaviconBlobUrl)
  currentFaviconBlobUrl = URL.createObjectURL(blob)
  return currentFaviconBlobUrl
}

export function applyFaviconLink(blobUrl: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!blobUrl) {
    if (link) link.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = blobUrl
}

export function clearFaviconBlobUrl(): void {
  if (currentFaviconBlobUrl) {
    URL.revokeObjectURL(currentFaviconBlobUrl)
    currentFaviconBlobUrl = null
  }
}

/** 任意のサイト相対パス（/assets/files/xxx.png 等）を File System API で読んで Blob URL を返す */
export async function loadAssetBlobUrl(
  fs: FileSystem | null,
  assetPath: string | undefined,
): Promise<string> {
  if (!fs || !assetPath) return ''
  const normalized = assetPath.replace(/^\//, '')
  const blob = await fs.readBlob(normalized)
  if (!blob) return ''
  return URL.createObjectURL(blob)
}

/** プレビュー HTML に Tailwind CSS v4 ブラウザランタイムを注入する。
 *  </head> の直前に <script> として挿入し、DOM に書かれている Tailwind
 *  クラスを実行時にスキャンして CSS を生成させる。
 */
/** Tailwind 4 ランタイムを Blob URL 経由で注入。インライン <script> だと
 *  JS 内の </ パターンが HTML パーサーと干渉するため、外部スクリプト参照にする。
 */
export function injectTailwindRuntime(html: string): string {
  if (!tailwindBlobUrl) {
    const blob = new Blob([tailwindBrowserJs], { type: 'text/javascript' })
    tailwindBlobUrl = URL.createObjectURL(blob)
  }
  const scriptTag = `<script src="${tailwindBlobUrl}"></script>`
  if (html.includes('</head>')) {
    return html.replace('</head>', `${scriptTag}\n</head>`)
  }
  return scriptTag + html
}
let tailwindBlobUrl: string | null = null

/** Alpine.js を Blob URL 経由で注入（公開サイトとプレビューの両方で使用） */
let alpineBlobUrl: string | null = null
export function injectAlpineRuntime(html: string): string {
  if (!alpineBlobUrl) {
    const blob = new Blob([alpineJs], { type: 'text/javascript' })
    alpineBlobUrl = URL.createObjectURL(blob)
  }
  const scriptTag = `<script src="${alpineBlobUrl}" defer></script>`
  if (html.includes('</head>')) {
    return html.replace('</head>', `${scriptTag}\n</head>`)
  }
  return scriptTag + html
}

/** プレビュー用に作成された Blob URL のリスト（再生成時に revoke する） */
const previewBlobUrls: string[] = []

export function revokePreviewBlobUrls(): void {
  while (previewBlobUrls.length) {
    const url = previewBlobUrls.pop()
    if (url) URL.revokeObjectURL(url)
  }
}

/** プレビュー HTML 内の /assets/... 参照を File System API 経由で読んだ
 *  Blob URL に書き換える。iframe (srcdoc) の中では User の content フォルダを
 *  HTTP 経由で解決できないため、メモリ上の Blob URL を埋め込む必要がある。
 */
export async function rewriteAssetUrlsToBlob(html: string, fs: FileSystem | null): Promise<string> {
  if (!fs || !html) return html
  // src="..." / href="..." / url(...) / srcset="..." 内の /assets/... を抽出
  const pathSet = new Set<string>()
  const attrRe = /(?:src|href)=(["'])(\/assets\/[^"']+)\1/g
  const cssUrlRe = /url\((['"]?)(\/assets\/[^'")\s]+)\1\)/g
  const srcsetRe = /srcset=(["'])([^"']*\/assets\/[^"']+)\1/g
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(html))) pathSet.add(m[2])
  while ((m = cssUrlRe.exec(html))) pathSet.add(m[2])
  // srcset は複数 URL カンマ区切り
  while ((m = srcsetRe.exec(html))) {
    const urls = m[2].split(',').map((s) => s.trim().split(/\s+/)[0])
    for (const u of urls) {
      if (u.startsWith('/assets/')) pathSet.add(u)
    }
  }

  const blobUrlMap = new Map<string, string>()
  for (const path of pathSet) {
    const normalized = path.replace(/^\//, '')
    const blob = await fs.readBlob(normalized)
    if (blob) {
      const blobUrl = URL.createObjectURL(blob)
      previewBlobUrls.push(blobUrl)
      blobUrlMap.set(path, blobUrl)
    }
  }

  let result = html
  for (const [path, blobUrl] of blobUrlMap) {
    // グローバル置換（同じパスが複数箇所に出ても全部置換）
    result = result.split(path).join(blobUrl)
  }
  return result
}

export async function hasFile(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name)
    return true
  } catch {
    return false
  }
}

export async function hasDir(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getDirectoryHandle(name)
    return true
  } catch {
    return false
  }
}

export function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}
