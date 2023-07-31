/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/*.html",
    "./src/*.(tsx|ts|jsx|js)",
    "./src/**/*.(tsx|ts|jsx|js)",
    require.resolve("react-widgets/styles.css"),
  ],
  theme: {
    extend: {
      fontFamily: {
        georgia:
          "Superclarendon, 'Bookman Old Style', 'URW Bookman', 'URW Bookman L', 'Georgia Pro', Georgia, serif",
        didot:
          "Didot, 'Bodoni MT', 'Noto Serif Display', 'URW Palladio L', P052, Sylfaen, serif",
        merriweather: "Merriweather, serif",
      },
      // palette: https://www.color-hex.com/color-palette/9376
      colors: {
        hover: "#325531",
        main: "#658864",
        highlight: "#F5EC8D",
        highlight2: "#A1E69C",
        darkest: "#000",
        lightest: "#F5F5F5",

        background: "#fff",
        // Too bright
        //background: "#fffdeb",
        dmbackground: "#000",

        text: "#000",
        dmtext: "#fff",
        editortext: "#000",
        dmeditortext: "#ccc",
        dmtextsecondary: "#eee",

        editor: "#fff",
        dmeditor: "#111",

        button: "#0c1612",
        dmbutton: "rgb(28,27,30)",
        dmbuttonsecondary: "#000",

        buttontext: "#d2d9d8",
        dmbuttontext: "#eee",
        dmbuttontextsecondary: "#eee",
        // Not enough contrast with background:
        //dmbutton: "#182c25",
        buttonhover: "#F5EC8D",
        dmbuttonhover: "#222",
        dmbuttonhoversecondary: "#222",

        buttonhovertext: "#0c1612",
        dmbuttonhovertext: "#fff",
        dmbuttonhovertextsecondary: "#fff",

        //dmbuttonhover: "#598669",
        sidebar: "rgb(242,241,247)",
        menu: "rgb(242,241,247)",
        sidebarSecondary: "#FFF",
        dmsidebar: "rgb(28,27,30)",
        dmsidebarSecondary: "#000",

        dmmenu: "rgb(28,27,30)",
        "panel-background": "#fff",
        "dmpanel-background": "#494959",

        "panel-background-hover": "#ccc",
        "dmpanel-background-hover": "rgb(56,60,72)",

        dmlistitem1: "#455b55",
        dmlistitem2: "#303f3b",

        dmsettings: "#e4deae",
        dmsettingspanel: "#2f2f31",

        dmchaptercard: "#2d695e",
        dmchaptercardhover: "#357a6e",

        listitemhover: "rgb(222,221,226)",
        listitemhoverSecondary: "rgb(222,221,226)",
        dmlistitemhover: "rgb(56,60,72)",
        dmlistitemhoverSecondary: "#252525",
        listBorder: "rgb(203,213,226)",
        dmlistBorder: "rgb(19,19,21)",
      },
      spacing: {
        xs: "0.5rem",
        sm: "1rem",
        md: "2rem",
        lg: "3rem",
        xl: "4rem",
        108: "27rem",
      },
      width: {
        history: "800px",
        historysmall: "760px",
      },
      leading: {
        xxl: "45px",
      },
      height: {},
      /*   padding: {
        xs: "0.5rem",
        sm: "1rem",
        md: "2rem",
        lg: "3rem",
        xl: "4rem",
      }, */
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/line-clamp"),
    require("tailwindcss-safe-area"),
  ],
  safelist: ["ql-editor", "ql-toolbar", "ql-snow"],
};
