/** Tailwind theme for the preview server. Brand colors mirror
 *  BRAND-STYLE-GUIDE.md (light mode). Used only by `.preview`. */
export default {
  content: [
    "./.preview/**/*.{ts,tsx,html}",
    "./{actions,chat,data-display,feedback,forms,icons,layout,navigation,shell,workflow,tokens}/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        ink: "#10263B",
        flysch: "#F0F2F5",
        biscay: { DEFAULT: "#1C3F60", 2: "#1E6FA8" },
        espelette: "#B23A1E",
        moss: "#2C6E49",
        clay: "#A05E1C",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
};
