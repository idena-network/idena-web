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
    defaultValue(_lng, _ns, key, options) {
      return options.defaultValue || key
    },
    lngs: ['en'],
    defaultNs: 'translation',
    resource: {
      loadPath: 'public/locales/{{lng}}/{{ns}}.json',
      savePath: 'public/locales/{{lng}}/{{ns}}.json',
      jsonIndent: 4,
      lineEnding: '\n',
    },
    keySeparator: false,
  },
}
