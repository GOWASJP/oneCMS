import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import ImageTool from '@editorjs/image'
import Quote from '@editorjs/quote'
import CodeTool from '@editorjs/code'
import Delimiter from '@editorjs/delimiter'
import Table from '@editorjs/table'
import InlineCode from '@editorjs/inline-code'
import LinkTool from '@editorjs/link'
import Embed from '@editorjs/embed'

import type { FileSystem } from './fs.ts'
import { saveImage } from './image.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface EditorData {
  time?: number
  blocks: any[]
  version?: string
}

/** Data URL → 実パス のマッピング */
const imageUrlMap = new Map<string, string>()

/** マッピングを取得 */
export function getImageUrlMap(): Map<string, string> {
  return imageUrlMap
}

/**
 * Editor.js インスタンスを生成
 */
export function createEditor(
  holderId: string,
  data: EditorData | null,
  fs: FileSystem | null,
): EditorJS {
  return new EditorJS({
    holder: holderId,
    placeholder: '/ でメニューを開く、またはテキストを入力...',
    data: data || undefined,
    inlineToolbar: ['bold', 'italic', 'inlineCode', 'link'],
    tools: {
      header: {
        class: Header as any,
        config: {
          levels: [2, 3, 4],
          defaultLevel: 2,
        },
        inlineToolbar: true,
      },
      list: {
        class: List as any,
        inlineToolbar: true,
      },
      image: {
        class: ImageTool,
        config: {
          // File System Access API 経由でアップロード
          uploader: {
            async uploadByFile(file: File) {
              if (!fs) {
                return { success: 0, file: { url: '' } }
              }
              try {
                const result = await saveImage(fs, file)
                const displayUrl = result.blobUrl || `/${result.path}`
                // Data URL → 実パス のマッピングを記録
                imageUrlMap.set(displayUrl, `/${result.path}`)
                return {
                  success: 1,
                  file: {
                    url: displayUrl,
                    width: result.width,
                    height: result.height,
                  },
                }
              } catch (e) {
                console.error('画像アップロードエラー:', e)
                return { success: 0, file: { url: '' } }
              }
            },
            async uploadByUrl(url: string) {
              return {
                success: 1,
                file: { url },
              }
            },
          },
        },
      },
      quote: {
        class: Quote,
        inlineToolbar: true,
      },
      code: CodeTool,
      delimiter: Delimiter,
      table: {
        class: Table as any,
        inlineToolbar: true,
      },
      inlineCode: InlineCode,
      linkTool: LinkTool,
      embed: {
        class: Embed,
        config: {
          services: {
            youtube: true,
            vimeo: true,
          },
        },
      },
    },
  })
}

/**
 * Editor.js JSON → HTML 変換
 */
export function editorJsonToHtml(data: EditorData): string {
  if (!data || !data.blocks) return ''

  return data.blocks
    .map((block) => {
      switch (block.type) {
        case 'header':
          return `<h${block.data.level}>${block.data.text}</h${block.data.level}>`

        case 'paragraph':
          return `<p>${block.data.text}</p>`

        case 'list': {
          const tag = block.data.style === 'ordered' ? 'ol' : 'ul'
          const renderItems = (items: any[]): string => {
            return items
              .map((i) => {
                // v2形式: {content, items} / v1形式: string
                const text = typeof i === 'string' ? i : i.content || ''
                const nested =
                  typeof i === 'object' && i.items?.length
                    ? `<${tag}>${renderItems(i.items)}</${tag}>`
                    : ''
                return `<li>${text}${nested}</li>`
              })
              .join('')
          }
          return `<${tag}>${renderItems(block.data.items)}</${tag}>`
        }

        case 'image': {
          const caption = block.data.caption ? `<figcaption>${block.data.caption}</figcaption>` : ''
          const cls = block.data.withBorder ? ' class="img-border"' : ''
          const rawUrl = block.data.file?.url || ''
          // Data URL/BlobURLを実パスに変換
          const imgUrl = imageUrlMap.get(rawUrl) || rawUrl
          return `<figure${cls}><img src="${imgUrl}" alt="${block.data.caption || ''}" />${caption}</figure>`
        }

        case 'quote':
          return `<blockquote><p>${block.data.text}</p>${block.data.caption ? `<cite>${block.data.caption}</cite>` : ''}</blockquote>`

        case 'code':
          return `<pre><code>${escapeHtml(block.data.code)}</code></pre>`

        case 'delimiter':
          return '<hr />'

        case 'table': {
          const rows = (block.data.content as string[][])
            .map((row, i) => {
              const tag = block.data.withHeadings && i === 0 ? 'th' : 'td'
              return `<tr>${row.map((cell) => `<${tag}>${cell}</${tag}>`).join('')}</tr>`
            })
            .join('')
          return `<table>${rows}</table>`
        }

        case 'embed':
          return `<div class="embed"><iframe src="${block.data.embed}" frameborder="0" allowfullscreen></iframe></div>`

        default:
          return ''
      }
    })
    .join('\n')
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * 既存のHTML bodyをEditor.js JSONに変換（移行用）
 */
export function htmlToEditorJson(html: string): EditorData {
  if (!html || html.trim() === '') {
    return { blocks: [] }
  }

  // HTMLをパースしてブロックに変換
  const div = document.createElement('div')
  div.innerHTML = html
  const blocks: any[] = []

  for (const node of div.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) blocks.push({ type: 'paragraph', data: { text } })
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue

    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      blocks.push({
        type: 'header',
        data: { text: el.innerHTML, level: parseInt(tag[1]) },
      })
    } else if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(el.querySelectorAll('li')).map((li) => li.innerHTML)
      blocks.push({
        type: 'list',
        data: { style: tag === 'ol' ? 'ordered' : 'unordered', items },
      })
    } else if (tag === 'blockquote') {
      blocks.push({
        type: 'quote',
        data: { text: el.innerHTML, caption: '' },
      })
    } else if (tag === 'pre') {
      blocks.push({
        type: 'code',
        data: { code: el.textContent || '' },
      })
    } else if (tag === 'hr') {
      blocks.push({ type: 'delimiter', data: {} })
    } else if (tag === 'figure' || tag === 'img') {
      const img = tag === 'img' ? el : el.querySelector('img')
      if (img) {
        blocks.push({
          type: 'image',
          data: {
            file: { url: img.getAttribute('src') || '' },
            caption: el.querySelector('figcaption')?.textContent || '',
          },
        })
      }
    } else {
      // p, div, etc.
      blocks.push({ type: 'paragraph', data: { text: el.innerHTML } })
    }
  }

  return { blocks }
}
