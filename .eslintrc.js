module.exports = {
  plugins: ['testcafe'],
  extends: ['wesbos', 'plugin:testcafe/recommended'],
  rules: {
    'no-use-before-define': ['error', 'nofunc'],
    "react/prop-types": 0,
    'prettier/prettier': [
      'error',
      {
        printWidth: 80,
      },
    ],
  },
}
