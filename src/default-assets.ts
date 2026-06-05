/**
 * アプリ同梱のデフォルトブランド素材（ファビコン・ロゴ・OGP画像）。
 *
 * Vite の asset import で取り込む。dev では URL、ビルド時は vite-plugin-singlefile が
 * base64 data URI としてインライン化する（どちらも fetch() で Blob 化できる）。
 * 新規プロジェクト作成時、および既存プロジェクトの空欄をデフォルトで補完する際に
 * プロジェクトの assets/files/ へ書き出す（src/cms/setup.ts の ensureDefaultBranding）。
 */
import faviconUrl from './assets/defaults/favicon.png'
import logoUrl from './assets/defaults/logo.png'
import ogpUrl from './assets/defaults/ogp.png'

/** siteConfig のフィールド名 → 既定アセットの取得元 URL と保存先パス */
export interface DefaultAsset {
  /** バンドルされた素材の URL（dev は実URL、prod は data URI） */
  url: string
  /** プロジェクト内の保存先（site.json には先頭 / 付きで記録する） */
  path: string
}

export const DEFAULT_ASSETS: Record<'favicon' | 'logo' | 'ogImage', DefaultAsset> = {
  favicon: { url: faviconUrl, path: 'assets/files/favicon.png' },
  logo: { url: logoUrl, path: 'assets/files/logo.png' },
  ogImage: { url: ogpUrl, path: 'assets/files/ogp.png' },
}

/** バンドル素材 URL を取得して Blob に変換する */
export async function fetchDefaultAssetBlob(asset: DefaultAsset): Promise<Blob> {
  const res = await fetch(asset.url)
  return res.blob()
}
