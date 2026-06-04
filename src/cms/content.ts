/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CmsComponent } from './types.ts'
import { type ContentData, type ContentType, type FieldDefinition } from '../types.ts'
import { createEditor, editorJsonToHtml, htmlToEditorJson, type EditorData } from '../editor.ts'
import { saveImage, safeAssetFilename } from '../image.ts'
import { PATH_ASSETS_FILES } from '../constants.ts'

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
      category: '',
      tags: [],
      _meta: {
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        author: this.authorName,
      },
    }
    this.suppressDirty = true
    this.currentPage = page
    this.currentType = null
    this.currentFields = this.fieldGroupsForContext('page', page.id).flatMap((g) => g.fields)
    this.showRevisionPanel = false
    this.showPreviewPanel = false
    this.view = 'page-edit'
    this.editData = { ...page }
    this.ensureFieldDefaults()
    this.initEditor('')
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

  /** フロントページ（siteConfig.frontPageId が指す固定ページ）を編集モードで開く */
  async openHomePage() {
    if (!this.fs) return
    this.pages = await this.fs.readPages(this.currentLang)
    const front = this.pages.find((p) => p.id === this.frontPageId)
    if (!front) {
      this.showToast(this.t('toast.noFrontPage'))
      await this.loadPageList()
      return
    }
    await this.openPage(front)
  },

  async openPage(page: ContentData) {
    this.suppressDirty = true
    this.currentPage = page
    this.currentType = null
    // 全ページ共通のタイトル・本文・サムネイル・カテゴリ・タグに加え、
    // 表示条件がこのページに一致するフィールドグループのカスタム項目を表示する
    this.currentFields = this.fieldGroupsForContext('page', page.id).flatMap((g) => g.fields)
    this.showRevisionPanel = false
    this.showPreviewPanel = false
    this.view = 'page-edit'
    this.editData = { slug: '', category: '', tags: [], ...page }
    // カスタムフィールドの初期値（配列系は []、group はオブジェクト）を注入
    this.ensureFieldDefaults()
    // フロントページも通常ページと同じ扱い（特別扱いしない）。本文エディタは常に有効。
    this.initEditor((page as any)._editorJson || page.body || '')
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
    this.contentItems = await this.fs.readContentListLight(type.id, this.currentLang)
    this.contentPage = 1
    this.updateHash()
  },

  /** 一覧の軽量インデックスをフルデータから作り直す（ずれた場合の復旧用） */
  async rebuildContentList() {
    if (!this.fs || !this.currentType) return
    await this.fs.rebuildContentIndexForLang(this.currentType.id, this.currentLang)
    this.contentItems = await this.fs.readContentListLight(this.currentType.id, this.currentLang)
    this.contentPage = 1
    this.showToast(this.t('toast.listRebuilt'))
  },

  async openContent(item: ContentData) {
    // 一覧は軽量インデックス（表示用の最小データ）なので、編集前に必ずフルデータを読み直す
    let data = item
    if (this.fs && this.currentType) {
      const full = await this.fs.readContent(this.currentType.id, item.id, this.currentLang)
      if (full) {
        data = full
      } else {
        this.showToast(this.t('toast.contentNotFound'))
        await this.openContentType(this.currentType)
        return
      }
    }
    this.suppressDirty = true
    this.currentPage = data
    this.currentFields = this.currentType ? this.fieldsForType(this.currentType) : []
    this.showRevisionPanel = false
    this.showPreviewPanel = false
    this.view = 'content-edit'
    this.editData = { slug: '', category: '', tags: [], ...data }
    // カスタムフィールドの初期値（配列系は []、group はオブジェクト）を注入
    this.ensureFieldDefaults()
    // Alpine template x-if の入れ子展開を待つ
    setTimeout(() => {
      // 本文は全タイプ共通の既定項目なので常に初期化
      this.initEditor((data as any)._editorJson || data.body || '')
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
    this.currentFields = this.currentType ? this.fieldsForType(this.currentType) : []
    this.editData = { ...item }
    this.ensureFieldDefaults()
    this.view = 'content-edit'
    setTimeout(() => {
      // 本文は全タイプ共通の既定項目なので常に初期化
      this.initEditor('')
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
      // カスタムの richtext フィールド用エディタも同じ抑制ウィンドウ内で初期化。
      // x-for（フィールドグループのセクション）の DOM 展開を確実に待つため少し遅延させる。
      window.setTimeout(() => this.initFieldEditors(), 60)
      window.setTimeout(() => {
        this.suppressDirty = false
      }, 250)
    })
  },

  async getEditorHtml(): Promise<string> {
    // richtext カスタムフィールドの内容も毎回 editData へ反映（保存/プレビュー/書き出し共通経路）
    await this.saveFieldEditors()
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
      this.showToast(this.t('toast.imageOptimized', { pct: saved }))
    } catch (e) {
      console.error('画像最適化エラー:', e)
      this.showToast(this.t('toast.imageFailed'))
    }
  },

  /** 画像リスト（imagelist）への追加アップロード。
   *  handleImageUpload は async なので、選択した各ファイルを await して
   *  順番に配列へ push する（旧実装は await せず undefined を詰めていた）。 */
  async handleImageListUpload(event: Event, fieldKey: string) {
    const input = event.target as HTMLInputElement
    const files = input.files ? Array.from(input.files) : []
    if (!files.length || !this.fs) return
    if (!Array.isArray(this.editData[fieldKey])) this.editData[fieldKey] = []
    let optimized = 0
    for (const file of files) {
      try {
        const result = await saveImage(this.fs, file)
        ;(this.editData[fieldKey] as string[]).push(result.blobUrl || `/${result.path}`)
        optimized++
      } catch (e) {
        console.error('画像最適化エラー:', e)
      }
    }
    // 同じ input で再度同じファイルを選べるようにクリア
    input.value = ''
    if (optimized) this.showToast(this.t('toast.imagesAdded', { n: optimized }))
    else this.showToast(this.t('toast.imageFailed'))
    this.markDirty()
  },

  /** group のサブフィールド画像など、対象キーへ1枚アップロードして代入する汎用ヘルパー。
   *  代入先を呼び出し側のコールバックで指定する（ネストしたパスに対応）。 */
  async uploadImageTo(event: Event, assign: (url: string) => void) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !this.fs) return
    try {
      const result = await saveImage(this.fs, file)
      assign(result.blobUrl || `/${result.path}`)
      input.value = ''
      this.markDirty()
    } catch (e) {
      console.error('画像最適化エラー:', e)
      this.showToast(this.t('toast.imageFailed'))
    }
  },

  async handleFileUpload(event: Event, fieldKey: string) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !this.fs) return
    try {
      const buffer = await file.arrayBuffer()
      // 日本語等の非ASCIIファイル名は文字化けの原因になるため安全な名前へ正規化
      const safeName = safeAssetFilename(file.name)
      const path = `${PATH_ASSETS_FILES}/${safeName}`
      await this.fs.writeBlob(path, new Blob([buffer]))
      this.editData[fieldKey] = `/${path}`
      this.showToast(this.t('toast.uploaded', { name: file.name }))
    } catch (e) {
      console.error('ファイルアップロードエラー:', e)
      this.showToast(this.t('toast.fileUploadFailed'))
    }
  },

  /** カスタムフィールドの初期値を editData に注入。
   *  - 配列系（relation/repeater/imagelist/multiselect）: 未定義なら []
   *  - group: オブジェクト化し、各サブフィールドキーを '' で初期化 */
  ensureFieldDefaults() {
    for (const f of this.currentFields || []) {
      const cur = (this.editData as any)[f.key]
      if (['relation', 'repeater', 'imagelist', 'multiselect'].includes(f.type)) {
        if (cur === undefined || cur === null) (this.editData as any)[f.key] = []
      } else if (f.type === 'group') {
        const obj = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}
        for (const sf of (f as any).subFields || []) {
          if (obj[sf.key] === undefined) obj[sf.key] = ''
        }
        ;(this.editData as any)[f.key] = obj
      }
    }
  },

  // --- リッチテキストのカスタムフィールド（本文とは別の Editor.js インスタンス） ---

  /** currentFields の richtext フィールドごとに、一意 holder の Editor.js を生成。
   *  本文(this.editor)とは別管理。holder が DOM に無い場合はスキップ。 */
  initFieldEditors() {
    this.destroyFieldEditors()
    for (const f of this.currentFields || []) {
      if (f.type !== 'richtext') continue
      const holder = `editorjs-f-${f.key}`
      if (!document.getElementById(holder)) continue
      const html = (this.editData as any)[f.key]
      const data = typeof html === 'string' && html.trim() ? htmlToEditorJson(html) : null
      this.fieldEditors[f.key] = createEditor(holder, data, this.fs, () => {
        if (this.suppressDirty) return
        this.markDirty()
      })
    }
  },

  destroyFieldEditors() {
    for (const key of Object.keys(this.fieldEditors)) {
      try {
        this.fieldEditors[key].destroy()
      } catch {
        /* skip */
      }
      delete this.fieldEditors[key]
    }
  },

  /** richtext カスタムフィールドの内容を editData[key] へ HTML として保存 */
  async saveFieldEditors() {
    for (const key of Object.keys(this.fieldEditors)) {
      try {
        const out = await this.fieldEditors[key].save()
        ;(this.editData as any)[key] = editorJsonToHtml(out as EditorData)
      } catch {
        /* skip */
      }
    }
  },

  // --- 保存（リビジョン自動作成付き） ---

  async savePage(opts: { silent?: boolean } = {}) {
    if (!this.fs) return
    const silent = opts.silent === true
    // Editor.jsの内容を先に取得（バリデーション前に必要）。
    // getEditorHtml 内で richtext カスタムフィールドも editData へ反映される。
    const bodyHtml = await this.getEditorHtml()
    if (this.editor) this.editData.body = bodyHtml
    // 必須フィールドバリデーション
    if (!this.editData.title?.trim()) {
      if (!silent) this.showToast(this.t('toast.enterTitle'))
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
        this.contentItems = await this.fs.readContentListLight(
          this.currentType.id,
          this.currentLang,
        )
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
    if (!silent) this.showToast(this.t('toast.saved'))
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
    await this.fs.removeFromContentIndex(this.currentType.id, this.currentPage.id)
    this.contentItems = await this.fs.readContentListLight(this.currentType.id, this.currentLang)
    this.contentPage = 1
    this.currentPage = null
    this.view = 'content-list'
    this.showToast(this.t('toast.deleted'))
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
    this.showToast(this.t('toast.deleted'))
  },

  /** relation フィールドの候補リストを返す（指定コンテンツタイプの現言語公開済みアイテム） */
  /** 編集画面でカスタム項目をフィールドグループ単位のセクションに分けて返す。
   *  title / body は本文・タイトル欄で扱うため除外する。 */
  fieldSections(): Array<{ label: string; fields: FieldDefinition[] }> {
    // タイトル・本文・サムネイル・カテゴリ・タグ等は専用UIで扱うためカスタム欄からは除外
    const DEFAULT_KEYS = [
      'title',
      'body',
      'image',
      'category',
      'tags',
      'slug',
      'publishedAt',
      'status',
      'description',
    ]
    const omit = (fields: FieldDefinition[]) =>
      (fields || []).filter((f) => !DEFAULT_KEYS.includes(f.key))
    const sections: Array<{ label: string; fields: FieldDefinition[] }> = []
    if (this.currentType) {
      // 投稿タイプ: 表示条件＋後方互換のグループ。無ければ inline fields。
      const groups = this.fieldGroupsForType(this.currentType)
      if (groups.length) {
        for (const g of groups) {
          const fields = omit(g.fields)
          if (fields.length) sections.push({ label: g.label, fields })
        }
      } else if (this.currentType.fields?.length) {
        const fields = omit(this.currentType.fields)
        if (fields.length) sections.push({ label: '', fields })
      }
    } else if (this.currentPage) {
      // 固定ページ: 表示条件が一致するフィールドグループ
      for (const g of this.fieldGroupsForContext('page', this.currentPage.id)) {
        const fields = omit(g.fields)
        if (fields.length) sections.push({ label: g.label, fields })
      }
    }
    return sections
  },

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
   *  - フロントページはルート(/)専用なので親候補から除外
   */
  availableParentPages(): ContentData[] {
    const currentId = this.currentPage?.id || ''
    const frontId = this.frontPageId
    const excludeFront = (p: ContentData): boolean => p.id !== frontId
    if (!currentId) return this.pages.filter(excludeFront)
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
      (p) => p.id !== currentId && p.id !== frontId && !descendants.has(p.id),
    )
  },

  /** ページ一覧を親子ツリー構造の順序（DFS）で depth 付きで返す
   *  フロントページも通常ページとして一覧に表示する（バッジで区別）
   */
  pagesTree(): Array<ContentData & { depth: number }> {
    const visiblePages = this.pages
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
   *  フロントページは常にルート `/` にマップするため、親チェーンからは除外する。
   */
  pagePathPreview(): string {
    const frontId = this.frontPageId
    const slugOf = (p: ContentData): string => p.slug || p.id
    const currentId = this.editData.id || ''
    const currentSlug = this.editData.slug || this.editData.id || ''
    if (!currentSlug || currentId === frontId) return '/'
    const chain: string[] = []
    let parentId = (this.editData.parent as string | undefined) || ''
    const visited = new Set<string>()
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId)
      const parent = this.pages.find((p) => p.id === parentId)
      if (!parent) break
      // フロントページは / にマップされるのでパスには含めない
      if (parent.id !== frontId) chain.unshift(slugOf(parent))
      parentId = (parent.parent as string | undefined) || ''
    }
    chain.push(currentSlug)
    return '/' + chain.join('/') + '/'
  },
}
