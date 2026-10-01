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

function sourceUrl(item:EuropePmcResult){
  if(item.doi)return `https://doi.org/${encodeURIComponent(item.doi)}`;
  const source=encodeURIComponent(item.source||"MED");
  const id=encodeURIComponent(item.id||item.pmid||item.pmcid||"");
  return `https://europepmc.org/article/${source}/${id}`;
}

export async function searchBiomedicalSources(query:string):Promise<BiomedicalSource[]>{
  const safe=redactForModel(query).replace(/\s+/g," ").trim().slice(0,500);
  if(!safe)return[];
  const params=new URLSearchParams({
    query:`${safe} sort_date:y`,
    format:"json",
    resultType:"core",
    pageSize:"5",
    synonym:"true"
  });
  const response=await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`,{
    headers:{Accept:"application/json"},
    signal:AbortSignal.timeout(7000),
    cache:"no-store"
  });
  if(!response.ok)throw Object.assign(new Error("Pesquisa biomédica temporariamente indisponível"),{status:503});
  const data=await response.json() as EuropePmcResponse;
  return (data.resultList?.result||[])
    .filter(item=>item.title&&item.id)
    .slice(0,5)
    .map(item=>({
      title:String(item.title).slice(0,300),
      url:sourceUrl(item),
      domain:item.doi?"doi.org":"europepmc.org",
      abstract:redactForModel(String(item.abstractText||"")).slice(0,2800),
      year:String(item.pubYear||""),
      authors:String(item.authorString||"").slice(0,500)
    }));
}
