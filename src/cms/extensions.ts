import type { CmsComponent } from './types.ts'

/**
 * 拡張ポイント（Pro / プラグイン用）。
 *
 * 無料コア（この公開リポジトリ）では中身は空。
 * Pro は別の非公開リポジトリで、Vite の `resolve.alias` によって
 * このモジュールを差し替え、追加の振る舞い・初期化・ナビ項目を提供する。
 * これにより無料コアをフォークせずに Pro 機能を「上積み」できる。
 *
 * 例（Pro 側 vite.config）:
 *   resolve: { alias: { './cms/extensions.ts': '/pro/extensions.ts' } }
 *
 * 詳細は docs/PRO-OVERLAY.md を参照。
 */

/** コンポーネントに合成される追加メソッド・状態（無料コアでは空オブジェクト） */
export const extensionMixin: Partial<CmsComponent> & ThisType<CmsComponent> = {}

/** サイドバーに追加するナビゲーション項目（無料コアでは空配列）。
 *  view は対応するビュー識別子、icon は Lucide 名（data-lucide）。 */
export const extensionNavItems: Array<{
  id: string
  label: string
  icon: string
  view: string
}> = []

/** 起動時に一度呼ばれる拡張初期化フック（無料コアでは何もしない）。
 *  Pro 側で Handlebars ヘルパー登録・追加データ読込などに使う。 */
export async function runExtensionInit(_cms: CmsComponent): Promise<void> {
  // 無料コアでは no-op
}
