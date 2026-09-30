const WEB_PATTERNS=[
  /\b(pesquis|pesquise|buscar? na (web|internet)|procure na (web|internet))\b/i,
  /\b(hoje|atual|atualmente|mais recente|recentemente|em 2026|últim[oa]s?)\b/i,
  /\b(diretriz|guideline|consenso|artigo|estudo|publicação|notícia)\b.*\b(atual|recente|novo|2026)\b/i,
  /\bfonte(s)?\b.*\b(atual|recente|internet|web)\b/i
];

export function shouldUseWeb(input:string){
  const value=String(input||"").slice(0,8000);
  return WEB_PATTERNS.some(pattern=>pattern.test(value));
}
