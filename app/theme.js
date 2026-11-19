/* Runs before the page paints (loaded without defer in index.html): sets the theme,
   accent and sidebar state from the saved preferences, so a light theme or a collapsed
   sidebar does not first flash dark or open. dashboard.js applyPrefs() owns the same
   rules afterwards; this repeats only what the first paint needs. */
(function () {
  var p = {};
  try { p = JSON.parse(localStorage.getItem("eagleeyes.prefs") || "{}") || {}; } catch (e) { p = {}; }
  var root = document.documentElement;
  // "auto" (the default, no saved theme): light on a phone-width screen, dark elsewhere.
  var theme = p.theme || "auto";
  var light = theme === "light" ||
    (theme === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ||
    (theme === "auto" && window.matchMedia && window.matchMedia("(max-width: 760px)").matches);
  root.setAttribute("data-theme", light ? "light" : "dark");
  if (/^(red|blue|green|violet|orange)$/.test(p.accent || "")) root.setAttribute("data-accent", p.accent);
  if (p.side === "collapsed") root.classList.add("side-collapsed");
  if (p.density === "compact") root.classList.add("compact");
  if (p.motion === "off") root.classList.add("no-motion");
  if (p.skin === "glass") root.classList.add("glass");
})();
