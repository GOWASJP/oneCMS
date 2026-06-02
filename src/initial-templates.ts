/**
 * 初回起動時に書き出される初期テンプレートファイル一式。
 *
 * すべて templates/ ディレクトリの実ファイルを Vite の ?raw で取り込んでいるので、
 * 開発時にファイルを編集すればそのままバンドルに反映される。製作者は新規インストール
 * 後にサイドバーの「テンプレート」から自由に編集・追加・削除できる。
 */

import baseHbs from '../templates/_base.hbs?raw'
import pageHbs from '../templates/page.hbs?raw'
import listHbs from '../templates/list.hbs?raw'
import detailHbs from '../templates/detail.hbs?raw'
import homeHbs from '../templates/home.hbs?raw'
import configJson from '../templates/config.json?raw'

import headHbs from '../templates/_components/head.hbs?raw'
import headerHbs from '../templates/_components/header.hbs?raw'
import footerHbs from '../templates/_components/footer.hbs?raw'
import navHbs from '../templates/_components/nav.hbs?raw'
import breadcrumbHbs from '../templates/_components/breadcrumb.hbs?raw'
import paginationHbs from '../templates/_components/pagination.hbs?raw'
import stylesHbs from '../templates/_components/styles.hbs?raw'
import accordionHbs from '../templates/_components/accordion.hbs?raw'
import cardListHbs from '../templates/_components/card-list.hbs?raw'
import galleryHbs from '../templates/_components/gallery.hbs?raw'
import heroHbs from '../templates/_components/hero.hbs?raw'
import tabsHbs from '../templates/_components/tabs.hbs?raw'
import timelineHbs from '../templates/_components/timeline.hbs?raw'
import seoHbs from '../templates/_components/seo.hbs?raw'

/** 相対パス → 内容 のマップ。ensureInitialData でそのまま書き出される */
export const INITIAL_TEMPLATES: Record<string, string> = {
  'templates/config.json': configJson,
  'templates/_base.hbs': baseHbs,
  'templates/page.hbs': pageHbs,
  'templates/list.hbs': listHbs,
  'templates/detail.hbs': detailHbs,
  'templates/home.hbs': homeHbs,

  'templates/_components/head.hbs': headHbs,
  'templates/_components/header.hbs': headerHbs,
  'templates/_components/footer.hbs': footerHbs,
  'templates/_components/nav.hbs': navHbs,
  'templates/_components/breadcrumb.hbs': breadcrumbHbs,
  'templates/_components/pagination.hbs': paginationHbs,
  'templates/_components/styles.hbs': stylesHbs,
  'templates/_components/accordion.hbs': accordionHbs,
  'templates/_components/card-list.hbs': cardListHbs,
  'templates/_components/gallery.hbs': galleryHbs,
  'templates/_components/hero.hbs': heroHbs,
  'templates/_components/tabs.hbs': tabsHbs,
  'templates/_components/timeline.hbs': timelineHbs,
  'templates/_components/seo.hbs': seoHbs,
}
