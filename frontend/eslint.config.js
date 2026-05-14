import pluginVue from "eslint-plugin-vue"

export default [
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.{js,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        Number: "readonly",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
]
