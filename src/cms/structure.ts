/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CmsComponent } from './types.ts'
import { type ContentData, type MenuData } from '../types.ts'
import {
  PATH_LANGUAGES,
  PATH_MENUS,
  PATH_TAXONOMIES_CATEGORIES,
  PATH_TAXONOMIES_TAGS,
} from '../constants.ts'
import { LANG_STATUS_ICONS } from './dom.ts'

export const structureMixin: Partial<CmsComponent> & ThisType<CmsComponent> = {
  // --- 多言語 ---

  /** 言語切替（現在の編集を保存してから切替） */
  async switchLang(lang: string) {
    if (!this.fs || lang === this.currentLang) return

    // 現在の編集内容を自動保存（dirty 時のみ）
    if (
      this.isDirty &&
      this.editor &&
      (this.view === 'page-edit' || this.view === 'content-edit')
    ) {
      await this.savePage()
    }

    this.currentLang = lang
    this.pages = await this.fs.readPages(lang)

    if (this.currentType) {
      this.contentItems = await this.fs.readContentListLight(this.currentType.id, lang)
      this.contentPage = 1
    }

    // 現在開いているページを切替先言語で再読み込み
    if (this.currentPage && this.view === 'page-edit') {
      const page = this.pages.find((p) => p.id === this.currentPage?.id)
      if (page) {
        await this.openPage(page)
      } else {
        // この言語にはまだページが無い
        this.suppressDirty = true
        this.editData = { id: this.currentPage.id, title: '', body: '', status: 'draft' }
        this.initEditor('')
        this.$nextTick(() => {
          this.resetDirty()
          this.suppressDirty = false
        })
      }
    } else if (this.currentPage && this.view === 'content-edit' && this.currentType) {
      const item = this.contentItems.find((i) => i.id === this.currentPage?.id)
      if (item) {
        await this.openContent(item)
      } else {
        this.suppressDirty = true
        this.editData = { id: this.currentPage.id, title: '', body: '', status: 'draft' }
        this.$nextTick(() => {
          this.resetDirty()
          this.suppressDirty = false
        })
      }
    }

    await this.refreshTranslationStatus()
  },

  /** 他言語のコンテンツをコピー */
  async copyFromLang(sourceLang: string) {
    if (!this.fs || !this.currentPage) return

    const pageId = this.currentPage.id
    const sourceData: ContentData | null = this.currentType
      ? (await this.fs.readContentList(this.currentType.id, sourceLang)).find(
          (i) => i.id === pageId,
        ) || null
      : (await this.fs.readPages(sourceLang)).find((p) => p.id === pageId) || null

    if (!sourceData) {
      this.showToast(`${sourceLang} のデータが見つかりません`)
      return
    }

    this.suppressDirty = true
    this.editData = {
      ...sourceData,
      id: pageId,
      _meta: {
        ...sourceData._meta,
        status: 'draft',
        basedOn: sourceLang,
        basedOnUpdated: sourceData._meta?.updatedAt || '',
        updatedAt: new Date().toISOString().split('T')[0],
        author: this.authorName,
      },
    }
    this.initEditor((sourceData as any)._editorJson || sourceData.body || '')
    this.$nextTick(() => {
      this.suppressDirty = false
      this.markDirty()
    })
    this.showToast(`${sourceLang} の内容をコピーしました`)
  },

  /** 翻訳ステータスを取得・更新
   *  missing:    その言語のファイル自体が無い
   *  translated: 公開済み（status === 'published'）
   *  draft:      ファイルはあるが公開されていない
   */
  async getTranslationStatus(): Promise<Array<{ code: string; flag: string; status: string }>> {
    if (!this.fs || !this.currentPage) return []

    const pageId = this.currentPage.id
    const statuses: Array<{ code: string; flag: string; status: string }> = []

    for (const locale of this.languages.locales) {
      const data: ContentData | null = this.currentType
        ? (await this.fs.readContentList(this.currentType.id, locale.code)).find(
            (i) => i.id === pageId,
          ) || null
        : (await this.fs.readPages(locale.code)).find((p) => p.id === pageId) || null

      let status: 'missing' | 'translated' | 'draft' = 'missing'
      if (data) {
        status = data.status === 'published' ? 'translated' : 'draft'
      }

      statuses.push({ code: locale.code, flag: locale.flag, status })
    }
    return statuses
  },

  async refreshTranslationStatus() {
    this.translationStatuses = await this.getTranslationStatus()
  },

  /** 翻訳ステータス用アイコンを static SVG 文字列で返す（Lucide 変換を介さないため Alpine 再レンダリングで増殖しない） */
  langStatusIconSvg(ts: { code: string; status: string }): string {
    const status = ts.code === this.currentLang ? 'current' : ts.status
    return LANG_STATUS_ICONS[status] || ''
  },

  // --- メニュー管理 ---

  async loadMenus() {
    if (!this.fs) return
    const data = await this.fs.readJson<MenuData>(PATH_MENUS)
    this.menuData = data || { menus: [] }
    if (this.menuData.menus.length && !this.currentMenuId) {
      this.selectMenu(this.menuData.menus[0].id)
    }
    this.view = 'menus'
    this.updateHash()
  },

  selectMenu(id: string) {
    this.currentMenuId = id
    this.currentMenu = this.menuData.menus.find((m) => m.id === id) || null
  },

  async addMenu() {
    const name = await this.showPrompt('メニュー名')
    if (!name?.trim()) return
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    // 英数字がない場合（日本語名等）は連番IDを生成
    const existingIds = new Set(this.menuData.menus.map((m) => m.id))
    let id = slug
    if (!id) {
      let n = 1
      while (existingIds.has(`menu-${n}`)) n++
      id = `menu-${n}`
    }
    const menu = { id, name: name.trim(), items: [] }
    this.menuData.menus.push(menu)
    this.selectMenu(id)
  },

  async deleteMenu() {
    if (!this.currentMenu) return
    if (!(await this.showConfirm(`「${this.currentMenu.name}」を削除しますか？`))) return
    this.menuData.menus = this.menuData.menus.filter((m) => m.id !== this.currentMenuId)
    this.currentMenu = null
    this.currentMenuId = ''
    if (this.menuData.menus.length) this.selectMenu(this.menuData.menus[0].id)
  },

  addMenuItem(type: string, label?: string, url?: string, object?: string) {
    if (!this.currentMenu) return
    const id = String(Date.now())
    const itemLabel = label || '新規項目'
    this.currentMenu.items.push({
      id,
      label: itemLabel,
      type,
      url: url || '',
      object: object || '',
      target: '',
      parent: '',
      order: this.currentMenu.items.length,
    })
    this.showToast(`「${itemLabel}」を追加しました`)
  },

  async removeMenuItem(idx: number) {
    if (!this.currentMenu) return
    const removed = this.currentMenu.items[idx]
    if (!(await this.showConfirm(`「${removed.label || '項目'}」を削除しますか？`))) return
    // 子項目の親をクリア
    for (const item of this.currentMenu.items) {
      if (item.parent === removed.id) item.parent = removed.parent || ''
    }
    this.currentMenu.items.splice(idx, 1)
  },

  moveMenuItem(idx: number, dir: number) {
    if (!this.currentMenu) return
    const items = this.currentMenu.items
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= items.length) return
    const [moved] = items.splice(idx, 1)
    items.splice(newIdx, 0, moved)
  },

  setItemParent(idx: number, parentId: string) {
    if (!this.currentMenu) return
    this.currentMenu.items[idx].parent = parentId
  },

  async saveMenus() {
    if (!this.fs) return
    // orderを再計算
    for (const menu of this.menuData.menus) {
      menu.items.forEach((item, i) => {
        item.order = i
      })
    }
    await this.fs.writeJson(PATH_MENUS, this.menuData)
    this.showToast('メニューを保存しました')
  },

  // --- タクソノミー管理 ---

  async loadTaxonomies() {
    if (!this.fs) return
    const cats = await this.fs.readJson<{ items: Array<{ id: string; label: string }> }>(
      PATH_TAXONOMIES_CATEGORIES,
    )
    const tags = await this.fs.readJson<{ items: Array<{ id: string; label: string }> }>(
      PATH_TAXONOMIES_TAGS,
    )
    this.taxonomyData = {
      categories: cats?.items || [],
      tags: tags?.items || [],
    }
  },

  async loadTaxonomy(type: 'categories' | 'tags') {
    await this.loadTaxonomies()
    this.currentTaxonomyType = type
    this.view = `taxonomy-${type}`
    this.updateHash()
  },

  async saveTaxonomies() {
    if (!this.fs) return
    await this.fs.writeJson(PATH_TAXONOMIES_CATEGORIES, {
      id: 'categories',
      label: 'カテゴリ',
      items: this.taxonomyData.categories,
    })
    await this.fs.writeJson(PATH_TAXONOMIES_TAGS, {
      id: 'tags',
      label: 'タグ',
      items: this.taxonomyData.tags,
    })
    this.availableCategories = this.taxonomyData.categories
    this.availableTags = this.taxonomyData.tags
    this.showToast('カテゴリ・タグを保存しました')
  },

  // --- 言語設定 ---

  loadLangEditor() {
    this.langEditorData = JSON.parse(JSON.stringify(this.languages))
    this.showLangEditor = true
  },

  addLangLocale() {
    this.langEditorData.locales.push({ code: '', label: '', flag: '' })
  },

  removeLangLocale(idx: number) {
    this.langEditorData.locales.splice(idx, 1)
  },

  async saveLangConfig() {
    if (!this.fs) return
    await this.fs.writeJson(PATH_LANGUAGES, this.langEditorData)
    this.languages = JSON.parse(JSON.stringify(this.langEditorData))
    this.showLangEditor = false
    this.showToast('言語設定を保存しました')
  },
}
