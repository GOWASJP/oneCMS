import type { CmsComponent } from './types.ts'
import {
  type ContentType,
  type FieldDefinition,
  type FieldGroup,
  type LocationRule,
} from '../types.ts'

/** 編集 UI でフィールドに一時付与する内部プロパティ（保存前に除去する）。 */
interface UiFieldDefinition extends FieldDefinition {
  _expanded?: boolean
  _keyEdited?: boolean
  showIf_field?: string
  showIf_value?: string
}

export const contentTypesMixin: Partial<CmsComponent> & ThisType<CmsComponent> = {
  /** 選択中の投稿タイプから {{page.xxx}} 形式のリファレンスを生成 */
  templateRefTypeFields(): Array<{ label: string; code: string; note?: string }> {
    const typeId = this.templateRefSelectedTypeId
    if (!typeId) return []
    const type = this.contentTypes.find((t) => t.id === typeId)
    if (!type) return []
    const fields = this.fieldsForType(type)
    const result: Array<{ label: string; code: string; note?: string }> = []

    // タイトル・スラッグ・id は ContentData の必須要素なので常に表示
    result.push({ label: 'タイトル', code: '{{page.title}}' })
    result.push({ label: 'スラッグ', code: '{{page.slug}}' })
    result.push({ label: 'ID', code: '{{page.id}}' })

    // 本文・カテゴリ・タグ・サムネイルは全タイプ共通の既定項目なので常に参照可能
    result.push({
      label: '本文 (HTML)',
      code: '{{{page.body}}}',
      note: '三重括弧でエスケープせず出力',
    })
    // 公開日: hasDate === true のときのみ
    if (type.hasDate) {
      result.push({ label: '公開日', code: '{{page.publishedAt}}' })
      result.push({
        label: '公開日（フォーマット）',
        code: "{{formatDate page.publishedAt 'YYYY年MM月DD日'}}",
      })
    }
    result.push({ label: 'カテゴリ', code: '{{page.category}}' })
    result.push({
      label: 'タグ（ループ）',
      code: '{{#each page.tags}}\n  <span class="tag">{{this}}</span>\n{{/each}}',
    })
    result.push({
      label: 'サムネイル画像',
      code: '{{#if page.image}}<img src="{{page.image}}" alt="{{page.title}}">{{/if}}',
    })
    // メタ情報は常に存在する
    result.push({ label: '更新日', code: '{{page._meta.updatedAt}}' })
    result.push({ label: '著者', code: '{{page._meta.author}}' })

    // 詳細ページのURL（list.hbs 内で使う想定）
    result.push({
      label: '詳細ページURL',
      code: `/${type.slug}/{{slug}}/`,
      note: 'list.hbs の {{#each items}} ループ内で使用',
    })

    // ここからカスタムフィールド（フィールドグループから解決）
    for (const f of fields) {
      if (['title', 'body', 'slug', 'publishedAt', 'category'].includes(f.key)) continue
      if (f.type === 'image') {
        result.push({
          label: f.label,
          code: `{{#if page.${f.key}}}<img src="{{page.${f.key}}}" alt="">{{/if}}`,
          note: '画像。条件分岐＋img タグ',
        })
      } else if (f.type === 'imagelist') {
        result.push({
          label: f.label,
          code: `{{#each page.${f.key}}}\n  <img src="{{this}}" alt="">\n{{/each}}`,
          note: '画像配列をループで出力',
        })
      } else if (f.type === 'file') {
        result.push({
          label: f.label,
          code: `{{#if page.${f.key}}}<a href="{{page.${f.key}}}">ダウンロード</a>{{/if}}`,
          note: '添付ファイル',
        })
      } else if (f.type === 'richtext') {
        result.push({
          label: f.label,
          code: `{{{page.${f.key}}}}`,
          note: 'リッチテキスト（HTML 出力）',
        })
      } else if (f.type === 'repeater') {
        const inner = (f.subFields || []).map((sf) => `  {{${sf.key}}}`).join('\n')
        result.push({
          label: f.label,
          code: `{{#each page.${f.key}}}\n${inner || '  <!-- 各要素 -->'}\n{{/each}}`,
          note: 'リピーター（配列）',
        })
      } else if (f.type === 'group') {
        const inner = (f.subFields || []).map((sf) => `  {{page.${f.key}.${sf.key}}}`).join('\n')
        result.push({
          label: f.label,
          code: inner || `{{page.${f.key}}}`,
          note: 'グループ（オブジェクト）',
        })
      } else if (f.type === 'relation') {
        result.push({
          label: f.label,
          code: `{{#each page.${f.key}}}\n  <a href="/${typeId}/{{this}}/">{{this}}</a>\n{{/each}}`,
          note: '関連コンテンツの id 配列',
        })
      } else if (f.type === 'url') {
        result.push({
          label: f.label,
          code: `{{#if page.${f.key}}}<a href="{{page.${f.key}}}">{{page.${f.key}}}</a>{{/if}}`,
        })
      } else if (f.type === 'date' || f.type === 'datetime') {
        result.push({
          label: f.label,
          code: `<time>{{page.${f.key}}}</time>`,
        })
      } else if (f.type === 'checkbox' || f.type === 'toggle') {
        result.push({
          label: f.label,
          code: `{{#if page.${f.key}}}有効{{else}}無効{{/if}}`,
        })
      } else {
        result.push({
          label: f.label,
          code: `{{page.${f.key}}}`,
        })
      }
    }
    return result
  },

  // --- コンテンツタイプ管理 ---

  openTypeEditor(type?: ContentType) {
    const raw = type
      ? structuredClone(type)
      : {
          id: '',
          label: '',
          slug: '',
          pagination: 10,
          fieldGroupIds: [] as string[],
        }
    if (!raw.fieldGroupIds) raw.fieldGroupIds = []
    this.editingType = raw
    this.showTypeEditor = true
  },

  addFieldToType() {
    if (!this.editingType) return
    if (!this.editingType.fields) this.editingType.fields = []
    this.editingType.fields.push({
      key: '',
      label: '',
      type: 'text',
      _expanded: false,
      showIf_field: '',
      showIf_value: '',
      options: [],
    } as UiFieldDefinition)
  },

  removeFieldFromType(idx: number) {
    if (!this.editingType) return
    ;(this.editingType.fields || []).splice(idx, 1)
  },

  // --- フィールドグループ管理 ---

  /** フィールドグループIDからフィールド定義を解決 */
  resolveFields(fieldGroupIds?: string[], fallbackFields?: FieldDefinition[]): FieldDefinition[] {
    if (fieldGroupIds?.length) {
      return fieldGroupIds.flatMap((id) => this.fieldGroups.find((g) => g.id === id)?.fields || [])
    }
    return fallbackFields || []
  },

  /** 表示条件（ロケーションルール）が指定コンテキストに一致するフィールドグループを返す。
   *  value === '*' はその種別すべてにマッチ。 */
  fieldGroupsForContext(kind: 'page' | 'contentType', id: string): FieldGroup[] {
    return this.fieldGroups.filter((g) =>
      (g.locations || []).some(
        (loc) => loc.target === kind && (loc.value === id || loc.value === '*'),
      ),
    )
  },

  /** 投稿タイプに表示すべきフィールドグループ（表示条件＋後方互換の fieldGroupIds、重複排除） */
  fieldGroupsForType(type: ContentType): FieldGroup[] {
    const seen = new Set<string>()
    const groups: FieldGroup[] = []
    for (const g of this.fieldGroupsForContext('contentType', type.id)) {
      if (!seen.has(g.id)) {
        seen.add(g.id)
        groups.push(g)
      }
    }
    for (const gid of type.fieldGroupIds || []) {
      const g = this.fieldGroups.find((x) => x.id === gid)
      if (g && !seen.has(g.id)) {
        seen.add(g.id)
        groups.push(g)
      }
    }
    return groups
  },

  /** 投稿タイプの全カスタムフィールド（フィールドグループ優先、無ければ後方互換の inline fields） */
  fieldsForType(type: ContentType): FieldDefinition[] {
    const groups = this.fieldGroupsForType(type)
    if (groups.length) return groups.flatMap((g) => g.fields)
    return type.fields || []
  },

  async loadFieldGroupEditor() {
    if (!this.fs) return
    this.fieldGroups = await this.fs.readFieldGroups()
    this.currentFieldGroup = null
    this.view = 'field-groups'
    this.updateHash()
  },

  openFieldGroup(group: FieldGroup) {
    this.currentFieldGroup = structuredClone(group)
    if (!this.currentFieldGroup!.locations) this.currentFieldGroup!.locations = []
    // UI用プロパティ付与
    this.currentFieldGroup!.fields = this.currentFieldGroup!.fields.map((f) => ({
      ...f,
      _expanded: false,
      // 既存フィールドはキー確定済みとして扱い、ラベル変更で上書きしない
      _keyEdited: true,
      showIf_field: f.showIf?.field || '',
      showIf_value:
        f.showIf?.value !== undefined && f.showIf?.value !== null ? String(f.showIf.value) : '',
      options: f.options || [],
    }))
  },

  createFieldGroup() {
    this.currentFieldGroup = {
      id: '',
      label: '',
      fields: [],
      locations: [],
    }
  },

  /** 表示条件の行を1つ追加（既定は「すべての固定ページ」） */
  addLocationRule() {
    if (!this.currentFieldGroup) return
    if (!this.currentFieldGroup.locations) this.currentFieldGroup.locations = []
    this.currentFieldGroup.locations.push({ target: 'page', value: '*' })
  },

  /** select の "target:value" 文字列を LocationRule に変換 */
  parseLocationOption(v: string): LocationRule {
    const idx = v.indexOf(':')
    const target = v.slice(0, idx) as 'page' | 'contentType'
    return { target, value: v.slice(idx + 1) }
  },

  addFieldToGroup() {
    if (!this.currentFieldGroup) return
    this.currentFieldGroup.fields.push({
      key: '',
      label: '',
      type: 'text',
      description: '',
      _expanded: false,
      _keyEdited: false,
      showIf_field: '',
      showIf_value: '',
      options: [],
    } as UiFieldDefinition)
    // 新規フィールドはタイプピッカーをすぐ開いて選んでもらう
    this.openTypePicker(this.currentFieldGroup.fields[this.currentFieldGroup.fields.length - 1])
  },

  /** ラベル → キー自動生成（手動編集されていない場合のみ） */
  onFieldLabelInput(field: FieldDefinition) {
    const f = field as UiFieldDefinition
    if (f._keyEdited) return
    const slug = (field.label || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const idx = this.currentFieldGroup?.fields.indexOf(field) ?? 0
    field.key = slug || `field${idx + 1}`
  },

  /** フィールドタイプ選択ピッカーを開く */
  openTypePicker(field: FieldDefinition) {
    this.typePickerTarget = field
  },

  /** タイプを選択して適用（タイプ固有の初期値も用意） */
  selectFieldType(id: string) {
    const f = this.typePickerTarget as UiFieldDefinition | null
    if (!f) return
    f.type = id as FieldDefinition['type']
    if (['select', 'multiselect', 'radio'].includes(id) && (!f.options || !f.options.length)) {
      f.options = ['']
    }
    if (['repeater', 'group'].includes(id) && !f.subFields) f.subFields = []
    // 選択肢・サブフィールドの設定が必要なタイプは詳細を自動展開して気づけるようにする
    if (['select', 'multiselect', 'radio', 'repeater', 'group'].includes(id)) f._expanded = true
    this.typePickerTarget = null
  },

  /** タイプ id → 日本語ラベル */
  fieldTypeLabel(id: string): string {
    if (!this.fieldTypes.find((t) => t.id === id)) return id
    return this.t('fieldType.' + id)
  },

  /** タイプ id → Lucide アイコン名 */
  fieldTypeIcon(id: string): string {
    return this.fieldTypes.find((t) => t.id === id)?.icon || 'type'
  },

  /** 投稿タイプ編集モーダルからフィールド画面へスムーズに移動 */
  async goEditFieldGroup(id?: string) {
    this.showTypeEditor = false
    this.editingType = null
    await this.loadFieldGroupEditor()
    if (id) {
      const g = this.fieldGroups.find((x) => x.id === id)
      if (g) this.openFieldGroup(g)
    } else {
      this.createFieldGroup()
    }
  },

  removeFieldFromGroup(idx: number) {
    if (!this.currentFieldGroup) return
    this.currentFieldGroup.fields.splice(idx, 1)
  },

  async saveFieldGroup() {
    if (!this.fs || !this.currentFieldGroup) return
    const g = this.currentFieldGroup
    if (!g.label.trim()) {
      this.showToast(this.t('toast.enterLabel'))
      return
    }
    if (!g.id) {
      g.id = g.label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
    }
    // UI用プロパティを除去
    const cleanedFields = g.fields.map((f: UiFieldDefinition) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _expanded, _keyEdited, showIf_field, showIf_value, showIf: _showIf, ...rest } = f
      const field: Partial<FieldDefinition> = { ...rest }
      if (!field.description || !field.description.trim()) delete field.description
      if (showIf_field?.trim()) {
        let val: unknown = showIf_value
        if (showIf_value === 'true') val = true
        else if (showIf_value === 'false') val = false
        field.showIf = { field: showIf_field.trim(), value: val }
      }
      if (!field.required) delete field.required
      if (!field.options || field.options.length === 0) delete field.options
      if (!field.subFields || field.subFields.length === 0) delete field.subFields
      return field
    })
    const cleanedLocations = (g.locations || []).filter(
      (loc) => loc && (loc.target === 'page' || loc.target === 'contentType') && loc.value,
    )
    await this.fs.writeJson(`content/_fieldGroups/${g.id}.json`, {
      id: g.id,
      label: g.label,
      fields: cleanedFields,
      ...(cleanedLocations.length ? { locations: cleanedLocations } : {}),
    })
    this.fieldGroups = await this.fs.readFieldGroups()
    this.showToast(this.t('toast.savedNamed', { name: g.label }))
  },

  async deleteFieldGroup() {
    if (!this.currentFieldGroup?.id) return
    if (
      !(await this.showConfirm(
        this.t('confirm.deleteNamed', { name: this.currentFieldGroup.label }),
      ))
    )
      return
    const dir = await this.fs!.getDir('content/_fieldGroups')
    if (dir) {
      try {
        await dir.removeEntry(`${this.currentFieldGroup.id}.json`)
      } catch {
        /* skip */
      }
    }
    this.fieldGroups = await this.fs!.readFieldGroups()
    this.currentFieldGroup = null
    this.showToast(this.t('toast.deleted'))
  },

  /** カスタムフィールドのテンプレートコードを生成 */
  getFieldTemplateCode(typeArg?: ContentType): string {
    const type = typeArg || this.editingType
    if (!type) return ''
    const lines: string[] = []

    // 一覧ページ用
    lines.push('{{!-- 一覧ページ (list.hbs) --}}')
    lines.push(`{{#each items}}`)
    lines.push(`<article>`)
    lines.push(`  <a href="{{url}}">`)
    lines.push(`    <h2>{{page.title}}</h2>`)
    for (const f of type.fields || []) {
      if (f.key === 'title' || f.key === 'body') continue
      if (f.type === 'image') {
        lines.push(`    {{#if page.${f.key}}}<img src="{{page.${f.key}}}" alt="">{{/if}}`)
      } else if (f.type === 'date' || f.type === 'datetime') {
        lines.push(`    <time>{{page.${f.key}}}</time>`)
      } else if (
        ['text', 'textarea', 'number', 'url', 'email', 'year', 'color', 'select', 'radio'].includes(
          f.type,
        )
      ) {
        lines.push(`    <span>{{page.${f.key}}}</span>`)
      }
    }
    lines.push(`  </a>`)
    lines.push(`</article>`)
    lines.push(`{{/each}}`)

    lines.push('')
    lines.push('{{!-- 詳細ページ (detail.hbs) --}}')
    lines.push(`<h1>{{page.title}}</h1>`)
    for (const f of type.fields || []) {
      if (f.key === 'title') continue
      if (f.key === 'body') {
        lines.push(`{{{page.body}}}`)
      } else if (f.type === 'image') {
        lines.push(`{{#if page.${f.key}}}<img src="{{page.${f.key}}}" alt="{{page.title}}">{{/if}}`)
      } else if (f.type === 'imagelist') {
        lines.push(`{{#each page.${f.key}}}`)
        lines.push(`  <img src="{{this}}" alt="">`)
        lines.push(`{{/each}}`)
      } else if (f.type === 'file') {
        lines.push(`{{#if page.${f.key}}}<a href="{{page.${f.key}}}">ダウンロード</a>{{/if}}`)
      } else if (f.type === 'richtext') {
        lines.push(`{{{page.${f.key}}}}`)
      } else if (f.type === 'date' || f.type === 'datetime') {
        lines.push(`<time>{{page.${f.key}}}</time>`)
      } else if (f.type === 'daterange') {
        lines.push(`<span>{{page.${f.key}_from}} 〜 {{page.${f.key}_to}}</span>`)
      } else if (f.type === 'url') {
        lines.push(`{{#if page.${f.key}}}<a href="{{page.${f.key}}}">{{page.${f.key}}}</a>{{/if}}`)
      } else if (f.type === 'multiselect') {
        lines.push(`{{#each page.${f.key}}}`)
        lines.push(`  <span>{{this}}</span>`)
        lines.push(`{{/each}}`)
      } else if (f.type === 'repeater') {
        lines.push(`{{#each page.${f.key}}}`)
        if (f.subFields?.length) {
          for (const sf of f.subFields) {
            if (sf.type === 'image') {
              lines.push(`  {{#if this.${sf.key}}}<img src="{{this.${sf.key}}}" alt="">{{/if}}`)
            } else {
              lines.push(`  <span>{{this.${sf.key}}}</span>`)
            }
          }
        } else {
          lines.push(`  <span>{{this}}</span>`)
        }
        lines.push(`{{/each}}`)
      } else if (f.type === 'checkbox' || f.type === 'toggle') {
        lines.push(`{{#if page.${f.key}}}<span>${f.label}: ON</span>{{/if}}`)
      } else if (f.type === 'hidden') {
        // skip
      } else {
        lines.push(`<span>{{page.${f.key}}}</span>`)
      }
    }
    return lines.join('\n')
  },

  async saveType() {
    if (!this.fs || !this.editingType) return
    const t = this.editingType
    if (!t.label.trim()) {
      this.showToast(this.t('toast.enterLabel'))
      return
    }
    if (!t.id) {
      t.id =
        t.slug ||
        t.label
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
    }
    if (!t.slug) t.slug = t.id
    // fieldGroupIds で保存（旧 fields は除去）
    const saveData: Partial<ContentType> = { ...t }
    delete saveData.fields
    if (!saveData.fieldGroupIds?.length) delete saveData.fieldGroupIds
    await this.fs.writeJson(`content/_types/${t.id}.json`, saveData)
    this.contentTypes = await this.fs.readContentTypes()
    this.showTypeEditor = false
    this.editingType = null
    this.showToast(this.t('toast.savedNamed', { name: t.label }))
  },

  async deleteType() {
    const typeId = this.currentType?.id || this.editingType?.id
    const typeLabel = this.currentType?.label || this.editingType?.label || typeId || '不明'
    if (!this.fs) return
    if (!(await this.showConfirm(this.t('confirm.deleteNamed', { name: typeLabel })))) return

    const dir = await this.fs.getDir('content/_types')
    if (dir && typeId) {
      try {
        await dir.removeEntry(`${typeId}.json`)
      } catch {
        /* skip */
      }
    }
    // IDが空のファイル(.json)も探して削除
    if (dir && !typeId) {
      try {
        await dir.removeEntry('.json')
      } catch {
        /* skip */
      }
    }
    this.contentTypes = await this.fs.readContentTypes()
    this.showTypeEditor = false
    this.editingType = null
    this.currentType = null
    this.view = 'welcome'
    this.showToast(this.t('toast.deleted'))
  },
}
