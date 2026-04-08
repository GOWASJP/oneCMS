import type { FileSystem } from './fs.ts'
import type { ImageOptions, ImageSaveResult } from './types.ts'
import {
  IMAGE_MAX_WIDTH,
  IMAGE_QUALITY,
  IMAGE_FORMAT,
  PATH_ASSETS_ORIGINALS,
  PATH_ASSETS_IMAGES,
} from './constants.ts'

const DEFAULTS: Required<ImageOptions> = {
  maxWidth: IMAGE_MAX_WIDTH,
  quality: IMAGE_QUALITY,
  format: IMAGE_FORMAT,
}

interface OptimizeResult {
  blob: Blob
  filename: string
  original: File
  width: number
  height: number
}

/** 画像ファイルを最適化 */
export async function optimizeImage(
  file: File,
  options: ImageOptions = {},
): Promise<OptimizeResult> {
  const opts = { ...DEFAULTS, ...options }

  const bitmap = await createImageBitmap(file)

  let { width, height } = bitmap
  if (width > opts.maxWidth) {
    height = Math.round(height * (opts.maxWidth / width))
    width = opts.maxWidth
  }

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await canvas.convertToBlob({
    type: opts.format,
    quality: opts.quality,
  })

  const baseName = file.name.replace(/\.[^.]+$/, '')
  const ext = opts.format === 'image/webp' ? 'webp' : 'png'
  const filename = `${baseName}.${ext}`

  return { blob, filename, original: file, width, height }
}

/** 画像をCMSに保存（最適化 + 元画像バックアップ） */
export async function saveImage(
  fs: FileSystem,
  file: File,
  options: ImageOptions = {},
): Promise<ImageSaveResult> {
  const originalBuffer = await file.arrayBuffer()
  await fs.writeBlob(`${PATH_ASSETS_ORIGINALS}/${file.name}`, new Blob([originalBuffer]))

  const result = await optimizeImage(file, options)

  const savePath = `${PATH_ASSETS_IMAGES}/${result.filename}`
  await fs.writeBlob(savePath, result.blob)

  const dataUrl = await blobToDataUrl(result.blob)

  return {
    path: savePath,
    filename: result.filename,
    width: result.width,
    height: result.height,
    size: result.blob.size,
    originalSize: file.size,
    blobUrl: dataUrl,
  }
}

/** BlobをBase64 Data URLに変換 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
