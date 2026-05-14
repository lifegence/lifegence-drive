export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js}",
    "./node_modules/frappe-ui/src/**/*.{vue,js}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Hiragino Kaku Gothic ProN",
          "Yu Gothic",
          "Meiryo",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
}
