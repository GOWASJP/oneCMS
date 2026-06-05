import type { CmsComponent } from './types.ts'
import { INITIAL_TEMPLATES } from '../initial-templates.ts'
import { DEFAULT_ASSETS, fetchDefaultAssetBlob } from '../default-assets.ts'
import { PATH_SITE_CONFIG, PATH_LANGUAGES, SCHEMA_VERSION } from '../constants.ts'
import { readMeta, writeMeta, runMigrations, currentMeta } from '../migrations.ts'

/** 初回起動時のデータ生成・テンプレート補完・スキーマ移行を担うミックスイン。 */
export const setupMixin: Partial<CmsComponent> & ThisType<CmsComponent> = {
  /** 初回起動時に必要なフォルダ・ファイルを自動作成 */
  async ensureInitialData() {
    if (!this.fs) return

    // site.json がなければ初期データ一式を作成
    const existing = await this.fs.readJson(PATH_SITE_CONFIG)
    if (existing) return

    // site.json
    await this.fs.writeJson(PATH_SITE_CONFIG, {
      name: 'マイサイト',
      url: '',
      description: '',
      frontPageId: 'index',
      themeId: 'default',
      timezone: 'Asia/Tokyo',
      nav: [
        { label: 'ホーム', url: '/' },
        { label: '会社概要', url: '/about/' },
      ],
    })

    // languages.json
    await this.fs.writeJson(PATH_LANGUAGES, {
      default: 'ja',
      locales: [
        { code: 'ja', label: '日本語', flag: '🇯🇵' },
        { code: 'en', label: 'English', flag: '🇺🇸' },
      ],
    })

    // コンテンツタイプ: お知らせ
    await this.fs.writeJson('content/_types/news.json', {
      id: 'news',
      label: 'お知らせ',
      icon: '📢',
      slug: 'news',
      order: 'date_desc',
      hasDate: true,
      pagination: 10,
      fields: [
        { key: 'title', label: 'タイトル', type: 'text', required: true },
        { key: 'body', label: '本文', type: 'richtext' },
        { key: 'image', label: '画像', type: 'image' },
      ],
    })

    // 固定ページ: トップ（フロントページ。通常ページとして本文を編集する）
    await this.fs.writeJson('content/pages/index/ja.json', {
      title: 'ホーム',
      body: '<p>ようこそ。サイトの特徴やサービスをここで紹介します。</p>',
      status: 'published',
      _meta: {
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        author: this.authorName,
      },
    })

    // 固定ページ: 会社概要
    await this.fs.writeJson('content/pages/about/ja.json', {
      title: '会社概要',
      body: '<p>会社概要のページです。</p>',
      status: 'published',
      _meta: {
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        author: this.authorName,
      },
    })

    // フィールドグループ: サンプル（製作者が自由に編集・追加・削除可能。投稿タイプに割当可能）
    await this.fs.writeJson('content/_fieldGroups/home-hero.json', {
      id: 'home-hero',
      label: 'ヒーロー',
      fields: [
        { key: 'heroHeading', label: '見出し', type: 'text' },
        { key: 'heroSubheading', label: 'サブ見出し', type: 'textarea' },
        { key: 'heroImage', label: '背景画像', type: 'image' },
      ],
    })
    await this.fs.writeJson('content/_fieldGroups/home-carousel.json', {
      id: 'home-carousel',
      label: 'カルーセル',
      fields: [
        {
          key: 'carousel',
          label: 'スライド',
          type: 'repeater',
          subFields: [
            { key: 'image', label: '画像', type: 'image' },
            { key: 'caption', label: 'キャプション', type: 'text' },
            { key: 'link', label: 'リンク先', type: 'url' },
          ],
        },
      ],
    })
    await this.fs.writeJson('content/_fieldGroups/home-featured-news.json', {
      id: 'home-featured-news',
      label: '注目のお知らせ',
      fields: [
        {
          key: 'featuredNews',
          label: '掲載するお知らせ',
          type: 'relation',
          relationType: 'news',
          relationMultiple: true,
        },
      ],
    })
    await this.fs.writeJson('content/_fieldGroups/home-banners.json', {
      id: 'home-banners',
      label: 'バナーエリア',
      fields: [
        {
          key: 'banners',
          label: 'バナー',
          type: 'repeater',
          subFields: [
            { key: 'image', label: '画像', type: 'image' },
            { key: 'alt', label: '代替テキスト', type: 'text' },
            { key: 'link', label: 'リンク先', type: 'url' },
          ],
        },
      ],
    })

    // 初期テンプレート一式を書き出し（INITIAL_TEMPLATES は templates/ 配下の実ファイルから
    // Vite の ?raw import で取り込んだもの）。製作者はインストール後に自由にカスタマイズ可能
    for (const [path, content] of Object.entries(INITIAL_TEMPLATES)) {
      await this.fs.writeText(path, content)
    }
  },

  /** 既定ブランド素材（ファビコン・ロゴ・OGP画像）を補完する。
   *  - 未設定の項目だけ、同梱デフォルトを assets/files/ に書き出して siteConfig に設定
   *  - 一度適用したら _brandingDefaultsApplied フラグで以後はスキップ（ユーザーが削除しても再追加しない）
   *  - 既にユーザーが設定済みの項目は一切上書きしない
   *  loadSiteData で siteConfig 読込直後・Blob URL 生成前に呼ぶこと。 */
  async ensureDefaultBranding() {
    if (!this.fs) return
    if (this.siteConfig._brandingDefaultsApplied) return
    for (const key of ['favicon', 'logo', 'ogImage'] as const) {
      if (this.siteConfig[key]) continue
      const def = DEFAULT_ASSETS[key]
      await this.fs.writeBlob(def.path, await fetchDefaultAssetBlob(def))
      this.siteConfig[key] = `/${def.path}`
    }
    this.siteConfig._brandingDefaultsApplied = true
    await this.fs.writeJson(PATH_SITE_CONFIG, this.siteConfig)
  },

  /** バンドル内のテンプレートで、ユーザーフォルダに存在しないファイルだけ補完。
   *  既存ファイルは絶対に上書きしない。新しいテンプレートが ONE CMS に追加されたとき、
   *  既存プロジェクトにも自動で反映されるための仕組み。 */
  async ensureMissingTemplates() {
    if (!this.fs) return
    for (const [path, content] of Object.entries(INITIAL_TEMPLATES)) {
      const existing = await this.fs.readText(path)
      if (existing === null) {
        await this.fs.writeText(path, content)
      }
    }
  },

  /**
   * データ形式のバージョンを確認し、必要なら最新へ移行する。
   * - 旧版/未記録データ → 移行（破壊的変更がある場合は移行前にバックアップ）し、メタを更新
   * - データの方が新しい（ダウングレード）→ 移行せず警告を表示
   */
  async checkVersionAndMigrate() {
    if (!this.fs) return
    const meta = await readMeta(this.fs)
    const from = meta?.schemaVersion ?? 0
    try {
      const result = await runMigrations(this.fs, from)
      if (result.downgrade) {
        // データが本体より新しい。移行もメタ更新もせず、警告のみ。
        this.dataSchemaVersion = from
        this.schemaWarning =
          `このデータは新しいバージョン（データ形式 v${from}）で作成されています。` +
          `現在の本体は v${SCHEMA_VERSION} までの対応です。最新の cms.html をご利用ください。`
        this.showToast(this.t('toast.dataNewerWarning'), 6000)
        return
      }
      this.schemaWarning = null
      this.dataSchemaVersion = SCHEMA_VERSION
      this.lastBackupPath = result.backupPath
      // メタ情報を現行の本体情報で更新（本体バージョン・エディションの記録も兼ねる）
      await writeMeta(this.fs, currentMeta())
      if (result.applied.length > 0) {
        this.showToast(this.t('toast.migrated', { path: result.backupPath || '' }), 6000)
      }
    } catch (e) {
      console.error('[CMS] データ移行に失敗:', e)
      this.showToast(this.t('toast.migrationError'), 6000)
    }
  },

  /** 旧データ移行: 投稿タイプの fieldGroupIds を、各フィールドグループの表示条件
   *  （locations: { target:'contentType', value:<typeId> }）へ移し替え、type 側からは除去する。
   *  冪等。fieldGroupIds を持つタイプが無ければ何もしない。 */
  async migrateTypeFieldGroupsToLocations() {
    if (!this.fs) return
    const pending = this.contentTypes.filter((t) => (t.fieldGroupIds?.length ?? 0) > 0)
    if (!pending.length) return
    let groupsChanged = false
    for (const type of pending) {
      for (const gid of type.fieldGroupIds || []) {
        const g = this.fieldGroups.find((x) => x.id === gid)
        if (!g) continue
        if (!g.locations) g.locations = []
        if (!g.locations.some((l) => l.target === 'contentType' && l.value === type.id)) {
          g.locations.push({ target: 'contentType', value: type.id })
          await this.fs.writeJson(`content/_fieldGroups/${g.id}.json`, {
            id: g.id,
            label: g.label,
            fields: g.fields,
            locations: g.locations,
          })
          groupsChanged = true
        }
      }
      // type 側から fieldGroupIds を除去して書き戻す
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fieldGroupIds, ...rest } = type
      await this.fs.writeJson(`content/_types/${type.id}.json`, rest)
      delete (type as { fieldGroupIds?: string[] }).fieldGroupIds
    }
    if (groupsChanged) this.fieldGroups = await this.fs.readFieldGroups()
  },
}
