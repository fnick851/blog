// All site-wide constants. Everything the generator needs to know that
// isn't content lives here.
export default {
  url: "https://noah-song.com",
  title: "汉仑",
  subtitle: "Hanlun Song - Blog",
  description: "(Noah) Hanlun Song's blog.",
  author: "Hanlun Song",
  language: "en",
  // Post dates in frontmatter are wall-clock times in this zone.
  timezone: "America/New_York",
  // Newest N posts included in atom.xml.
  feedLimit: 20,

  // Header / profile
  nickname: "宋汉仑",
  navname: "Noah",
  avatar: "/image/avatar.png",
  profileDescription: "遽见追呼，不知所以。<br />但行好事，莫问前程。",
  nav: { posts: "/archives" },
  // Profile links: label -> URL. Icon class is `icon-<label lowercased>`
  // and must exist in the icon font embedded in assets/css/style.css.
  links: {
    Category: "https://portfolio.noah-song.com/",
    LinkedIn: "https://www.linkedin.com/in/hanlun/",
    Github: "https://github.com/fnick851",
    CodePen: "https://codepen.io/noahsong",
    CodeSandBox: "https://codesandbox.io/u/fnick851",
  },
};
