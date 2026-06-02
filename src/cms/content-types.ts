/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CmsComponent } from './types.ts'
import { type ContentType, type FieldDefinition, type FieldGroup } from '../types.ts'

export const contentTypesMixin: Partial<CmsComponent> & ThisType<CmsComponent> = {
  /** 選択中の投稿タイプから {{page.xxx}} 形式のリファレンスを生成 */
  templateRefTypeFields(): Array<{ label: string; code: string; note?: string }> {
    const typeId = this.templateRefSelectedTypeId
    if (!typeId) return []
    const type = this.contentTypes.find((t) => t.id === typeId)
    if (!type) return []
    const fields = this.resolveFields(type.fieldGroupIds, type.fields)
    const result: Array<{ label: string; code: string; note?: string }> = []

    // タイトル・スラッグ・id は ContentData の必須要素なので常に表示
    result.push({ label: 'タイトル', code: '{{page.title}}' })
    result.push({ label: 'スラッグ', code: '{{page.slug}}' })
    result.push({ label: 'ID', code: '{{page.id}}' })

    // 本文: hasBody === true、または fieldGroups から body フィールドが見つかる場合
    const hasBody =
      type.hasBody === true || fields.some((f) => f.key === 'body' && f.type === 'richtext')
    if (hasBody) {
      result.push({
        label: '本文 (HTML)',
        code: '{{{page.body}}}',
        note: '三重括弧でエスケープせず出力',
      })
    }
    // 公開日: hasDate === true のときのみ
    if (type.hasDate) {
      result.push({ label: '公開日', code: '{{page.publishedAt}}' })
      result.push({
        label: '公開日（フォーマット）',
        code: "{{formatDate page.publishedAt 'YYYY年MM月DD日'}}",
      })
    }
    // カテゴリ: hasCategory === true のときのみ
    if (type.hasCategory) {
      result.push({ label: 'カテゴリ', code: '{{page.category}}' })
    }
    // タグ: hasTag === true のときのみ
    if (type.hasTag) {
      result.push({
        label: 'タグ（ループ）',
        code: '{{#each page.tags}}\n  <span class="tag">{{this}}</span>\n{{/each}}',
      })
    }
    // サムネイル画像: hasThumbnail === true のときのみ
    if (type.hasThumbnail) {
      result.push({
        label: 'サムネイル画像',
        code: '{{#if page.image}}<img src="{{page.image}}" alt="{{page.title}}">{{/if}}',
      })
    }
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
        result.push({
          label: f.label,
          code: `{{#each page.${f.key}}}\n  <!-- 各要素 -->\n{{/each}}`,
          note: 'リピーター（配列）',
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
      ? JSON.parse(JSON.stringify(type))
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
    } as any)
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

  async loadFieldGroupEditor() {
    if (!this.fs) return
    this.fieldGroups = await this.fs.readFieldGroups()
    this.currentFieldGroup = null
    this.view = 'field-groups'
    this.updateHash()
  },

  openFieldGroup(group: FieldGroup) {
    this.currentFieldGroup = JSON.parse(JSON.stringify(group))
    // UI用プロパティ付与
    this.currentFieldGroup!.fields = this.currentFieldGroup!.fields.map((f: any) => ({
      ...f,
      _expanded: false,
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
    }
  },

  addFieldToGroup() {
    if (!this.currentFieldGroup) return
    this.currentFieldGroup.fields.push({
      key: '',
      label: '',
      type: 'text',
      _expanded: false,
      showIf_field: '',
      showIf_value: '',
      options: [],
    } as any)
  },

  removeFieldFromGroup(idx: number) {
    if (!this.currentFieldGroup) return
    this.currentFieldGroup.fields.splice(idx, 1)
  },

  async saveFieldGroup() {
    if (!this.fs || !this.currentFieldGroup) return
    const g = this.currentFieldGroup
    if (!g.label.trim()) {
      this.showToast('ラベルを入力してください')
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
    const cleanedFields = g.fields.map((f: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _expanded, showIf_field, showIf_value, showIf: _showIf, ...rest } = f
      const field: any = { ...rest }
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
    await this.fs.writeJson(`content/_fieldGroups/${g.id}.json`, {
      id: g.id,
      label: g.label,
      fields: cleanedFields,
    })
    this.fieldGroups = await this.fs.readFieldGroups()
    this.showToast(`${g.label} を保存しました`)
  },

  async deleteFieldGroup() {
    if (!this.currentFieldGroup?.id) return
    if (!(await this.showConfirm(`「${this.currentFieldGroup.label}」を削除しますか？`))) return
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
    this.showToast('削除しました')
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
        if ((f as any).subFields?.length) {
          for (const sf of (f as any).subFields) {
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
      this.showToast('ラベルを入力してください')
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
    const saveData: any = { ...t }
    delete saveData.fields
    if (!saveData.fieldGroupIds?.length) delete saveData.fieldGroupIds
    await this.fs.writeJson(`content/_types/${t.id}.json`, saveData)
    this.contentTypes = await this.fs.readContentTypes()
    this.showTypeEditor = false
    this.editingType = null
    this.showToast(`${t.label} を保存しました`)
  },

  async deleteType() {
    const typeId = this.currentType?.id || this.editingType?.id
    const typeLabel = this.currentType?.label || this.editingType?.label || typeId || '不明'
    if (!this.fs) return
    if (!(await this.showConfirm(`「${typeLabel}」を削除しますか？`))) return

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
    this.showToast('削除しました')
  },
}
