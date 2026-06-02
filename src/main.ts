// Inter フォントを self-host（Latin サブセットのみでバンドルサイズを抑制）
// 日本語は font-family スタックのシステムフォント（Hiragino / Yu Gothic / Noto Sans JP）にフォールバック
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'

import Alpine from 'alpinejs'

import { APP_NAME } from './constants.ts'
import type { CmsComponent } from './cms/types.ts'
import { createInitialState } from './cms/state.ts'
import { coreMixin } from './cms/core.ts'
import { contentMixin } from './cms/content.ts'
import { contentTypesMixin } from './cms/content-types.ts'
import { structureMixin } from './cms/structure.ts'
import { outputMixin } from './cms/output.ts'
import { refreshIcons } from './cms/dom.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Alpine global
;(window as any).Alpine = Alpine

// CMS コンポーネント本体。状態（state）と各ドメインの振る舞い（mixin）を合成して構築する。
// 個々のメソッドは src/cms/ 配下のモジュールに分割されている。
Alpine.data('cms', () => {
  const component: CmsComponent & ThisType<CmsComponent> = {
    ...createInitialState(),
    ...coreMixin,
    ...contentMixin,
    ...contentTypesMixin,
    ...structureMixin,
    ...outputMixin,

    get viewTitle(): string {
      if (this.view === 'page-edit' && this.currentPage)
        return this.currentPage.title || this.currentPage.id
      if (this.view === 'content-edit' && this.currentPage)
        return this.currentPage.title || '新規作成'
      if (this.view === 'content-list' && this.currentType) return this.currentType.label
      if (this.view === 'page-list') return 'ページ'
      if (this.view === 'site-info') return 'サイト情報'
      if (this.view === 'settings') return '設定'
      if (this.view === 'templates') return 'テンプレート'
      if (this.view === 'field-groups') return 'フィールド'
      if (this.view === 'taxonomy-categories') return 'カテゴリ'
      if (this.view === 'taxonomy-tags') return 'タグ'
      if (this.view === 'export-result') return '書き出し 完了'
      return APP_NAME
    },
  } as CmsComponent & ThisType<CmsComponent>

  return component as any
})

Alpine.start()

// Lucideアイコン：初期化 + DOM変更監視
document.addEventListener('alpine:initialized', () => {
  refreshIcons()
})
const observer = new MutationObserver((mutations) => {
  const hasNewIcons = mutations.some((m) =>
    [...m.addedNodes].some(
      (n) =>
        n.nodeType === 1 &&
        ((n as Element).matches?.('[data-lucide]') ||
          (n as Element).querySelector?.('[data-lucide]')),
    ),
  )
  if (hasNewIcons) refreshIcons()
})
observer.observe(document.body, { childList: true, subtree: true })
