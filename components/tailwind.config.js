/** Tailwind theme for the preview server. Brand colors mirror
 *  BRAND-STYLE-GUIDE.md (light mode). Used only by `.preview`. */
export default {
  content: [
    "./.preview/**/*.{ts,tsx,html}",
    "./{actions,chat,data-display,feedback,forms,icons,layout,navigation,pages,features,shell,workflow,tokens}/**/*.{ts,tsx}",
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
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "skeleton-fade": { "0%,100%": { opacity: "0.55" }, "50%": { opacity: "0.85" } },
      },
      animation: {
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "skeleton-fade": "skeleton-fade 1.8s ease-in-out infinite",
      },
    },
  },
};
