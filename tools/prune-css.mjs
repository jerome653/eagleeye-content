// prune-css.mjs — keep only the rules of the app's dashboard.css that these pages can use.
//
// dashboard.css is the whole Eagle Eye app's stylesheet (390 KB: every console screen); the content
// pages use the welcome page's part of it. It blocks the first paint, so its size is load time and
// load time is ranking. A rule is KEPT when every class in at least one of its selectors appears
// somewhere the pages can produce it: a class attribute in the built HTML, or a word in the scripts
// that build markup at runtime (site.js, wl-bg.js, wl-obj.js, world.js). Rules with no class
// (element, :root, attribute) are kept. @keyframes / @font-face are kept whole. Conservative by
// construction: a class that appears anywhere is never dropped.
export function pruneCss(css, used) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let kept = 0, dropped = 0;
  const splitTop = (sel) => { const out = []; let depth = 0, cur = '';
    for (const ch of sel) { if (ch === '(' || ch === '[') depth++; else if (ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur); return out.map(s => s.trim()).filter(Boolean); };
  const keepSel = (s) => { const cls = [...s.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]); return cls.every(c => used.has(c)); };
  // walk a block body, returning the pruned text
  const walk = (src) => {
    let i = 0, out = '';
    while (i < src.length) {
      const open = src.indexOf('{', i);
      if (open < 0) break;
      const head = src.slice(i, open).trim();
      // find the matching close brace
      let depth = 1, j = open + 1;
      while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
      const body = src.slice(open + 1, j - 1);
      i = j;
      if (!head) continue;
      if (head.startsWith('@')) {
        if (/^@(media|supports|layer|container)\b/.test(head)) {
          const inner = walk(body);
          if (inner.trim()) out += `${head}{${inner}}`;
        } else out += `${head}{${body}}`;                 // @keyframes, @font-face, @page …
        continue;
      }
      const sels = splitTop(head).filter(keepSel);
      if (sels.length) { kept++; out += `${sels.join(',')}{${body.trim()}}`; } else dropped++;
    }
    return out;
  };
  // a leading @charset/@import line (none today) would be kept by the @ branch only with a block;
  // dashboard.css has neither
  const out = walk(css);
  return { css: out, kept, dropped };
}

// The words the pages can produce: class attributes in the built HTML, and every identifier-like
// word in the runtime scripts (they build class names as string literals).
export function usedTokens(htmls, scripts) {
  const used = new Set();
  for (const h of htmls) for (const m of h.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c) used.add(c);
  for (const s of scripts) for (const m of s.matchAll(/[A-Za-z_][\w-]*/g)) used.add(m[0]);
  // classes assembled from a prefix and a number at runtime ('on r' + ring -> r0 … r20): any string
  // literal that ends in a word and is followed by "+" counts that word with every suffix 0-20
  for (const s of scripts) for (const m of s.matchAll(/['"`][^'"`\n]*?([A-Za-z][\w-]*)['"`]\s*\+/g))
    for (let k = 0; k <= 20; k++) used.add(m[1] + k);
  return used;
}
