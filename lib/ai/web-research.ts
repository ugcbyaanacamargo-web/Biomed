import {redactForModel} from "./privacy";

export type BiomedicalSource={
  title:string;
  url:string;
  domain:string;
  abstract:string;
  year:string;
  authors:string;
};

type EuropePmcResult={
  id?:string;source?:string;title?:string;abstractText?:string;
  pubYear?:string;authorString?:string;doi?:string;pmid?:string;pmcid?:string;
};
type EuropePmcResponse={resultList?:{result?:EuropePmcResult[]}};

const TERM_MAP:Array<[RegExp,string]>=[
  [/dor neurop[aá]tica/i,"neuropathic pain"],
  [/dor nociceptiva/i,"nociceptive pain"],
  [/nocicep[cç][aã]o/i,"nociception"],
  [/modula[cç][aã]o da dor/i,"pain modulation"],
  [/controle descendente/i,"descending pain modulation"],
  [/sensibilidade som[aá]tica/i,"somatic sensation"],
  [/fibras?\s*c\b/i,"C fibers"],
  [/fibras?\s*a[δd-]?delta/i,"A-delta fibers"],
  [/receptores? sensoriais?/i,"sensory receptors"],
  [/transdu[cç][aã]o/i,"sensory transduction"],
  [/vias? ascendentes?/i,"ascending sensory pathways"]
];

const STOP_WORDS=new Set([
  "pesquise","pesquisar","busque","buscar","procure","fonte","fontes","biomedica","biomedicas","biomédica","biomédicas",
  "atual","atuais","recente","recentes","sobre","quero","estudos","estudo","artigos","artigo","me","explique","explicar",
  "citando","cite","com","e","uma","um","o","a","os","as","de","da","do","das","dos","para","por","favor"
]);

function sourceUrl(item:EuropePmcResult){
  if(item.doi)return `https://doi.org/${encodeURIComponent(item.doi)}`;
  const source=encodeURIComponent(item.source||"MED");
  const id=encodeURIComponent(item.id||item.pmid||item.pmcid||"");
  return `https://europepmc.org/article/${source}/${id}`;
}

export function buildBiomedicalSearchQuery(query:string){
  const safe=redactForModel(query).replace(/\s+/g," ").trim().slice(0,500);
  const mapped=[...new Set(TERM_MAP.filter(([pattern])=>pattern.test(safe)).map(([,term])=>term))];
  if(mapped.length)return mapped.join(" ");

  const normalized=safe
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zA-Z0-9\s-]/g," ")
    .toLowerCase()
    .split(/\s+/)
    .filter(word=>word.length>2&&!STOP_WORDS.has(word))
    .slice(0,8)
    .join(" ");
  return normalized||"nociception";
}

export async function searchBiomedicalSources(query:string):Promise<BiomedicalSource[]>{
  const search=buildBiomedicalSearchQuery(query);
  const params=new URLSearchParams({
    query:`${search} sort_date:y`,
    format:"json",
    resultType:"core",
    pageSize:"4",
    synonym:"true"
  });
  const response=await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`,{
    headers:{Accept:"application/json"},
    signal:AbortSignal.timeout(4000),
    cache:"no-store"
  });
  if(!response.ok)throw Object.assign(new Error("Pesquisa biomédica temporariamente indisponível"),{status:503});
  const data=await response.json() as EuropePmcResponse;
  return (data.resultList?.result||[])
    .filter(item=>item.title&&item.id)
    .slice(0,4)
    .map(item=>({
      title:String(item.title).slice(0,300),
      url:sourceUrl(item),
      domain:item.doi?"doi.org":"europepmc.org",
      abstract:redactForModel(String(item.abstractText||"")).slice(0,1200),
      year:String(item.pubYear||""),
      authors:String(item.authorString||"").slice(0,350)
    }));
}
