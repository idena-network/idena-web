const AVAILABLE_LANGS = [
  'en',
  'id',
  'fr',
  'de',
  'es',
  'ru',
  'zh',
  'ko',
  'hr',
  'hi',
  'uk',
  'sr',
  'ro',
  'it',
  'pt',
  'pl',
  'sl',
  'tr',
  'bg',
  'sv',
  'ja',
  'el',
]

module.exports = {
  input: [
    '**/*.{js,jsx}',
    '!**/out/**',
    '!**/.next/**',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  output: './',
  options: {
    debug: true,
    sort: true,
    func: {
      list: ['t'],
      extensions: ['.js', '.jsx'],
    },
    trans: {
      component: 'Trans',
      i18nKey: 'i18nKey',
      extensions: ['.js', '.jsx'],
      fallbackKey(ns, value) {
        return value
      },
    },
    lngs: AVAILABLE_LANGS,
    defaultNs: 'translation',
    defaultValue(_lng, _ns, key, options) {
      return options.defaultValue || key
    },
    resource: {
      loadPath: 'public/locales/{{lng}}/{{ns}}.json',
      savePath: 'public/locales/{{lng}}/{{ns}}.json',
      jsonIndent: 2,
      lineEnding: '\n',
    },
    keySeparator: false,
  },
}
