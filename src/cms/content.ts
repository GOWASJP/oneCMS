/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CmsComponent } from './types.ts'
import { type ContentData, type ContentType } from '../types.ts'
import { createEditor, editorJsonToHtml, htmlToEditorJson, type EditorData } from '../editor.ts'
import { saveImage } from '../image.ts'
import { PATH_PAGES_CONFIG, PATH_ASSETS_FILES } from '../constants.ts'

export const contentMixin: Partial<CmsComponent> & ThisType<CmsComponent> = {
  // --- 固定ページ ---

  createPage() {
    this.editingPageId = ''
    this.editingPageTitle = ''
    this.showPageCreator = true
  },

  confirmCreatePage() {
    const slug = (this.editingPageId || this.editingPageTitle)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
    if (!slug) return
    this.showPageCreator = false
    const page: ContentData = {
      id: slug,
      title: this.editingPageTitle || slug,
      status: 'draft',
      body: '',
      _meta: {
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        author: this.authorName,
      },
    }
    this.suppressDirty = true
    this.currentPage = page
    this.currentType = null
    this.currentFields = this.resolveFields(this.pagesConfig?.fieldGroupIds, [])
    this.showRevisionPanel = false
    this.showPreviewPanel = false
    this.view = 'page-edit'
    this.editData = { ...page }
    if (this.pagesConfig?.hasBody !== false) {
      this.initEditor('')
    }
    this.updateHash()
    this.$nextTick(() => {
      this.resetDirty()
      this.suppressDirty = false
    })
  },

  async loadPageList() {
    if (!this.fs) return
    this.pages = await this.fs.readPages(this.currentLang)
    this.currentPage = null
    this.currentType = null
    this.view = 'page-list'
    this.updateHash()
  },

  /** トップページ（content/pages/index/{lang}.json）を直接編集モードで開く */
  async openHomePage() {
    if (!this.fs) return
    this.pages = await this.fs.readPages(this.currentLang)
    let home = this.pages.find((p) => p.id === 'index')
    if (!home) {
      home = {
        id: 'index',
        title: 'トップページ',
        body: '',
        status: 'published',
        _meta: {
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          author: this.authorName,
        },
      }
    }
    await this.openPage(home)
  },

  openPagesConfigEditor() {
    this.editingPagesConfig = JSON.parse(JSON.stringify(this.pagesConfig))
    if (!this.editingPagesConfig!.fieldGroupIds) this.editingPagesConfig!.fieldGroupIds = []
    this.showPagesConfigEditor = true
  },

  async savePagesConfig() {
    if (!this.fs || !this.editingPagesConfig) return
    await this.fs.writeJson(PATH_PAGES_CONFIG, this.editingPagesConfig)
    this.pagesConfig = JSON.parse(JSON.stringify(this.editingPagesConfig))
    this.showPagesConfigEditor = false
    this.editingPagesConfig = null
    this.showToast('ページ設定を保存しました')
  },

  async openPage(page: ContentData) {
    this.suppressDirty = true
    this.currentPage = page
    this.currentType = null
    // ページ ID 別の override があれば優先、無ければ共通 pagesConfig
    const override = this.pagesConfig?.overrides?.[page.id]
    const effectiveFieldGroupIds = override?.fieldGroupIds ?? this.pagesConfig?.fieldGroupIds
    const effectiveHasBody = override?.hasBody ?? this.pagesConfig?.hasBody ?? true
    this.currentFields = this.resolveFields(effectiveFieldGroupIds, [])
    this.showRevisionPanel = false
    this.showPreviewPanel = false
    this.view = 'page-edit'
    this.editData = { slug: '', ...page }
    // relation / repeater / imagelist / multiselect フィールドが未初期化の場合は空配列を注入
    // （x-model のチェックボックス配列や splice 呼び出しが undefined で動作しないため）
    for (const f of this.currentFields) {
      if (
        (['relation', 'repeater', 'imagelist', 'multiselect'].includes(f.type) &&
          (this.editData as any)[f.key] === undefined) ||
        (this.editData as any)[f.key] === null
      ) {
        ;(this.editData as any)[f.key] = []
      }
    }
    // トップページ（index）は常に Editor.js 無効、それ以外は effectiveHasBody に従う
    const isHome = page.id === 'index'
    if (!isHome && effectiveHasBody) {
      this.initEditor((page as any)._editorJson || page.body || '')
    } else if (this.editor) {
      this.editor.destroy()
      this.editor = null
    }
    this.updateHash()
    this.refreshTranslationStatus()
    this.$nextTick(() => {
      this.resetDirty()
      this.suppressDirty = false
    })
  },

  // --- コンテンツタイプ ---

  async openContentType(type: ContentType) {
    if (!this.fs) return
    this.currentType = type
    this.currentPage = null
    this.showRevisionPanel = false
    this.showPreviewPanel = false
    this.view = 'content-list'
    this.contentItems = await this.fs.readContentList(type.id, this.currentLang)
    this.updateHash()
  },

  async openContent(item: ContentData) {
    this.suppressDirty = true
    this.currentPage = item
    this.currentFields = this.resolveFields(
      this.currentType?.fieldGroupIds,
      this.currentType?.fields,
    )
    this.showRevisionPanel = false
    this.showPreviewPanel = false
    this.view = 'content-edit'
    this.editData = { slug: '', category: '', tags: [], ...item }
    // 配列系フィールドの初期化
    for (const f of this.currentFields) {
      if (
        (['relation', 'repeater', 'imagelist', 'multiselect'].includes(f.type) &&
          (this.editData as any)[f.key] === undefined) ||
        (this.editData as any)[f.key] === null
      ) {
        ;(this.editData as any)[f.key] = []
      }
    }
    // Alpine template x-if の入れ子展開を待つ
    setTimeout(() => {
      const hasBody =
        this.currentType?.hasBody ||
        this.currentFields.some((f) => f.type === 'richtext' && f.key === 'body')
      if (hasBody) {
        this.initEditor((item as any)._editorJson || item.body || '')
      }
      this.resetDirty()
      this.suppressDirty = false
    }, 100)
    this.updateHash()
    this.refreshTranslationStatus()
  },

  createContent() {
    const now = new Date()
    const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
    const item: ContentData = {
      id,
      title: '',
      slug: '',
      status: 'draft',
      category: '',
      tags: [],
      publishedAt: now.toISOString().split('T')[0],
      body: '',
      _meta: {
        createdAt: now.toISOString().split('T')[0],
        updatedAt: now.toISOString().split('T')[0],
        author: this.authorName,
      },
    }
    this.suppressDirty = true
    this.currentPage = item
    this.currentFields = this.resolveFields(
      this.currentType?.fieldGroupIds,
      this.currentType?.fields,
    )
    this.editData = { ...item }
    this.view = 'content-edit'
    setTimeout(() => {
      const hasBody =
        this.currentType?.hasBody ||
        this.currentFields.some((f) => f.type === 'richtext' && f.key === 'body')
      if (hasBody) {
        this.initEditor('')
      }
      this.resetDirty()
      this.suppressDirty = false
    }, 100)
  },

  // --- エディタ（Editor.js） ---

  initEditor(bodyData: string | EditorData) {
    if (this.editor) {
      this.editor.destroy()
      this.editor = null
    }

    // 既存HTMLをEditor.js JSONに変換（後方互換）
    let data: EditorData | null = null
    if (typeof bodyData === 'string' && bodyData.trim()) {
      data = htmlToEditorJson(bodyData)
    } else if (typeof bodyData === 'object' && bodyData?.blocks) {
      data = bodyData
    }

    this.$nextTick(() => {
      // 初期化直後の onChange（初期データ流し込み由来）は無視するため短時間だけ suppress
      this.suppressDirty = true
      this.editor = createEditor('editorjs', data, this.fs, () => {
        if (this.suppressDirty) return
        this.markDirty()
      })
      window.setTimeout(() => {
        this.suppressDirty = false
      }, 200)
    })
  },

  async getEditorHtml(): Promise<string> {
    if (!this.editor) return this.editData.body || ''
    const outputData = await this.editor.save()
    // Editor.js JSONをbody_jsonとして保存し、HTMLも生成
    this.editData._editorJson = outputData
    return editorJsonToHtml(outputData as EditorData)
  },

  // --- 画像アップロード ---

  async handleImageUpload(event: Event, fieldKey: string) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !this.fs) return
    try {
      const result = await saveImage(this.fs, file)
      // Data URLでプレビュー表示、実パスは_imagePathsに保存
      this.editData[fieldKey] = result.blobUrl || `/${result.path}`
      this.editData._imagePaths = {
        ...((this.editData._imagePaths as Record<string, string>) || {}),
        [fieldKey]: `/${result.path}`,
      }
      const saved = ((1 - result.size / result.originalSize) * 100).toFixed(0)
      this.showToast(`画像を最適化しました（${saved}%削減）`)
    } catch (e) {
      console.error('画像最適化エラー:', e)
      this.showToast('画像の処理に失敗しました')
    }
  },

  async handleFileUpload(event: Event, fieldKey: string) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !this.fs) return
    try {
      const buffer = await file.arrayBuffer()
      const path = `${PATH_ASSETS_FILES}/${file.name}`
      await this.fs.writeBlob(path, new Blob([buffer]))
      this.editData[fieldKey] = `/${path}`
      this.showToast(`${file.name} をアップロードしました`)
    } catch (e) {
      console.error('ファイルアップロードエラー:', e)
      this.showToast('ファイルのアップロードに失敗しました')
    }
  },

  // --- 保存（リビジョン自動作成付き） ---

  async savePage(opts: { silent?: boolean } = {}) {
    if (!this.fs) return
    const silent = opts.silent === true
    // Editor.jsの内容を先に取得（バリデーション前に必要）
    if (this.editor) {
      this.editData.body = await this.getEditorHtml()
    }
    // トップページはタイトルを意識しない：site.name を自動セット
    if (this.currentPage?.id === 'index') {
      this.editData.title = this.siteConfig.name || 'ホーム'
    }
    // 必須フィールドバリデーション
    if (!this.editData.title?.trim()) {
      if (!silent) this.showToast('タイトルを入力してください')
      return
    }
    if (this.currentType) {
      // currentFields は fieldGroupIds を解決済みの実フィールド一覧
      // （currentType.fields は optional のため直接参照すると TypeError になる）
      const missing = (this.currentFields || [])
        .filter((f) => f.required && f.key !== 'title')
        .filter((f) => {
          const val = (this.editData as any)[f.key]
          return val === undefined || val === null || val === ''
        })
      if (missing.length > 0) {
        if (!silent) {
          this.showToast(
            `必須フィールドを入力してください: ${missing.map((f) => f.label).join(', ')}`,
          )
        }
        return
      }
    }
    this.editData._meta = {
      ...this.editData._meta,
      updatedAt: new Date().toISOString().split('T')[0],
      author: this.authorName,
    }

    // IDはフォルダ名で固定（スラッグ変更で複製されないように元のIDを使う）
    const pageId = this.currentPage?.id || this.editData.id || ''
    const typePath = this.currentType ? this.currentType.id : 'pages'

    if (this.currentType) {
      await this.fs.saveContent(this.currentType.id, pageId, this.currentLang, this.editData)
      // 自動保存中はリストを再読込すると現在の編集 editData を差し替えてしまうので抑制
      if (!silent) {
        this.contentItems = await this.fs.readContentList(this.currentType.id, this.currentLang)
      }
    } else {
      await this.fs.savePage(pageId, this.currentLang, this.editData)
      if (!silent) {
        this.pages = await this.fs.readPages(this.currentLang)
      }
    }

    if (this.revisionMgr) {
      await this.revisionMgr.save(typePath, pageId, this.currentLang, this.editData)
    }

    this.resetDirty()
    if (!silent) this.showToast('保存しました')
  },

  // --- 削除 ---

  async deleteContent() {
    if (!this.fs || !this.currentType || !this.currentPage) return
    const title = this.currentPage.title || this.currentPage.id
    if (!(await this.showConfirm(`「${title}」を削除しますか？`))) return
    const dir = await this.fs.getDir(`content/${this.currentType.id}/${this.currentPage.id}`)
    if (dir) {
      // ディレクトリ内の全ファイルを削除
      const parentDir = await this.fs.getDir(`content/${this.currentType.id}`)
      if (parentDir) {
        try {
          await parentDir.removeEntry(this.currentPage.id, { recursive: true })
        } catch {
          /* skip */
        }
      }
    }
    this.contentItems = await this.fs.readContentList(this.currentType.id, this.currentLang)
    this.currentPage = null
    this.view = 'content-list'
    this.showToast('削除しました')
  },

  async deletePage() {
    if (!this.fs || !this.currentPage) return
    const title = this.currentPage.title || this.currentPage.id
    if (!(await this.showConfirm(`「${title}」を削除しますか？`))) return
    const parentDir = await this.fs.getDir('content/pages')
    if (parentDir) {
      try {
        await parentDir.removeEntry(this.currentPage.id, { recursive: true })
      } catch {
        /* skip */
      }
    }
    this.pages = await this.fs.readPages(this.currentLang)
    this.currentPage = null
    this.view = 'welcome'
    this.showToast('削除しました')
  },

  /** relation フィールドの候補リストを返す（指定コンテンツタイプの現言語公開済みアイテム） */
  relationCandidates(typeId: string): ContentData[] {
    if (!typeId) return []
    const key = `${typeId}:${this.currentLang}`
    if (this.relationCandidatesCache[key]) return this.relationCandidatesCache[key]
    if (!this.fs) return []
    // 同期化のため即時に空配列を返し、非同期で取得してキャッシュを更新
    this.relationCandidatesCache[key] = []
    this.fs.readContentList(typeId, this.currentLang).then((items) => {
      this.relationCandidatesCache[key] = items.sort((a, b) =>
        (b.publishedAt || b._meta?.createdAt || '').localeCompare(
          a.publishedAt || a._meta?.createdAt || '',
        ),
      )
    })
    return this.relationCandidatesCache[key]
  },

  /** 親ページとして選択可能なページ一覧を返す
   *  - 自身と自身の子孫を除外して循環参照を防ぐ
   *  - トップページ(index)はルート専用なので選択肢から除外
   */
  availableParentPages(): ContentData[] {
    const currentId = this.currentPage?.id || ''
    const excludeIndex = (p: ContentData): boolean => p.id !== 'index'
    if (!currentId) return this.pages.filter(excludeIndex)
    // currentId の子孫 id 集合を計算（BFS）
    const descendants = new Set<string>()
    const queue: string[] = [currentId]
    while (queue.length) {
      const id = queue.shift() as string
      for (const p of this.pages) {
        if ((p.parent || '') === id && !descendants.has(p.id)) {
          descendants.add(p.id)
          queue.push(p.id)
        }
      }
    }
    return this.pages.filter(
      (p) => p.id !== currentId && p.id !== 'index' && !descendants.has(p.id),
    )
  },

  /** ページ一覧を親子ツリー構造の順序（DFS）で depth 付きで返す
   *  トップページ(index)は独立メニューから編集するため一覧からは除外
   */
  pagesTree(): Array<ContentData & { depth: number }> {
    const visiblePages = this.pages.filter((p) => p.id !== 'index')
    const byParent = new Map<string, ContentData[]>()
    for (const p of visiblePages) {
      const parent = (p.parent as string | undefined) || ''
      if (!byParent.has(parent)) byParent.set(parent, [])
      byParent.get(parent)!.push(p)
    }
    // 兄弟は menuOrder → タイトルで並び替え
    for (const list of byParent.values()) {
      list.sort((a, b) => {
        const ao = a.menuOrder ?? 1e9
        const bo = b.menuOrder ?? 1e9
        if (ao !== bo) return ao - bo
        return (a.title || a.id).localeCompare(b.title || b.id)
      })
    }
    const result: Array<ContentData & { depth: number }> = []
    const visit = (parentId: string, depth: number): void => {
      const children = byParent.get(parentId) || []
      for (const child of children) {
        result.push({ ...child, depth })
        visit(child.id, depth + 1)
      }
    }
    visit('', 0)
    // 親が存在しない孤立ページも拾う（親IDが不正な場合）
    const collected = new Set(result.map((p) => p.id))
    for (const p of visiblePages) {
      if (!collected.has(p.id)) {
        result.push({ ...p, depth: 0 })
      }
    }
    return result
  },

  /** 編集中ページの最終的な URL パスを親チェーンから計算してプレビュー表示
   *  `index` は常にルート `/` にマップするため、親チェーンからは除外する。
   */
  pagePathPreview(): string {
    const slugOf = (p: ContentData): string => p.slug || p.id
    const currentSlug = this.editData.slug || this.editData.id || ''
    if (!currentSlug || currentSlug === 'index') return '/'
    const chain: string[] = []
    let parentId = (this.editData.parent as string | undefined) || ''
    const visited = new Set<string>()
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId)
      const parent = this.pages.find((p) => p.id === parentId)
      if (!parent) break
      const parentSlug = slugOf(parent)
      // index（トップページ）は / にマップされるのでパスには含めない
      if (parentSlug !== 'index') chain.unshift(parentSlug)
      parentId = (parent.parent as string | undefined) || ''
    }
    chain.push(currentSlug)
    return '/' + chain.join('/') + '/'
  },
}
