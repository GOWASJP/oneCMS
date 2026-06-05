import type { CmsComponent } from './types.ts'
import { FileSystem } from '../fs.ts'
import { PATH_ASSETS_FILES, PATH_SITE_CONFIG } from '../constants.ts'
import {
  loadFaviconBlobUrl,
  applyFaviconLink,
  clearFaviconBlobUrl,
  loadAssetBlobUrl,
} from './dom.ts'

/** アップロードファイルの拡張子を判定（MIME タイプ優先、フォールバックでファイル名）。
 *  jpeg は jpg に正規化する。判定できなければ空文字を返す。 */
function detectAssetExt(
  file: File,
  mimeExtMap: Record<string, string>,
  filenameRe: RegExp,
): string {
  const byMime = mimeExtMap[file.type]
  if (byMime) return byMime
  const match = file.name.match(filenameRe)
  return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : ''
}

/** assets/files/ 配下の旧アセット（baseName.<ext>）を削除する。
 *  keepExt を渡すとその拡張子は残す（拡張子切替時の掃除に使用）。 */
async function removeOldAssetFiles(
  fs: FileSystem,
  baseName: string,
  exts: string[],
  keepExt?: string,
): Promise<void> {
  const filesDir = await fs.getDir(PATH_ASSETS_FILES)
  if (!filesDir) return
  for (const ext of exts) {
    if (ext === keepExt) continue
    try {
      await filesDir.removeEntry(`${baseName}.${ext}`)
    } catch {
      /* 存在しなければ無視 */
    }
  }
}

const FAVICON_EXTS = ['ico', 'png', 'svg', 'webp']
const LOGO_EXTS = ['png', 'svg', 'webp', 'jpg']

/** ファビコン・サイトロゴのアップロード／削除を担うミックスイン。 */
export const assetsMixin: Partial<CmsComponent> & ThisType<CmsComponent> = {
  /** ファビコンアップロード: assets/files/favicon.<ext> に保存し、siteConfig.favicon にパスを記録 */
  async handleFaviconUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !this.fs) return
    const ext = detectAssetExt(
      file,
      {
        'image/x-icon': 'ico',
        'image/vnd.microsoft.icon': 'ico',
        'image/png': 'png',
        'image/svg+xml': 'svg',
        'image/webp': 'webp',
      },
      /\.(ico|png|svg|webp)$/i,
    )
    if (!ext) {
      this.showToast(this.t('toast.faviconFormat'), 5000)
      input.value = ''
      return
    }
    try {
      // 古い拡張子のファビコンが残っていたら削除（拡張子切替時）
      await removeOldAssetFiles(this.fs, 'favicon', FAVICON_EXTS, ext)
      const buffer = await file.arrayBuffer()
      const path = `${PATH_ASSETS_FILES}/favicon.${ext}`
      await this.fs.writeBlob(path, new Blob([buffer]))
      this.siteConfig.favicon = `/${path}`
      await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
      this.faviconBlobUrl = await loadFaviconBlobUrl(this.fs, this.siteConfig.favicon)
      applyFaviconLink(this.faviconBlobUrl)
      this.showToast(this.t('toast.faviconUploaded'))
    } catch (e) {
      console.error('ファビコンアップロードエラー:', e)
      this.showToast(this.t('toast.faviconFailed'))
    } finally {
      input.value = ''
    }
  },

  /** ファビコン削除 */
  async removeFavicon() {
    if (!this.fs) return
    if (!(await this.showConfirm(this.t('confirm.removeFavicon')))) return
    await removeOldAssetFiles(this.fs, 'favicon', FAVICON_EXTS)
    delete (this.siteConfig as { favicon?: string }).favicon
    await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
    clearFaviconBlobUrl()
    this.faviconBlobUrl = ''
    applyFaviconLink('')
    this.showToast(this.t('toast.faviconRemoved'))
  },

  /** サイトロゴアップロード: assets/files/logo.<ext> に保存し、siteConfig.logo にパスを記録 */
  async handleLogoUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !this.fs) return
    const ext = detectAssetExt(
      file,
      {
        'image/png': 'png',
        'image/svg+xml': 'svg',
        'image/webp': 'webp',
        'image/jpeg': 'jpg',
      },
      /\.(png|svg|webp|jpe?g)$/i,
    )
    if (!ext) {
      this.showToast(this.t('toast.logoFormat'), 5000)
      input.value = ''
      return
    }
    try {
      // 古い拡張子のロゴが残っていたら削除（拡張子切替時）
      await removeOldAssetFiles(this.fs, 'logo', LOGO_EXTS, ext)
      const buffer = await file.arrayBuffer()
      const path = `${PATH_ASSETS_FILES}/logo.${ext}`
      await this.fs.writeBlob(path, new Blob([buffer]))
      this.siteConfig.logo = `/${path}`
      await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
      this.logoBlobUrl = await loadAssetBlobUrl(this.fs, this.siteConfig.logo)
      this.showToast(this.t('toast.logoUploaded'))
    } catch (e) {
      console.error('ロゴアップロードエラー:', e)
      this.showToast(this.t('toast.logoFailed'))
    } finally {
      input.value = ''
    }
  },

  /** ロゴ削除 */
  async removeLogo() {
    if (!this.fs) return
    if (!(await this.showConfirm(this.t('confirm.removeLogo')))) return
    await removeOldAssetFiles(this.fs, 'logo', LOGO_EXTS)
    delete (this.siteConfig as { logo?: string }).logo
    await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
    if (this.logoBlobUrl) URL.revokeObjectURL(this.logoBlobUrl)
    this.logoBlobUrl = ''
    this.showToast(this.t('toast.logoRemoved'))
  },

  /** OGP画像アップロード: assets/files/ogp.<ext> に保存し、siteConfig.ogImage にパスを記録 */
  async handleOgImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !this.fs) return
    const ext = detectAssetExt(
      file,
      {
        'image/png': 'png',
        'image/svg+xml': 'svg',
        'image/webp': 'webp',
        'image/jpeg': 'jpg',
      },
      /\.(png|svg|webp|jpe?g)$/i,
    )
    if (!ext) {
      this.showToast(this.t('toast.ogImageFormat'), 5000)
      input.value = ''
      return
    }
    try {
      // 古い拡張子の OGP が残っていたら削除（拡張子切替時）
      await removeOldAssetFiles(this.fs, 'ogp', LOGO_EXTS, ext)
      const buffer = await file.arrayBuffer()
      const path = `${PATH_ASSETS_FILES}/ogp.${ext}`
      await this.fs.writeBlob(path, new Blob([buffer]))
      this.siteConfig.ogImage = `/${path}`
      await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
      if (this.ogImageBlobUrl) URL.revokeObjectURL(this.ogImageBlobUrl)
      this.ogImageBlobUrl = await loadAssetBlobUrl(this.fs, this.siteConfig.ogImage)
      this.showToast(this.t('toast.ogImageUploaded'))
    } catch (e) {
      console.error('OGP画像アップロードエラー:', e)
      this.showToast(this.t('toast.ogImageFailed'))
    } finally {
      input.value = ''
    }
  },

  /** OGP画像削除 */
  async removeOgImage() {
    if (!this.fs) return
    if (!(await this.showConfirm(this.t('confirm.removeOgImage')))) return
    await removeOldAssetFiles(this.fs, 'ogp', LOGO_EXTS)
    delete (this.siteConfig as { ogImage?: string }).ogImage
    await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
    if (this.ogImageBlobUrl) URL.revokeObjectURL(this.ogImageBlobUrl)
    this.ogImageBlobUrl = ''
    this.showToast(this.t('toast.ogImageRemoved'))
  },
}
