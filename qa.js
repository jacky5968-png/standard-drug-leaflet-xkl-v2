/* XML 問答：章節語意、逐字證據、精簡摘要。自動產出不冒稱人工審核。 */
import {priorityAnswer,priorityBlocks,priorityTables} from './priority-qa.js';
import {sectionSupplement as previousSectionSupplement} from './section-supplements.js';
import {candidateSupplement} from './candidate-supplements.js';
import {priority507Supplement} from './priority-507-supplements.js';
import {formulationSupplement} from './formulation-supplements.js';
import {remaining466Supplement} from './remaining-466-supplements.js';
import {remaining425Supplement} from './remaining-425-supplements.js';
import {remaining394Supplement} from './remaining-394-supplements.js';
import {remaining367Supplement} from './remaining-367-supplements.js';
import {remaining338Supplement} from './remaining-338-supplements.js';
import {remaining222Supplement} from './remaining-222-supplements.js';
import {remaining135Supplement} from './remaining-135-supplements.js';
import {remaining101Supplement} from './remaining-101-supplements.js';
import {remaining80Supplement} from './remaining-80-supplements.js';
import {remaining63Supplement} from './remaining-63-supplements.js';
import {remaining54Supplement} from './remaining-54-supplements.js';
import {remaining45Supplement} from './remaining-45-supplements.js';
import {remaining37Supplement} from './remaining-37-supplements.js';
import {clarification6Supplement as previousClarification6Supplement} from './clarification-6-supplements.js';
import {dosageSupplement} from './dosage-supplements.js?v=28-final';
const clarification6Supplement=(p,t,a)=>dosageSupplement(p,t,previousClarification6Supplement(p,t,a));
const sectionSupplement=(p,t,a)=>clarification6Supplement(p,t,remaining37Supplement(p,t,remaining45Supplement(p,t,remaining54Supplement(p,t,remaining63Supplement(p,t,remaining80Supplement(p,t,remaining101Supplement(p,t,remaining135Supplement(p,t,remaining222Supplement(p,t,remaining338Supplement(p,t,remaining367Supplement(p,t,remaining394Supplement(p,t,remaining425Supplement(p,t,remaining466Supplement(p,t,formulationSupplement(p,t,priority507Supplement(p,t,candidateSupplement(p,t,previousSectionSupplement(p,t,a))))))))))))))))));
const norm=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
export const QA_VERSION=28;
const SEMANTICS={
 composition:/^(有效)?成分(?:及含量)?$|^主成分/,excipient:/賦形|其他成分/,form:/^劑型$|藥品外觀|^外觀$/,indication:/適應症|^用途/,dose:/用法|用量|調製方式|調配|給藥方式/,
 renal:/腎功能|腎機能|腎不全|腎臟/,hepatic:/肝功能|肝機能|肝不全/,elder:/老年|高齡|老人/,child:/小兒|兒童|孩童|青少年/,pregnancy:/懷孕|妊娠|孕婦/,lactation:/哺乳|授乳/,
 contra:/禁忌|請勿使用|不得使用|不可使用/,warning:/警語|注意事項|重要警告|請先諮詢|先洽醫師/,interaction:/交互作用|相互作用|^併用/,adverse:/副作用|不良反應|以下症狀/,mechanism:/作用機轉|藥效藥理/,
 pk:/藥物動力|藥動學|動力學特性/,trial:/臨床試驗|臨床前安全|動物毒理/,storage:/儲存|貯存|保存|^效期|^包裝/,patient:/病人使用須知/,overdose:/過量/};
const SAFETY=['warning','contra','adverse','patient','dose','renal','hepatic','elder','child','pregnancy','lactation','interaction','overdose'];
const PROFILES={
 'excipients':{roles:['excipient'],whole:true},
 'common-03':{roles:['composition'],whole:true},'common-04':{roles:['form'],whole:true},'common-06':{roles:['indication'],whole:true},
 'common-07':{roles:['dose'],terms:['起始劑量','起始建議劑量','初始劑量','初期','開始劑量','起初','初次','初劑量']},
 // 固定間隔的用量須同時有使用動作與明確數量；不將時間或頻次本身當作劑量。
 'common-08':{roles:['dose'],terms:['通常','一般','建議劑量','推薦','維持','後繼','成人','每次','每日','每天','一日'],pattern:/每(?:隔)?[\d一二兩三四五六七八九十半]+(?:[-－–—~～至到或][\d一二兩三四五六七八九十半]+)?(?:個)?小時(?:可|應|需|須|宜|建議)?(?:口含|含服|含用|含|口服|服用|使用|給予|給藥|服)(?:\d+(?:\.\d+)?|[一二兩三四五六七八九十半]+)(?:mg|毫克|錠|顆|片|粒|ml|毫升)/i},
 'common-09':{roles:['dose'],terms:['最高','最大','不得超過','不可超過','不能超過','不超過','上限']},
 'common-10':{roles:['dose'],pattern:/(?:每[日天]|[1一][日天]|一天)[^。；|]{0,10}?[\d一二兩三四五六七八九十多數~～至、或\-]+次|(?:每[日天]|[1一][日天]|一天)(?:服用|口服|服|用)?[\d一二兩三四五六七八九十]+[錠粒]|每日單次|分(?:成)?[\d一二三四五六七八九十~～至到\-]+次|[\d一二三四五六七八九十~～至到\-]+次分服|每日使用次數|每.{1,8}小時|間隔.{0,15}小時|早晚|[bt]\.?(?:i\.?d\.?)|q\.?d\.?/i},
 'common-11':{roles:['dose','patient','pk','interaction'],terms:['飯前','飯後','餐前','餐後','隨餐','空腹','用餐','食物','進食','餐中','餐時','飯中']},
 'common-13':{roles:['dose','warning','patient'],terms:['咀嚼','咬嚼','咬碎','磨粉','磨碎','弄碎','嚼碎','嚼破','整顆','整粒','整錠','壓碎','打開','嚼服','吞服']},
 'common-14':{roles:SAFETY,terms:['漏服','忘記服','忘記使','忘了服','忘記吃','忘記用','忘記投','補服','錯過']},
 'common-15':{roles:SAFETY,terms:['停藥','停用','停止使用','停止治療','停止服','中止投藥','中止給藥','中止治療','逐漸減量','徐徐減量','突然中斷']},
 'common-16':{roles:['renal','dose','contra','warning','patient'],dedicated:'renal',terms:['腎功能','腎機能','腎臟','腎不全','肌酸酐','肌胺酸酐','肌酐','Clcr','CrCl','eGFR','CCr','透析','腎病','腎衰']},
 'common-17':{roles:['hepatic','dose','contra','warning','patient'],dedicated:'hepatic',terms:['肝功能','肝機能','肝臟','肝不全','肝損害','肝障礙','Child-Pugh','肝疾病']},
 'common-18':{roles:SAFETY,dedicated:'elder',terms:['老年','老人','高齡','年長','65歲','65 歲']},
 'common-19':{roles:SAFETY,dedicated:'child',terms:['小兒','兒童','孩童','青少年','幼兒','嬰兒']},
 'common-20':{roles:SAFETY,dedicated:'pregnancy',terms:['懷孕','孕婦','妊娠','胎兒','有孕']},
 'common-21':{roles:SAFETY,dedicated:'lactation',terms:['哺乳','授乳','乳汁','乳中']},
 'common-22':{roles:['contra'],whole:true},'common-23':{roles:['adverse'],whole:true},'common-24':{roles:['warning'],whole:true},
 'common-25':{roles:['interaction','contra','warning','renal','hepatic','dose'],terms:['併用','合用','交互作用','合併使用','合併服','同時使用','同時服','避免飲酒','忌飲酒','不應同時','相互作用'],wholeRole:'interaction'},
 'common-26':{roles:['mechanism'],whole:true},'common-27':{roles:['pk'],whole:true},'common-28':{roles:['pk','mechanism'],terms:['半衰期','半減期','t1/2','t½']},
 'common-29':{roles:['storage'],whole:true},'common-30':{roles:['trial'],whole:true}
};
const EMPTY=/^(?:[（(【\[]?依文獻(?:記載|刊載|記述)[）)】\]]?|目前(?:尚|並)?無(?:相關)?(?:資訊|資料)|尚無(?:相關)?(?:資訊|資料)|無相關資料|無|不適用|[-—]+)[。.]?$/u;
const meaningful=x=>!!x?.trim()&&!EMPTY.test(x.trim());
const sourceCache=new WeakMap();
function sources(p){
 if(sourceCache.has(p))return sourceCache.get(p);
 const byId=new Map(p.sections.map(s=>[s.id,s]));
 const out=p.sections.map(s=>{
  const ancestry=[];let a=s;const seen=new Set();while(a&&!seen.has(a.id)){seen.add(a.id);ancestry.unshift(a);a=byId.get(a.parent)}
  const roles=new Set();for(const a of ancestry)for(const [role,re]of Object.entries(SEMANTICS))if(re.test(norm(a.title)))roles.add(role);
  const direct=new Set(Object.entries(SEMANTICS).filter(([,r])=>r.test(norm(s.title))).map(([k])=>k));
  const numbered=[...ancestry].reverse().find(a=>a.no);
  const contraindicationScope=ancestry.some(a=>/禁忌|有下列情形.*(?:勿|不得|不可|禁止).*使用|^請勿使用[。！]?$/u.test(norm(a.title)));
  return {...s,no:s.no||numbered?.no||'未編號',roles,direct,contraindicationScope,context:ancestry.slice(0,-1).map(a=>a.title).filter(Boolean).join('／')};
 });sourceCache.set(p,out);return out;
}
export function termMatches(text,term){
 const n=norm(text),t=norm(term);if(!t)return false;
 if(/^[a-z][a-z0-9 -]*$/i.test(String(term).trim())){const english=String(text||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' '),needle=String(term).normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ');return new RegExp('(?:^|[^a-z0-9])'+needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^a-z0-9])','i').test(english);}
 return n.includes(t);
}
function units(s){
 const text=s.text||'';const result=[];
 // 保留原始換行與句子範圍。每個引文均是 XML text 的連續子字串。
 const re=/[^。\n]+[。]?/gu;let m;
 while((m=re.exec(text))){const quote=m[0].trim();if(meaningful(quote))result.push({quote,start:text.indexOf(quote,m.index),end:text.indexOf(quote,m.index)+quote.length})}
 return result;
}
function coherentUnits(s){
 const list=units(s),out=[];
 // 只處理本輪一般問答的折行；引文仍取原text的連續範圍。
 for(let i=0;i<list.length;i++){
  const first=list[i];let end=first.end,j=i;
  const heading=/^(?:[-－]\s*)?(?:劑量|投與方法|給藥方法|[●•〔【]?食物的?影響[〕】]?)$/u.test(first.quote.trim());
  if(!heading&&!/[。；;:：]$/.test(first.quote)&&!first.quote.includes('|')){
   while(j+1<list.length&&end-first.start<900){
    const next=list[j+1],current=s.text.slice(first.start,end);
    if(/[。；;:：]$/.test(current)||next.quote.includes('|')||/^(?:[•●*〔【]|\(?\d+[.)、]|[一二三四五六七八九十]+[、.])/.test(next.quote)||/[:：]$/.test(next.quote)||s.text.slice(end,next.start).includes('\n\n'))break;
    end=next.end;j++;
   }
  }
  out.push({quote:s.text.slice(first.start,end),start:first.start,end});i=j;
 }
 return out;
}
const FOOD=/飯前|飯後|餐前|餐後|隨餐|空腹|用餐|食物|進食|餐中|餐時|飯中/;
const STRUCTURED=new Set(['common-07','common-08','common-10','common-13','common-14','common-15','common-17','common-18','common-19','common-20','common-21','common-28']);
function nonAnswerText(text,id){
 const n=norm(text).replace(/^[•●*]+/u,'');
 if(id==='common-23'){
  if(/[:：]$/.test(n)||/臨床試驗.*(?:不能|無法)直接.*比較|不同.*試驗.*(?:不能|無法).*比較/.test(n))return true;
  if(/^(?:與藥物有關的)?不良反應發生率.*(?:分類|如下)/.test(n)||/^在臨床試驗中.*副作用.*輕微且短暫/.test(n))return true;
  if(/^(?:下列為服用|以下所列|該產品仿單在其他段落)/.test(n))return true;
  const frequency=n.replace(/[|()（）<>≥≤≧≦~～%％\d.,\-–\[\]〔〕]/g,'').replace(/and|or/gi,'');
  if(/^(?:非常常見|極?常見|很常見|普通|少見|不常見|罕見|極罕見|未知)$/.test(frequency)||/^發生頻率.*與藥物/.test(frequency))return true;
 }
 if(id==='common-22'&&(/[:：]$/.test(n)||/危險.?效益必須加以考慮/.test(n)))return true;
 if(id==='common-25'&&(/[:：]$/.test(n)||/^.{0,8}併用下述藥品時/.test(n)))return true;
 return false;
}
function ownDose(p,quote){
 const match=norm(quote).match(/^(\d+(?:\.\d+)?)\s*(?:mg|毫克)\s*[-—:：]/);
 if(!match)return true;
 const own=[...norm(p.strength).matchAll(/(\d+(?:\.\d+)?)(?:mg|毫克)/g)].map(m=>Number(m[1]));
 return !own.length||own.includes(Number(match[1]));
}
const DANGER=/禁用|禁止|禁忌|不應|不得|不可|不能|不建議|避免|尚未建立|未建立|無法確立|尚未確立|須小心|應小心|應慎重|謹慎|上限|限於|不超過|不可超過/;
const HEADING=/^(?:[（(]?[\d一二三四五六七八九十a-z]+[）).、．]|[《【*])?.{1,18}[:：]$/iu;
const LABEL_ONLY=/^(?:[（(]?[\d一二三四五六七八九十]+[）).、．])?\*?(?:建議劑量|推薦劑量|一般建議劑量|劑量|用藥方法|給藥方式|成人|成年人|兒童|安全性摘要|不建議合併使用|不建議併用|慎重投與|最常見的不良反應|常見副作用|不常見的不良反應|對下列患者禁止投與|與適應症有關之使用上注意處)[:：]?$/u;
const METHOD_ONLY=/^(?:在.{0,80}臨床試驗中|表\d*[：:]|表\d*摘要|圖\d+[.：:]|根據.{0,50}安全性報告|以下.{0,10}列出)/u;
const GENERIC_ALIASES=new Set(['風險','注意','警語','嚴重','其他','劑量','調整','使用','用藥','併用','治療','監測','處理','病人','臨床','試驗','作用','成人','最高','最高劑量']);
function profile(t){
 if(PROFILES[t.id])return PROFILES[t.id];
 const title=norm(t.title),base=t.terms||t.aliases||[];
 const categoryTerms=t.kind==='類別題'?base.flatMap(x=>x.split(/[與及／、]/u)).map(x=>x.replace(/(?:相關用途|適應症|注意|警語|風險|交互作用|併用)$/u,'')):[];
 const terms=[...new Set([...base,...categoryTerms,...(/maoi/i.test(title)?['MAOIs','MAO inhibitors']:[])])].filter(x=>norm(x).length>=2&&!GENERIC_ALIASES.has(norm(x)));
 let roles=t.scope==='interaction'?['interaction','contra','warning','patient']:SAFETY;
 if(t.scope==='indication')roles=['indication'];
 if(/適應症|相關用途|感染用途/.test(title))roles=['indication'];
 else if(/機轉|血糖作用/.test(title))roles=['mechanism'];
 else if(/藥動|吸收|代謝|起效|持續多久/.test(title))roles=['pk','mechanism','dose'];
 else if(/試驗|臨床證據|hba1c|達標比較/.test(title))roles=['trial'];
 else if(/稀釋|輸注|餐時|飯前|飯後|塗抹|使用天數|療程|劑量|升到|量取|服法/.test(title))roles=['dose','warning','patient','renal','hepatic'];
 else if(/保存|儲存/.test(title))roles=['storage'];
 if(t.kind==='全文檢索')roles=null;
 return {roles,terms,pattern:null,whole:false};
}
// 工程核對使用同一份章節語意與題型設定，避免稽核另造一套排除規則。
export function inspectQuestionSources(p,t){return {profile:profile(t),sections:sources(p)}}
function evidence(p,t){
 const cfg=profile(t),hits=[],intervalDoseHits=[];
 for(const s of sources(p)){
  if(!meaningful(s.text))continue;
  if(cfg.roles&&!cfg.roles.some(r=>s.roles.has(r)))continue;
  if(t.id==='common-03'&&s.roles.has('excipient'))continue;
  if(t.id==='common-22'&&!s.contraindicationScope)continue;
  if(s.roles.has('trial')&&!(cfg.roles||[]).includes('trial')&&!((cfg.roles||[]).includes('adverse')&&s.roles.has('adverse')))continue;
  if(t.id==='common-23'&&['pregnancy','lactation'].some(r=>s.direct.has(r)))continue;
  const direct=cfg.dedicated&&s.direct.has(cfg.dedicated);
  const whole=cfg.whole||cfg.wholeRole&&s.direct.has(cfg.wholeRole);
  const titleHit=(cfg.terms||[]).some(a=>termMatches(s.title,a));
  const us=STRUCTURED.has(t.id)?priorityBlocks(s).filter(b=>!b.heading):['common-11','common-22','common-23','common-24','common-25','common-26','common-27','common-30','excipients'].includes(t.id)||t.scope==='interaction'||['產品專屬題','類別題'].includes(t.kind)?coherentUnits(s):units(s);
  if(t.id==='common-23'&&s.text.includes('|')&&/不良反應|副作用/.test(s.text)){
   const tableRows=[...s.text.matchAll(/(?:^|\n)([ \t]*\|[^\n]+)/gu)];
   const headers=new Map();
   const hasCommon=tableRows.some(m=>{const cells=m[1].split('|').slice(1).map(x=>x.trim());return /^(極?常見|很常見|非常常見)$/u.test(norm(cells[0]))&&!!cells[1]});
   for(const m of tableRows){const quote=m[1].trim(),cells=quote.split('|').slice(1).map(x=>x.trim()),first=cells[0]||'',frequency=/^(極?常見|很常見|非常常見|普通|少見|不常見|罕見|極罕見|未知)$/u.test(norm(first)),organ=/\|\s*(?:身體部位|器官系統)[^\n]*\|\s*(?:副作用|不良反應)/u.test(s.text);
    const label=(frequency||organ?cells[1]:first)||'';
    if(frequency&&hasCommon&&!/^(極?常見|很常見|非常常見)$/u.test(norm(first)))continue;
    if(!label||!/[\u4e00-\u9fff\u2f00-\u2fd5]/u.test(label)||!frequency&&!organ&&!/%/.test(quote)||/不良反應|副作用|系統器官|治療|安慰劑|試驗|總計|至少|下列|表\d/.test(label))continue;
    const start=s.text.indexOf(quote,m.index),captionMatch=[...s.text.slice(0,start).matchAll(/(?:^|\n)(表\s*\d+[^\n]*)/gu)].at(-1),caption=captionMatch?.[1]||'';
    if(!headers.has(caption)){const headerStart=captionMatch?s.text.indexOf(caption,captionMatch.index):s.text.indexOf('|');headers.set(caption,headerStart>=0&&start>headerStart?s.text.slice(headerStart,start).trim():'')}
    hits.push({section_id:s.id,no:s.no,title:s.title,quote,start,end:start+quote.length,score:85,order:p.sections.findIndex(a=>a.id===s.id)*10000+start,table_label:label,table_context:caption,table_header_quote:headers.get(caption),frequency_label:frequency?first:''});
   }
  }
  for(let i=0;i<us.length;i++){
   const u=us[i];
   if(nonAnswerText(u.quote,t.id))continue;
   if(['common-11','common-22','common-23','common-25'].includes(t.id)&&u.quote.length<5)continue;
   if(t.id==='common-11'){
    if(!FOOD.test(norm(u.quote)))continue;
    if(/最大初始劑量/.test(norm(u.quote)))continue;
    if(s.roles.has('interaction')&&!/(?:建議|應|須|請|服用).*(?:飯前|飯後|餐前|餐後|隨餐|進食)|(?:飯前|飯後|餐前|餐後|隨餐|進食|空腹).*(?:服用|服藥|固定)/.test(norm(u.quote)))continue;
    // 研究在空腹進行，不等於指示病人空腹服藥。
    if(s.roles.has('pk')&&!/(?:食物|進食|用餐).*(?:影響|吸收|生體|暴露|濃度)|(?:影響|吸收|生體|暴露|濃度).*(?:食物|進食|用餐)|(?:可|應|須|建議).*(?:飯前|飯後|空腹|隨餐)/.test(norm(u.quote)))continue;
    if(/^[•●〔【]?(?:食物的?影響|進食影響)[〕】]?$/u.test(norm(u.quote)))continue;
   }
   if(t.id==='common-25'&&s.roles.has('dose')&&!s.roles.has('interaction')&&!/併用|合用|其他.{0,12}(?:藥|製劑)|飲酒|酒精/.test(norm(u.quote)))continue;
   if(LABEL_ONLY.test(norm(u.quote).replace(/^[（(](\d+)[）)]/u,'$1.').replace(/[《》<>（）()]/g,'')))continue;
   if(t.id==='common-06'){const cutoff=s.text.search(/<與適應症有關|<和適應症|<適應症相關/u);if(cutoff>=0&&u.start>=cutoff)continue}
   if(/^衛[署部].*字第.*號$|^內衛.*字第.*號$/u.test(u.quote))continue;
   if(!ownDose(p,u.quote)&&(s.roles.has('dose')||s.roles.has('storage')))continue;
   const doseQuestion=['common-07','common-08','common-09','common-10'].includes(t.id);
   if(doseQuestion&&['pregnancy','lactation','trial','pk','mechanism','adverse'].some(r=>s.roles.has(r)))continue;
   if(t.id==='common-09'&&(!/\d\s*(?:mg|毫克|公克|克|錠|顆|片|粒|ml|毫升|單位|iu)/i.test(norm(u.quote))||/動物|大鼠|小鼠|兔子|母兔|老鼠|致癌|人類最大.*倍/.test(norm(u.quote))))continue;
   if(t.id==='common-09'&&!/(?:最[高大](?:建議|推薦|治療)?(?:劑?量|用量)|劑量(?:不(?:得|可)?超過|上限|限於)|(?:不可|不能|不得|不應|不)超過)[^。；，,]{0,55}\d+(?:\.\d+)?(?:mg|毫克|公克|克|錠|顆|片|粒|ml|毫升|單位|iu)/i.test(norm(u.quote)))continue;
   if(t.id==='common-23'&&(/^服用(?:\/使用)?本藥後/.test(u.quote)||METHOD_ONLY.test(u.quote)))continue;
   if(t.id==='common-22'){const caution=s.text.search(/慎重投[與予]|慎重給藥|使用上注意/u);if(caution>=0&&u.start>=caution)continue}
   if(t.id==='common-03'){
    const own=[...norm(p.strength).matchAll(/(\d+(?:\.\d+)?)(?:mg|毫克)/g)].map(m=>Number(m[1]));
    if(/^每.{0,14}含(?:有)?[:：]?$/u.test(norm(u.quote))&&us[i+1])continue;
    const n=norm(u.quote).replace(/[.…⋯]{2,}/g,'').match(/^([a-z-]+)(\d+(?:\.\d+)?)(mg|毫克)[。.]?$/);
    if(own.length===1&&n&&!own.includes(Number(n[2]))){const same=us.filter(x=>norm(x.quote).replace(/[.…⋯]{2,}/g,'').startsWith(n[1]));if(same.some(x=>own.some(v=>norm(x.quote).includes(String(v)+'mg')||norm(x.quote).includes(String(v)+'毫克'))))continue}
   }
   const termHit=(cfg.terms||[]).some(a=>termMatches(u.quote,a)||u.label&&termMatches(u.label,a));
   const patternHit=cfg.pattern?.test(norm(u.quote));
   if(!whole&&!termHit&&!patternHit&&!(titleHit&&!HEADING.test(u.quote)))continue;
   // 空標題、單獨劑量數字及指向下文的短語不能單獨變成答案。
   if(HEADING.test(u.quote)&&us[i+1])continue;
   if(u.quote.length<4&&!/\d/.test(u.quote)&&!whole&&!titleHit)continue;
   let quote=u.quote,start=u.start,end=u.end;
   // XML 轉出的表格一列可能跨多個換行，保留完整列與緊鄰標頭。
   if(quote.includes('|')&&!u.table){
    let a=i,b=i;while(a>0&&!us[a].quote.startsWith('|')&&i-a<5)a--;
    while(b+1<us.length&&!us[b+1].quote.startsWith('|')&&b-i<5)b++;
    start=us[a].start;end=us[b].end;quote=s.text.slice(start,end);
   } else if(!u.table&&((quote.length<22&&/[:：]$/.test(us[i-1]?.quote||''))||(t.id==='common-03'&&/^每.{0,14}含(?:有)?[:：]?$/u.test(norm(us[i-1]?.quote||'')))||/^(?:這些|此種|上述|因此|故|所以|然而|但此|這種|這類|二者|兩者)/.test(quote)&&us[i-1]?.quote.length<220)){
    start=us[i-1].start;quote=s.text.slice(start,end);
   }
   const safety=t.id==='common-06'?0:DANGER.test(norm(quote))?14:0;
   let score=(direct?65:0)+(whole?20:0)+(titleHit?10:0)+(termHit||patternHit?16:0)+safety;
   if(cfg.roles?.includes('dose')&&s.direct.has('dose'))score+=16;
   if(t.id==='common-09'&&/最高|最大|不超過|上限|不得超過|不可超過/.test(norm(quote)))score+=30;
   if(t.id==='common-09')score+=Math.max(0,100-quote.length)/3;
   if(t.id==='common-07'&&/起始|初期|初次|開始劑量/.test(norm(quote)))score+=25;
   if(t.id==='common-23'&&/常見|最常|較常|主要副作用/.test(norm(quote)))score+=20;
   if(t.id==='common-24'&&s.id==='WARNING')score+=30;
   if(['common-07','common-08','common-09','common-10','common-11'].includes(t.id)&&s.no==='3.1'&&s.direct.has('dose'))score+=55;
   if(['common-16','common-17'].includes(t.id)&&/肝[功機]能|腎[功機]能/.test(norm(quote)))score+=20;
   if(t.id==='common-29'){if(/儲存|貯存|保存/.test(s.title))score+=50;else if(/效期/.test(s.title))score+=15;else if(/包裝/.test(s.title))score+=5}
   if(t.id==='common-25'&&/尚未.*(?:試驗|研究)|目前.*尚未/u.test(quote))score-=25;
   if(t.source_section_ids?.includes(s.id))score+=8;
   const originalTable=u.table?(s.html||'').match(/<table\b[^>]*>[\s\S]*?<\/table>/gi)?.[priorityTables(s).findIndex(b=>b.quote===u.quote)]:null;
   (t.id==='common-08'&&patternHit&&!termHit&&!titleHit&&!whole?intervalDoseHits:hits).push({section_id:s.id,no:s.no,title:s.title,quote,context:s.context,text_source:s.text_source||'VALUE',start,end,score,dedicated:!!direct,order:p.sections.findIndex(a=>a.id===s.id)*10000+i,...(u.label?{scope_label:u.label,scope_quote:u.scopeQuote}:{}),...(originalTable?{original_table_html:originalTable}:{}),...(t.id==='common-11'?{food_effect_only:s.roles.has('pk')&&!s.roles.has('dose')&&!s.roles.has('patient')}:{} )});
  }
 }
 // 固定間隔只補足原本無答案的情況，避免擠掉既有的建議劑量與適應症條件。
 if(!hits.length)hits.push(...intervalDoseHits);
 const dedup=new Map();for(const e of hits){const k=e.section_id+':'+e.start+':'+e.end,old=dedup.get(k);if(!old||e.table_label||!old.table_label&&e.score>old.score)dedup.set(k,e)}const unique=[...dedup.values()];
 const cfgHasDedicated=cfg.dedicated&&unique.some(e=>e.dedicated);
 // 優先專屬章節；禁忌／警語仍留下限制，避免只引用「無須調整」而漏掉禁用。
 let scoped=cfgHasDedicated?unique.filter(e=>e.dedicated||DANGER.test(norm(e.quote))):unique;
 if(['common-07','common-08','common-09','common-10','common-11'].includes(t.id)&&scoped.some(e=>e.no==='3.1'&&sources(p).find(s=>s.id===e.section_id)?.direct.has('dose')))scoped=scoped.filter(e=>e.no==='3.1');
 if(t.id==='common-23'&&scoped.some(e=>e.table_label)){scoped=scoped.filter(e=>e.table_label).sort((a,b)=>a.order-b.order);const first=scoped[0];scoped=scoped.filter(e=>e.section_id===first.section_id&&e.table_context===first.table_context)}
 if(t.id==='common-25'&&scoped.some(e=>sources(p).find(s=>s.id===e.section_id)?.direct.has('interaction')))scoped=scoped.filter(e=>sources(p).find(s=>s.id===e.section_id)?.direct.has('interaction'));
 return scoped.sort((a,b)=>b.score-a.score||a.order-b.order);
}
function pick(candidates,t){
 const n=t.id==='common-03'?12:['common-22','common-23','common-24','common-25'].includes(t.id)?4:3;
 const chosen=[];let length=0;
 for(const e of candidates){
  if(chosen.some(x=>x.section_id===e.section_id&&(x.quote.includes(e.quote)||e.quote.includes(x.quote))))continue;
  if(chosen.length&&length+e.quote.length>1250)continue;
  chosen.push(e);length+=e.quote.length;if(chosen.length>=n)break;
 }
 return chosen;
}
function result(p,t,answer,status,ev=[],extra={}){
 return {engine_version:QA_VERSION,license:p.license,leaflet_version:p.version,source_sha256:p.source_sha256,question_id:t.id,question:t.title,answer_text:answer,status,evidence:ev,evidence_section_id:ev.map(e=>e.section_id),evidence_quote:ev.map(e=>e.quote),reviewer:null,reviewed_at:null,...extra};
}
function shortText(s){
 return String(s).replace(/[\u2f00-\u2fd5]/gu,c=>c.normalize('NFKC')).replace(/^[*•●]\s*/u,'').replace(/\[(?:詳?見|請參[閱考])[^\]]*\]/gu,'').replace(/[.…⋯]{3,}/gu,' ').replace(/[ \t\u00a0]+/g,' ').trim();
}
function summary(ev,t){
 if(t.id==='common-23'&&ev.some(e=>e.table_label))return '仿單表列不良反應（節錄）：'+[...new Set(ev.map(e=>e.table_label?shortText(e.table_label):'').filter(Boolean))].join('、')+'。\n（頻率、併用條件依原文；不同研究與劑量的發生率不直接比較。）';
 const parts=[],signatures=new Set();let length=0;
 for(const e of ev){
  let text=shortText(e.quote);
  if(STRUCTURED.has(t.id)&&e.scope_label&&!norm(text).startsWith(norm(e.scope_label)))text=e.scope_label+'：'+text;
  if(t.id==='common-09'){const amount=norm(text).match(/\d+(?:\.\d+)?(?:mg|毫克|公克|克|錠|顆|片|粒|ml|毫升)/);if(amount){const component=norm(text).slice(0,amount.index).match(/[a-z]{4,}/g)?.at(-1)||'';const signature=component+amount[0];if(signatures.has(signature))continue;signatures.add(signature)}}
  if(e.text_source==='TITLE'&&e.context){const parent=e.context.split('／').at(-1);if(/請勿使用|禁忌/.test(parent))text='請勿使用：'+text}
  if(['common-16','common-17','common-19','common-20','common-21'].includes(t.id)&&/^禁忌$/u.test(e.title))text='禁忌章節記載：'+text;
  if(!text||parts.some(x=>norm(x).includes(norm(text))))continue;
  if(parts.length&&length+text.length>(t.id==='common-03'?355:260))continue;
  if(text.length>360){
   // 不在句中截斷數字或條件；長段只給導讀，完整相關原文可展開。
   if(!parts.length)parts.push('仿單有相關限制，條件較多，請查看下方原文。');
   continue;
  }
  parts.push(text);length+=text.length;
  if(parts.length>=(t.id==='common-03'?12:3))break;
 }
 let answer=parts.join('\n');
 if(t.id==='common-23'&&!ev.some(e=>/常見|最常見|較常見/.test(e.quote)))answer='仿單列有以下不良反應；未必代表常見：\n'+answer;
 if(['common-22','common-24','common-25'].includes(t.id))answer+='\n（重點節錄，請配合來源章節確認完整限制。）';
 return answer;
}
function halfAnswer(p,t){
 const source=sources(p);const dose=source.filter(s=>s.roles.has('dose'));
 const own=[...norm(p.strength).matchAll(/(\d+(?:\.\d+)?)(?:mg|毫克)/g)].map(m=>Number(m[1]));
 const halves=dose.flatMap(s=>units(s).filter(u=>/半[錠片顆]|剝半|分錠|切半/.test(norm(u.quote))&&ownDose(p,u.quote)).filter(u=>{
  const labelled=norm(u.quote).match(/(\d+(?:\.\d+)?)(?:mg|毫克)(?:[a-z-]+)?(?:的)?半[錠片]/);
  return !labelled||!own.length||own.includes(Number(labelled[1]));
 }).map(u=>({section_id:s.id,no:s.no,title:s.title,quote:u.quote,start:u.start,end:u.end,text_source:s.text_source||'VALUE'})));
 const scores=(p.appearances||[]).map(a=>a.SCORE||'').filter(Boolean);
 const appearance=source.filter(s=>s.direct.has('form')).flatMap(s=>units(s).filter(u=>/刻痕|剝半線|分割線/.test(u.quote)).map(u=>({section_id:s.id,no:s.no,title:s.title,quote:u.quote,start:u.start,end:u.end})));
 const marked=scores.some(s=>! /^(無|无|不適用|未記載|none|no)$/i.test(s))||appearance.some(e=>!/無刻痕|無剝半|無分割|未設刻痕/.test(e.quote));
 const ev=[...appearance,...(scores.length?[{section_id:'APPEARANCES',no:'APPEARANCES',title:'藥品外觀識別',quote:scores.map(s=>'SCORE: '+s).join('\n')}]:[])];
 if(t.id==='common-05')return result(p,t,marked?'仿單外觀資料記載刻痕；刻痕不能證明分錠後劑量均勻。':scores.some(s=>/^(無|无|no|none)$/i.test(s))?'XML 外觀識別資料記載刻痕為「無」。':'仿單外觀資料未明確記載有刻痕。','原文候選',ev.slice(0,3));
 if(halves.length){const e=halves.slice(0,2);return result(p,t,summary(e,t),'待人工審核',e,{note:'僅依本規格 XML 明文；不據此推定所有情況皆可分錠。'})}
 return result(p,t,marked?'仿單未明確記載；但錠劑有刻痕剝半線。不得僅憑刻痕推定剝半後的劑量均勻性。':'仿單未明確記載是否可以剝半。','仿單未明確記載',ev.slice(0,3));
}
function validEvidence(p,list){return Array.isArray(list)&&list.length&&list.every(e=>e.quote&&(['INFO','APPEARANCES'].includes(e.section_id)?!e.original_table_html:p.sections.some(s=>s.id===e.section_id&&s.text.includes(e.quote)&&(!e.original_table_html||s.html.includes(e.original_table_html)))))}
function validReviewDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const day=new Date(value+'T00:00:00Z');
 const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 return !Number.isNaN(day.getTime())&&day.toISOString().slice(0,10)===value&&value<=today;
}
function pregnancyGrade(p,t){
 const ev=[];
 const grade=/(?:pregnancy\s*category|category)\s*[:：]?\s*[ABCDX](?=$|[\s。.,;；)）])|(?:分[類級]|等級|級別).{0,12}[ABCDX](?:[類級]|(?=$|[\s。.,;；)）]))|(?:^|[^a-z])[ABCDX][類級]/i;
 for(const s of sources(p))for(const u of coherentUnits(s)){
  if(grade.test(u.quote)&&(s.roles.has('pregnancy')||/懷孕|妊娠|孕婦|pregnancy/i.test(u.quote)))ev.push({section_id:s.id,no:s.no,title:s.title,quote:u.quote,start:u.start,end:u.end});
 }
 if(!ev.length)return result(p,t,'仿單未明確記載懷孕分級。可另選「懷孕注意事項」查看本份 XML 的限制。','仿單未明確記載',[]);
 return result(p,t,summary(ev.slice(0,2),t),'待人工審核',ev.slice(0,2),{note:'僅呈現本份 XML 明載分類，不從動物試驗或用藥警語推定級別。'});
}
export function answerQuestion(p,t,reviewed=[],pending=[]){
 if(t.license&&t.license!==p.license)return result(p,t,'本題屬其他許可證的產品專屬題；本產品仿單未明確記載。','仿單未明確記載');
 if(p.conflict)return result(p,t,'同版本 XML 內容有衝突，需先確認來源。','待人工審核');
 const holds=pending.filter(r=>r.license===p.license&&r.question_id===t.id&&r.source_sha256===p.source_sha256&&r.status==='pending');
 const approved=reviewed.find(r=>r.license===p.license&&r.question_id===t.id&&r.source_sha256===p.source_sha256&&r.status==='confirmed'&&typeof r.reviewer==='string'&&r.reviewer.trim()&&validReviewDate(r.reviewed_at)&&(!['excel-review-45','excel-review-238','excel-review-507','excel-review-clarification-5'].includes(r.origin)||r.approval_decision==='確認可採用')&&validEvidence(p,r.evidence));
 // 重匯僅撤回同來源核准；另一份表的待複核項目不撤回有效核准。舊無來源的阻擋仍維持原行為。
 const excelOrigins=['excel-review-45','excel-review-238','excel-review-507','excel-review-clarification-5'];
 const held=holds.find(r=>r.origin!=='engineering-audit'&&(!approved||!excelOrigins.includes(approved.origin)||!excelOrigins.includes(r.origin)||r.origin===approved.origin))||(!approved?holds.find(r=>r.origin==='engineering-audit'):null);
 if(held&&(held.origin!=='engineering-audit'||!approved)){const base=answerQuestion(p,t,[],[]),engineering=held.origin==='engineering-audit';return {...base,status:engineering?'待藥師複核（檢索候選）':'待藥師複核（Excel審核未通過）',...(engineering&&!base.evidence.some(e=>!['INFO','APPEARANCES'].includes(e.section_id))?{answer_text:'找到相關原文候選，但尚無足夠依據直接回答，待藥師複核。'}:{}),reviewer:null,reviewed_at:null,review_questions:[...new Set([...(base.review_questions||[]),...(held.reasons||[])])]};}
 if(approved)return result(p,t,approved.answer_text,'已確認（人工審核）',approved.evidence,{reviewer:approved.reviewer,reviewed_at:approved.reviewed_at});
 if(t.id==='pregnancy-grade')return pregnancyGrade(p,t);
 const cached=p.generated_answers?.[t.id];
 if(cached&&cached.engine_version===QA_VERSION&&cached.source_sha256===p.source_sha256&&cached.license===p.license&&!cached.status.startsWith('已確認（人工')&&(!cached.evidence.length||validEvidence(p,cached.evidence)))return {...cached,question:t.title};
 if(t.id==='common-01')return result(p,t,`${p.english}\n${p.name}\n${p.strength}`,'已確認（XML 基本資料）',[{section_id:'INFO',no:'INFO',title:'基本資料',quote:`CNAME: ${p.name}\nENAME: ${p.english}`}]);
 if(t.id==='common-02')return result(p,t,`${p.license}｜版本 ${p.version||'未記載'}｜${p.date||'未記載'}`,'已確認（XML 基本資料）',[{section_id:'INFO',no:'INFO',title:'基本資料',quote:`SNO: ${p.license}\nVERSION: ${p.version}\nVDATE: ${p.date}`}]);
 const priority=priorityAnswer(p,t,sources(p));
 if(priority){const {answer,status,evidence,...extra}=priority;return sectionSupplement(p,t,result(p,t,answer,status,evidence,extra))}
 if(t.id==='common-05')return halfAnswer(p,t);
 const candidates=evidence(p,t),ev=pick(candidates,t);
 if(!ev.length){
  const cfg=profile(t),images=sources(p).filter(s=>s.image_count&&(cfg.roles||[]).some(r=>s.roles.has(r)));
  const note=images.length?`相關章節含圖片，請查閱第 ${images.map(s=>s.no).join('、')} 節；圖中文字未納入自動問答。`:'';
  return sectionSupplement(p,t,result(p,t,'仿單未明確記載。','仿單未明確記載',[],{note,checked_sections:sources(p).filter(s=>(cfg.roles||[]).some(r=>s.roles.has(r))).map(s=>s.id)}));
 }
 let answer=summary(ev,t),status=t.risk?'待人工審核':'原文候選',note='';
 if(t.id==='common-11'&&ev.every(e=>e.food_effect_only)){
  answer='仿單未明確記載飯前或飯後服用；僅記載食物對藥動學的影響，待藥師複核。';
  status='待藥師複核（僅有食物影響資料）';
 }
 if(t.id==='common-13'&&!ev.some(e=>/磨粉|壓碎/.test(e.quote)))note='磨粉：仿單未明確記載。不可僅由咀嚼或吞服敘述推定其他處理方式。';
 if(t.id==='common-10'&&ev.some(e=>e.original_table_html)){answer='仿單列有用法用量表，請依原表核對適用族群、每日用量與次數。';status='待藥師複核（族群用量表）';note='按表內年齡、族群及每次用量逐列閱讀，不將不同列合併為單一用法。';}
 if(t.id==='common-10'&&!ev.some(e=>/(?:[一二三四五六七八九十\d、或至~～\-]+次|每日單次)/u.test(norm(e.quote)))){note='此處僅呈現每日用量原文；每日服用次數未明載，不自行換算。';status='待藥師複核（次數未明載）';}
 if(t.id==='common-09'&&/vildagliptin/i.test(p.ingredient)&&/metformin/i.test(p.ingredient)){
  const dose=sources(p).find(s=>s.no==='3.1'&&s.roles.has('dose'));
  const proposed=dose&&units(dose).find(u=>/每日建議劑量/.test(norm(u.quote))&&/100毫克vildagliptin/.test(norm(u.quote))&&/2000毫克metformin/.test(norm(u.quote)));
  if(proposed){answer='本複方同節記載每日建議量：100mg vildagliptin＋2000mg metformin。\n另列成分上限：vildagliptin 100mg／日、metformin 3000mg／日。';note='成分上限不等同複方產品的建議用量，須依個別療法由藥師複核。';status='待藥師複核（複方用量）';ev.unshift({section_id:dose.id,no:dose.no,title:dose.title,quote:proposed.quote,start:proposed.start,end:proposed.end});}
 }
 if(t.id==='common-16'){
  const renal=sources(p).find(s=>s.direct.has('renal')&&/15[-–~]29/.test(norm(s.text))&&/40mg/.test(norm(s.text))&&/<15/.test(norm(s.text))&&/尚未建立/.test(s.text));
  if(renal&&/febuxostat/i.test(p.ingredient+' '+p.english))answer=(/30[-–]89/.test(norm(renal.text))&&/無須調整劑量/.test(renal.text)?'Clcr 30–89 mL/min：無須調整劑量。\n':'')+'Clcr 15–29 mL/min：限 40mg 每天一次。\nClcr <15 mL/min：安全性及有效性尚未建立。';
  const ambiguous=sources(p).find(s=>/<15[-–]29/.test(norm(s.text)));
  if(ambiguous){status='待藥師複核（章節表述不一致）';note=`第 ${ambiguous.no} 節有「Clcr <15-29」不明確表述，須對照第 6.7 節複核。`;const u=units(ambiguous).find(u=>/<15[-–]29/.test(norm(u.quote)));if(u&&!ev.some(e=>e.section_id===ambiguous.id&&e.quote===u.quote))ev.push({section_id:ambiguous.id,no:ambiguous.no,title:ambiguous.title,quote:u.quote,start:u.start,end:u.end});}
 }
 return sectionSupplement(p,t,result(p,t,answer,status,ev,{note,evidence_total:candidates.length,summary_is_excerpt:true}));
}
const GENERIC_TITLES=/^(?:性狀|有效成分及含量|其他成分.*|成分|賦形劑|劑型|藥品外觀|適應症|用途.*|用法.*|調製方式|特殊族群.*|禁忌|警語.*|使用上注意事項|其他注意事項|其他使用上注意事項|有下列情形者.*|服用本藥後.*|服用\/使用本藥後.*|懷孕|哺乳|小兒|老年人|兒童|肝功能不全|腎功能不全|其他族群|交互作用|副作用.*|臨床重要副作用.*|臨床試驗.*|上市後經驗|過量|藥理特性|作用機轉|藥效藥理特性|藥物動力學特性|包裝.*|效期|儲存.*|貯存.*|類別|其他|劑量|建議劑量|給藥方式|成人|兒童使用|製造廠|藥商)$/u;
const SAFETY_TERMS=['低血糖','乳酸中毒','胰臟炎','橫紋肌溶解','血清素症候群','呼吸抑制','心衰竭','心律不整','QT','低血壓','高血鉀','低血鉀','低血鎂','出血','胃潰瘍','腸阻塞','偽膜性結腸炎','過敏','肝炎','黃疸','嗜睡','駕駛','酒精','葡萄柚','光敏感','依賴性','戒斷','自殺意念','體重增加','水腫','視力','青光眼','白內障手術','尿滯留','射精障礙','持續勃起','乳癌','血栓','感染','皮膚萎縮','密封敷料','透析','顯影劑','過量','打開膠囊','停藥減量','輸注','稀釋'];
const INTERACTION_TERMS=['warfarin','azathioprine','mercaptopurine','simvastatin','digoxin','clopidogrel','theophylline','colchicine','naproxen','lithium','cyclosporine','tacrolimus','sildenafil','tadalafil','ketoconazole','rifampicin','clarithromycin','erythromycin','diltiazem','verapamil','NSAIDs','MAOI','CYP3A4','P-glycoprotein','aspirin','甲狀腺製劑','制酸劑','消化酵素','腸吸附劑','硝酸鹽','利尿劑','鋰鹽'];
const CONDITIONS=['高血壓','心絞痛','糖尿病','痛風','高尿酸血症','癲癇','偏頭痛','眩暈','憂鬱症','失眠','胃食道逆流','胃潰瘍','十二指腸潰瘍','肝炎','疱疹','皰疹','過敏性鼻炎','蕁麻疹','皮膚炎','前列腺肥大','攝護腺肥大','勃起功能障礙','早洩','帕金森','巴金森','阿茲海默','骨質疏鬆','關節炎','疼痛','發燒','感染症'];
const WORD_STOP=new Set(['standard','clinical','clearance','adverse','reaction','protein','plasma','patient','study','cytochrome','substrate','potent','effects','effect','enzyme','enzymes','inhibitors','inhibitor','concentration','exposure','healthy','pharmacokinetic','metabolism','sodium','hydrochloride','sulfate','maleate']);
function key(s){let h=2166136261;for(const c of s){h^=c.codePointAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
export function generateProductQuestions(p){
 const out=[],seen=new Set(),src=sources(p);
 function add(title,terms,ids,scope='safety'){
  const token=terms.map(norm).join('|');if(seen.has(token))return;seen.add(token);
  out.push({id:`product-${p.license}-${key(token)}`,license:p.license,source_sha256:p.source_sha256,title,aliases:terms,terms,sections:[],source_section_ids:ids,kind:'產品專屬題',scope,risk:true});
 }
 for(const term of SAFETY_TERMS){const hits=src.filter(s=>[...s.roles].some(r=>SAFETY.includes(r))&&termMatches(s.text,term));if(hits.length)add(`${term}有什麼注意事項？`,[term],hits.map(s=>s.id));}
 for(const term of INTERACTION_TERMS){const hits=src.filter(s=>[...s.roles].some(r=>['interaction','contra','warning'].includes(r))&&termMatches(s.text,term));if(hits.length)add(`與 ${term} 併用有什麼限制？`,[term],hits.map(s=>s.id),'interaction');}
 for(const term of CONDITIONS){const hits=src.filter(s=>s.roles.has('indication')&&termMatches(s.text,term));if(hits.length)add(`${term}的適應症與限制是什麼？`,[term],hits.map(s=>s.id),'indication');}
 const interactionText=src.filter(s=>s.roles.has('interaction')).map(s=>s.text).join('\n'),names=new Set(interactionText.match(/[A-Za-z][A-Za-z-]{4,24}/g)||[]);
 for(const term of names){if(WORD_STOP.has(norm(term))||term.endsWith('-')||norm(p.ingredient).includes(norm(term)))continue;const hits=src.filter(s=>['interaction','contra','warning'].some(r=>s.roles.has(r))&&termMatches(s.text,term));if(hits.length)add(`${term} 的交互作用原文怎麼說？`,[term],hits.map(s=>s.id),'interaction');}
 for(const s of src){
  if(s.title.length>=3&&s.title.length<=35&&!GENERIC_TITLES.test(s.title)&&!/[。；]/.test(s.title)&&meaningful(s.text)&&s.text_source!=='TITLE'){
   const terms=[s.title.replace(/^\(?\d+\)?[.、]?\s*/,'')];
   if(terms[0].length>=3)add(`${terms[0]}有什麼記載？`,terms,[s.id]);
  }
 }
 return out.filter(q=>evidence(p,q).length);
}
