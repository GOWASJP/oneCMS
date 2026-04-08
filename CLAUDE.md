# ONE CMS - 開発ルール

## UIルール

- ブラウザデフォルトの `alert()`, `confirm()`, `prompt()` を使用しない。カスタムモーダル/トーストで代替する
- HTMLネイティブのフォームバリデーション（`required` 属性等）を使用しない。Alpine.jsでカスタムバリデーションを実装する
- エラー・確認・入力はすべてアプリ内UIで完結させる

## 技術スタック

- TypeScript (strict)
- Vite 8 + vite-plugin-singlefile
- Tailwind CSS 4
- Alpine.js
- Editor.js (ブロックエディタ)
- Handlebars.js (テンプレートエンジン)
- Zod (バリデーション)
- Lucide (アイコン)

## コーディング規約

- ESLint + Prettier + Husky (pre-commit)
- `for await...of` は使用禁止（Viteのトランスパイルと互換性なし）。手動で `iter.next()` を使う
- FileSystemDirectoryHandle のイテレーションは `collectEntries()` ヘルパーを使用する

## ファイル構成

- `src/` - TypeScriptソース
- `templates/` - Handlebarsテンプレート（SvelteKit風パーシャル構造）
- `content/` - コンテンツデータ（JSON）
- `build/` - ビルド出力（cms.html単一ファイル）
