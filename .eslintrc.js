module.exports = {
  plugins: ['testcafe'],
  extends: ['wesbos', 'plugin:testcafe/recommended'],
  rules: {
    'no-use-before-define': ['error', 'nofunc'],
    'prettier/prettier': [
      'error',
      {
        printWidth: 80,
      },
    ],
  },
}
