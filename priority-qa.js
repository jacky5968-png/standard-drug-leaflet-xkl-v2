/* 高風險三題：保留條件、排除其他藥物與試驗數字；所有引文仍是本 XML 連續原文。 */
import {complexClarification} from './complex-rules.js';
const n=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
const renal=/腎(?:臟)?(?:功能|機能|不全|衰竭|病|障害|疾病|疾患|受損|損傷|損害|絲球)|肝、腎|肝膽腎|腎或肝|腎臟或肝臟|肌(?:酸|胺酸|氨酸)酐|肌酐酸|creatinine|clcr|crcl|egfr|ccr|透析|洗腎|血滲析/i;
const action=/調整|減[低少半量]|降低.*(?:劑量|用量)|延長.*間隔|間隔|隔日|無[須需]|毋[須需]|不[須需必]|不建議|不推薦|不得|不[可宜應能]|禁[用忌止]|慎[重用]|小心|謹慎|審慎|考慮|適用|正常[的之]?劑量|一般(?:起始)?劑量|建議.*(?:劑量|起始|mg|毫克)|劑量.*(?:應為|限|超過)|未.*(?:研究|建立)|經驗有限/i;
const cap=/(?:最[高大](?:每日|單次|服用|使用|建議|推薦|治療)?(?:劑?量|用量)|(?:劑量|用量)(?:上限|限制|不得超|不可超|不應超)|不(?:得|可|能|應|要)?超過|不得超|不建議(?:使用)?(?:高於|大於)|不建議用超過|限量)/i;
const amount=/\d+(?:\.\d+)?\s*(?:mg|gm?|公絲|毫克|公克|克|錠|顆|片|粒|ml|毫升|單位|iu)/i;
const exclude=/動物|大鼠|小鼠|兔子|母兔|老鼠|人類最大.*倍|正常值上限|減藥|劑量的降低|每三日|血漿(?:最高|最大)濃度|最高血漿濃度/;
const clean=x=>String(x).normalize('NFKC').replace(/^[*•●]\s*/u,'').replace(/\s+/g,' ').trim();
const splitMention=/半[錠片顆]|剝半|分錠|切半|分割/u;
const splitBan=/(?:不可以|不可|不得|不應|不能|禁止|切勿|勿)[^。；，,]{0,35}(?:切半|分割|剝半|分錠)/u;
const handlingBan=/(?:不可以|不可|不得|不應|不能|禁止|切勿|不要|勿)[^。；，,]{0,25}(?:咀嚼|咬嚼|咬碎|嚼碎|嚼破|壓碎|弄碎|磨碎|磨粉)/u;
const heading=x=>{
 const a=clean(x);if(a.length>75||/[。；|]/u.test(a))return false;
 if(a==='患者須知')return true;
 if(/^(?:\d+\.){1,3}\d+\s*[^\d]/u.test(a))return true;
 if(/^[●◎]\s*治療|^[【〔《]/u.test(x)&&a.length<55)return true;
 if(/^\d+[.、]\s*[【〔《].*[】〕》]$/u.test(a))return true;
 if(a.length<60&&!/[，,]|(?:mg|毫克|劑量|使用|治療|調整)/i.test(a)&&/^(?:[（(]?\d+[）).、]\s*)?(?:老年(?:人|病人|患者)|小兒(?:病人|患者)|兒童(?:病人|患者)|孩童|兒童與青少年|特殊使用注意事項)/u.test(a))return true;
 if(/[:：]$/u.test(a)&&a.length<50&&!/[，,]/u.test(a))return true;
 if(a.length<40&&!/[，,]/u.test(a)&&/^(?:[-－●◎]\s*)?(?:[（(]?\d+[）).、]\s*)?(?:肝|腎)(?:臟)?[功機]能.*(?:不全|不良|障礙|受損)(?:的)?(?:患者|病人|者|用量|劑量)?$/u.test(a))return true;
 if(a.length<35&&!/[，,]/u.test(a)&&/^(?:特殊使用注意事項|細胞色素.*強抑制劑|血液透析|成人|成年人|孩童|小兒|兒童|老年人|一般原則|最大建議劑量|腎臟功能不全|腎功能不全者的劑量|肝功能不全病人)$/u.test(a))return true;
 return /^(?:[-－●◎]\s*)?(?:[（(]?\d+[）).、]\s*)?(?:一般)?(?:成人(?:及青少年)?(?:劑量|患者|病人)?|老年(?:人|病人|患者)?|小童劑量.*|\(?\d+[-~至]\d+歲\)?|兒童(?:病人)?(?:建議)?劑量|孩童劑量|腎功能(?:不全|不良|受損|障礙)(?:患者|病人|者)?|腎功能障礙病人|肝功能(?:不全|不良)(?:患者|病人)?|肝臟功能代償不全.*|中止治療|停藥|用法|高血壓|心絞痛|骨關節炎|類風濕性關節炎|僵直性脊椎炎|急性痛風性關節炎|原發性經痛|牙科手術後疼痛|婦科手術後疼痛|纖維肌痛|帶狀疱疹後神經痛|需用時服用|固定每日服用)$/u.test(a);
};
const decode=x=>x.replace(/&#x([\da-f]+);/gi,(_,v)=>String.fromCodePoint(parseInt(v,16))).replace(/&#(\d+);/g,(_,v)=>String.fromCodePoint(+v)).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,v)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'}[v]));
/** 按 HTML 的真正 table 邊界重建原文範圍，不憑折行猜表格起訖。 */
export function priorityTables(s){
 const out=[];let offset=0;
 for(const m of (s.html||'').matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)){
  const q=decode(m[0].replace(/<(?:p|div|br|tr|li|h[1-6])\b[^>]*>/gi,'\n').replace(/<t[dh]\b[^>]*>/gi,' | ').replace(/<\/(?:p|div|tr|li)>/gi,'\n').replace(/<[^>]+>/g,'' )).replace(/\n[ \t]*\n+/g,'\n').trim();
  const start=s.text.indexOf(q,offset);if(start>=0){out.push({quote:q,start,end:start+q.length,table:true});offset=start+q.length;}
 }
 return out;
}
/** 換行不是句點：包住換行的完整句子，另保留段內適應症與族群標題。 */
export function priorityBlocks(s){
 const lines=[...s.text.matchAll(/[^\n]+/gu)],out=[],tables=priorityTables(s);let label='',scopeQuote='',pending=null;
 const push=(start,end,extra={})=>{const q=s.text.slice(start,end).trim();if(q)out.push({quote:q,start:s.text.indexOf(q,start),end:s.text.indexOf(q,start)+q.length,label,scopeQuote,...extra})};
 const flush=()=>{if(pending){push(pending.start,pending.end);pending=null}};
 for(let i=0;i<lines.length;i++){
  const m=lines[i],line=m[0],start=m.index;
  const table=tables.find(t=>t.start>=start&&t.start<start+line.length);
  if(table){flush();push(table.start,table.end,{table:true});while(i+1<lines.length&&lines[i+1].index<table.end)i++;continue;}
  if(/^\s*\|/u.test(line)){
   flush();let end=start+line.length,j=i;
   // 同一表格的所有列，以及折行的儲存格。遇到表外一般文字即停止。
   while(j+1<lines.length){const next=lines[j+1][0];if(heading(next))break;
    if(/^\s*\|/u.test(next)){j++;end=lines[j].index+lines[j][0].length;continue;}
    if(/^[a-z][ )、.：:]|^[註注＊*]|^建議|^對於|^如果|^目前|^雖然|^上述|^本品|^有些|^由於|^一般|^注意/u.test(next))break;
    if(j+2<lines.length&&/^\s*\|/u.test(lines[j+2][0])||!/。/.test(next)&&next.length<60){j++;end=lines[j].index+next.length;continue;}break;
   }
   push(start,end,{table:true});i=j;continue;
  }
  if(heading(line)){flush();const contextOnly=/參考下表|如下表|條件如下|方式如下|下列|最大劑量|用法|劑量$/u.test(clean(line))&&!/成人|兒童|小童|孩童|腎|肝/.test(clean(line));if(!contextOnly){label=clean(line).replace(/[:：]$/u,'');scopeQuote=line.trim();}out.push({quote:line.trim(),start:start+line.indexOf(line.trim()),end:start+line.trimEnd().length,label,scopeQuote,heading:true,contextOnly});continue;}
  // 無句點的上一項，不得吞入下一個族群、條件或警語。
  if(/^(?:\d+[.)、]|[●◎]|[（(]\d+[）)]|(?:腎衰竭|肝功能|腎功能|腎臟|孩童|小孩|小兒|成人|新生兒|老人|一般原則|特殊使用注意事項|最大建議劑量|腎絲球體))/u.test(line.trim()))flush();
  const inline=line.replace(/[\u2f00-\u2fd5]/gu,c=>c.normalize('NFKC')).match(/^\s*((?:(?:\d+至\d+歲的)?(?:成人|孩童|小孩|小兒|兒童|新生兒|老人|老年人|兒童與青少年)|腎衰竭[^：:]{0,65}|肝功能[^：:]{0,35}|腎功能[^：:]{0,35})[^：:。]{0,25})[:：]/u);
  if(inline){flush();label=clean(inline[1]);scopeQuote=line.slice(inline.index,inline[0].lastIndexOf(':')>=0?inline[0].lastIndexOf(':'):inline[0].lastIndexOf('：')).trim();}
  let cursor=start;
  for(const part of line.match(/[^。]+。?|。/gu)||[]){
   const end=cursor+part.length;
   if(!pending)pending={start:cursor,end};else pending.end=end;
   if(/。$/u.test(part))flush();cursor=end;
  }
 }
 flush();return out;
}
const ev=(s,b)=>({section_id:s.id,no:s.no,title:s.title,quote:b.quote,start:b.start,end:b.end,context:s.context,text_source:s.text_source||'VALUE',scope_label:b.label||'',scope_quote:b.scopeQuote||'',...(b.table?{priority_table:true}:{})});
function unique(list){const out=[];for(const e of list)if(!out.some(a=>a.section_id===e.section_id&&(a.quote.includes(e.quote)||e.quote.includes(a.quote))))out.push(e);return out}
function finish(answer,status,evidence,reason,extra={}){return {answer,status,evidence:unique(evidence),review_reason:reason,...extra}}
function empty(sources,topic){
 const roles=topic==='renal'?['renal','dose','contra','warning']:['dose','patient'];
 const images=sources.filter(s=>s.image_count&&roles.some(r=>s.roles.has(r)));
 return finish('仿單未明確記載。','仿單未明確記載',[],images.length?'相關用量章節含圖片，尚待讀圖核對':'沒有找到可直接回答本題的 XML 明文',{
  note:images.length?`相關章節含圖片（第 ${[...new Set(images.map(s=>s.no))].join('、')} 節），圖中文字尚待人工核對。`:'',checked_sections:sources.filter(s=>roles.some(r=>s.roles.has(r))).map(s=>s.id)});
}
function concise(list,limit=320){const texts=list.map(e=>(e.scope_label&&!clean(e.quote).startsWith(e.scope_label)?e.scope_label+'：':'')+clean(e.quote));if(texts.join('\n').length>limit)return '';return texts.join('\n')}
function half(p,src){
 const found=[],handling=[];const own=[...n(p.strength).matchAll(/(\d+(?:\.\d+)?)(?:mg|毫克)/g)].map(m=>Number(m[1]));
 for(const s of src){
  if(!['dose','patient','form','warning'].some(r=>s.roles.has(r))||['pregnancy','lactation','trial','pk','mechanism'].some(r=>s.roles.has(r)))continue;
  for(const b of priorityBlocks(s)){
   if(b.heading)continue;
   if(b.table&&s.roles.has('dose')){
    const instruction=clean(b.quote).match(/(?:不可以|不可|不要|切勿|勿)(?:咀嚼|嚼碎|嚼破|壓碎|弄碎)[^。|]{0,100}整[顆粒錠片][^。|]{0,20}吞服[^。|]*。/u)?.[0];
    const tableIndex=priorityTables(s).findIndex(x=>x.quote===b.quote),html=(s.html||'').match(/<table\b[^>]*>[\s\S]*?<\/table>/gi)?.[tableIndex];
    if(instruction&&html)handling.push({...ev(s,b),handling_instruction:'仿單用法表（須按原表年齡條件核對）：'+instruction,original_table_html:html});
   }
   // 整顆吞服等服用限制也與剝半相關，但不能據此推定可否等量分錠。
   if(!b.table&&['dose','patient'].some(r=>s.roles.has(r))&&/整[顆粒錠片].{0,18}吞服|完整吞服/u.test(n(b.quote))&&b.quote.length<280){
    const labelled=n(b.quote).match(/^(\d+(?:\.\d+)?)(?:mg|毫克)[—:：-]/u);
    if(!labelled||!own.length||own.includes(Number(labelled[1])))handling.push(ev(s,b));
   }
   // 禁止咬嚼／弄碎可能另成一句，不能因沒有「整錠」而漏掉；保留原族群標題。
   if(!b.table&&['dose','patient'].some(r=>s.roles.has(r))&&handlingBan.test(n(b.quote))&&b.quote.length<280){
    const labelled=n(b.quote).match(/^(\d+(?:\.\d+)?)(?:mg|毫克)[—:：-]/u);
    if(!labelled||!own.length||own.includes(Number(labelled[1])))handling.push(ev(s,b));
   }
   if(!splitMention.test(n(b.quote)))continue;
   // 同份 XML 的其他規格半錠，不得套用於本規格。
   const labelled=[...n(b.quote).matchAll(/(\d+(?:\.\d+)?)(?:mg|毫克)(?:[a-z-]+)?(?:的)?半[錠片]/g)];
   if(labelled.length&&own.length&&!labelled.some(m=>own.includes(Number(m[1]))))continue;
   if(/^(\d+(?:\.\d+)?)(?:mg|毫克)[—:：-]/u.test(n(b.quote))&&!own.includes(Number(n(b.quote).match(/^\d+(?:\.\d+)?/)[0])))continue;
   if(!/半[錠片顆]|可.*(?:切半|分割|剝半|分錠)/u.test(n(b.quote))&&!splitBan.test(n(b.quote)))continue;
   found.push(ev(s,b));
  }
 }
 const prohibited=found.filter(e=>splitBan.test(n(e.quote)));
 if(prohibited.length)return finish(concise(prohibited)||'仿單明文禁止切半，請見下方原文。','待人工審核',prohibited,'明文限制，仍須專業審閱',{note:'依本規格 XML 的禁止切半敘述。',decision:'explicit_prohibition'});
 if(found.length){const relevant=unique([...found.slice(0,2),...handling.filter(e=>handlingBan.test(n(e.quote))).slice(0,1)]);
  return finish(concise(relevant)||'仿單有半錠用量記載及服用限制，適用族群及條件請見下方原文。','待人工審核',relevant,'半錠記載需核對處方適用條件',{note:'僅限原文列出的規格、族群與用量；不推定其他情境可分錠或劑量均勻性。',decision:'explicit_half_dose'});
 }
 const appearance=src.filter(s=>s.direct.has('form')).flatMap(s=>priorityBlocks(s).filter(b=>/刻痕|剝半線|分割線/.test(b.quote)).map(b=>ev(s,b)));
 const scores=(p.appearances||[]).map(x=>x.SCORE||'').filter(Boolean);
 const marked=scores.some(x=>/直線|十字|刻痕|剝半線|分割線/.test(x))||appearance.some(e=>!/無刻痕|無剝半|無分割|未設刻痕/.test(e.quote));
 if(handling.length){
  const relevant=unique(handling).sort((a,b)=>Number(handlingBan.test(n(b.quote)))-Number(handlingBan.test(n(a.quote)))).slice(0,2),instruction=relevant.map(e=>e.handling_instruction||((e.scope_label&&!n(e.quote).startsWith(n(e.scope_label))?e.scope_label+'：':'')+clean(e.quote))).join(' ');
  if(instruction&&instruction.length<=280)return finish(`仿單未明確記載是否可等量剝半。服用方式：${instruction}${marked?' 另記載錠劑有刻痕；不據此推定分錠劑量均勻性。':''}`,'待藥師複核（服用方式限制）',marked?[...relevant,...appearance.slice(0,1),...(scores.length?[{section_id:'APPEARANCES',no:'APPEARANCES',title:'藥品外觀識別',quote:scores.map(x=>'SCORE: '+x).join('\n')}]:[])]:relevant,'原文明載吞服方式；未明載是否可等量剝半',{note:'服用方式的敘述，不自行延伸為剝半許可或等量分錠結論。',decision:'whole_swallow_precaution'});
 }
 // 藥動章若明述本產品的基質緩釋構造，可補充劑型原文；不能轉成分錠許可或禁令。
 const matrix=!marked&&src.filter(s=>s.roles.has('pk')&&!['trial','pregnancy','lactation'].some(r=>s.roles.has(r))).flatMap(s=>priorityBlocks(s).filter(b=>{
  const text=n(b.quote),strengths=[...text.matchAll(/(\d+(?:\.\d+)?)(?:mg|毫克)/g)].map(m=>Number(m[1]));
  return !b.heading&&!b.table&&b.quote.length<=280&&/(?:該產品|本品|本藥)(?:是一種|是|為)緩釋劑型/u.test(text)&&/主成分/.test(text)&&/基質系統/.test(text)&&/緩慢持續.{0,8}釋出/u.test(text)&&!/(?:動物|大鼠|小鼠|對照藥)/u.test(text)&&(!strengths.length||own.length&&strengths.every(x=>own.includes(x)));
 }).map(b=>ev(s,b)))[0];
 if(matrix)return finish(`仿單未明確記載是否可以剝半。第 ${matrix.no} 節記載為緩釋劑型，主成分分散於基質系統內緩慢釋出；此段未說明可否分錠。`,'待藥師複核（劑型原文）',[matrix],'僅有本規格基質緩釋構造明文，未記載分錠許可',{decision:'matrix_release_context'});
 const evidence=marked?[...appearance,...(scores.length?[{section_id:'APPEARANCES',no:'APPEARANCES',title:'藥品外觀識別',quote:scores.map(x=>'SCORE: '+x).join('\n')}]:[])]:[];
 return finish(marked?'仿單未明確記載；但錠劑有刻痕剝半線。不得僅憑刻痕推定剝半後的劑量均勻性。':'仿單未明確記載是否可以剝半。','仿單未明確記載',evidence,marked?'僅有刻痕，未找到本規格半錠用量或分錠許可':'未找到本規格的明確分錠記載',{decision:marked?'score_only':'not_stated'});
}
function renalAnswer(p,src){
 let direct=[],cautions=[],tables=[];
 // 少數仿單把明確腎功能用量敘述放在藥動章；只接受病人用量的明文，不把排泄數據推成調整方案。
 for(const s of src.filter(s=>s.roles.has('pk')&&!['trial','adverse','interaction','pregnancy','lactation'].some(r=>s.roles.has(r))))for(const b of priorityBlocks(s)){
  const q=n(b.quote);
  if(!b.heading&&!b.table&&/腎功能不全(?:的)?(?:病人|患者)/.test(q)&&/(?:不需要|不須|不需|無須|無需).{0,8}(?:減少|調整)(?:用量|劑量)/.test(q)&&!/動物|大鼠|小鼠|健康受試者/.test(q))direct.push(ev(s,b));
 }
 for(const s of src){
  if(!['dose','renal','contra','warning','patient'].some(r=>s.roles.has(r))||['pregnancy','lactation','trial','pk','mechanism','adverse','interaction','overdose'].some(r=>s.roles.has(r)))continue;
  let mode=s.direct.has('renal'),previous='',activeLabel='';
  const blocks=priorityBlocks(s);
  for(const b of blocks){
   if(b.label!==activeLabel){activeLabel=b.label;mode=renal.test(n(b.label));}
   if(b.heading){if(!b.contextOnly)mode=renal.test(n(b.quote));previous=b.quote;continue;}
   const q=n(b.quote),related=renal.test(q)||mode;
   if(!related)continue;
   if(!renal.test(q)&&/肝功能|肝臟|child-pugh|pde5|cyp3a4|酒精|白內障|青光眼|心血管|冠狀動脈/.test(q))continue;
   if(/胎兒|孕婦|羊水|新生兒腎|腎臟外科手術|lithium.*排泄|鋰.*排泄/.test(q))continue;
   if(b.table){if(/劑量|用量|給藥|mg|毫克|錠|小時/.test(q)&&(/肌.*酐|腎|creatinine|clcr|crcl|ccr|清除|廓清|透析|正常|輕度|中度|重度|<|≥|\d+至\d+/.test(q))){
    const e=ev(s,b),mixed=/\|\s*成人\s*\|/.test(b.quote)&&/\|\s*腎衰竭\s*\|/.test(b.quote);
    if(mixed){const row=b.quote.match(/(?:^|\n)[ \t]*\|\s*腎衰竭\s*\|/u);e.start=b.start+row.index;e.quote=s.text.slice(e.start,b.end).trim();e.start=s.text.indexOf(e.quote,e.start);e.end=e.start+e.quote.length;}
    tables.push(e);
    const pos=blocks.indexOf(b);
    for(const surrounding of blocks.slice(Math.max(0,pos-4),pos))if(!surrounding.heading&&!surrounding.table&&/下表.*適用|如果沒有合適|各別成分|而不是單錠|表\s*\d+[:：].*腎/u.test(n(surrounding.quote)))direct.push({...ev(s,surrounding),priority_note:true});
    for(const surrounding of blocks.slice(pos+1,pos+5)){
     if(surrounding.heading)break;
     if(!surrounding.table&&/^(?:[a-z][ \u00a0]|[＊*]|[註注])|口服液劑|血液透析後|透析當天|合適.*劑量|各別成分/u.test(surrounding.quote))direct.push({...ev(s,surrounding),priority_note:true});
    }
   }continue;}
   if(!action.test(q)&&!s.roles.has('contra'))continue;
   const e=ev(s,b);if(/肝功能|心臟|心血管|冠狀動脈/.test(e.scope_label)&&!renal.test(n(e.scope_label))){e.scope_label='';e.scope_quote='';}
   // 把段落內的禁忌／慎重條件附上；不能僅因位於「禁忌」章即宣稱禁用。
   if(/慎重|注意|危險.*效益/.test(previous)&&!e.scope_label)e.scope_label=clean(previous);
   const doseAction=/調整.*(?:劑量|用量|間隔)|(?:劑量|用量).*調整|(?:減低|減少|減量|降低|減半).*(?:劑量|用量)|(?:劑量|用量).*(?:減低|減少|減量|降低|減半|不[可得應能要]?超過|應為|限制)|減量|較低劑量|無[須需].*調整|不[須需必].*調整|毋[須需].*調整|(?:正常|一般)(?:起始)?[的之]?劑量|建議.*(?:mg|毫克|起始|劑量)|(?:間隔|隔日)|禁用|不[可宜得應能].*使用|不建議.*(?:使用|服用|用於|用在)|不推薦|考慮.*劑量|不得多於|適用|經驗有限|未.*(?:研究|建立)/.test(q);
   if(renal.test(q)&&doseAction&&s.roles.has('dose'))mode=true;
   if(!renal.test(q)&&b.label&&!renal.test(n(b.label)))continue;
   if(!renal.test(q)&&/老年性病人|老年人|孩童|兒童|酒精|肝功能|心血管/.test(q))continue;
   if(s.roles.has('contra')&&!action.test(q)){
    const lead=s.text.slice(0,b.start);
    e.scope_label=/慎重|危險.*效益|注意/.test(lead)?'禁忌章節的慎用／風險效益提醒':'禁忌章節列有';
    if(!/慎重|危險.*效益|注意/.test(lead))direct.push(e);else cautions.push(e);
   }else if(doseAction||/審慎考慮|不得給[與予]/.test(q))direct.push(e);else cautions.push(e);
  }
 }
 direct=unique(direct);tables=unique(tables);cautions=unique(cautions);
 // 真正的腎功能用量表優先；保留禁用與不同腎功能階段，避免僅擷取三句。
 const all=unique([...tables,...direct]);
 if(!all.length){
  if(!cautions.length)return empty(src,'renal');
  return finish('腎功能劑量調整：仿單未明確記載；僅列有慎用或監測提醒。','仿單未明確記載',cautions.slice(0,2),'僅有腎臟相關慎用／監測文字，沒有明確調整方案',{note:'下方原文不是可直接採用的腎功能劑量表。',decision:'caution_only'});
 }
 let answer=concise(all,330),reason='有明文調整／限制，仍須依族群核對',status='待人工審核',note='';
 if(all.some(e=>!/[。.)）]$/u.test(e.quote.trim())&&!e.priority_table)){
  answer='仿單有腎功能相關調整或限制；部分文字未完整結句，請核對下方原文及來源章節。';reason='原文有未完整結句／需讀取後續內容';status='待藥師複核（原文條件）';
 }
 if(tables.length){answer='仿單依腎功能分級列有用量表；須依清除率、原療程及透析條件選用，請見下方原表。';reason='腎功能分級表需要個別套用，請藥師核對';status='待藥師複核（腎功能分級表）';}
 else if(!answer){answer='仿單依腎功能及治療情境分列調整與使用限制，請見下方相關原文。';reason='多個腎功能階段／療程，不能濃縮成單一劑量';status='待藥師複核（腎功能條件）';}
 const ambiguous=src.find(s=>/<15[-–]29/.test(n(s.text)));
 if(ambiguous&&/febuxostat/i.test(p.ingredient+' '+p.english)){
  const section=src.find(s=>s.direct.has('renal')&&/15[-–~]29/.test(n(s.text))&&/40mg/.test(n(s.text))&&/尚未建立/.test(s.text));
  if(section){const items=priorityBlocks(section).filter(b=>!b.heading&&/30[-–]89|15[-–~]29|<15/.test(n(b.quote)));const text=n(items.map(b=>b.quote).join('\n'));if(/30[-–]89/.test(text)&&/無須調整劑量/.test(text)&&/15[-–~]29/.test(text)&&/40mg/.test(text)&&/<15/.test(text)&&/尚未建立/.test(text)){all.splice(0,all.length,...items.map(b=>ev(section,b)));answer='Clcr 30–89 mL/min：無須調整劑量。\nClcr 15–29 mL/min：限 40mg 每天一次。\nClcr <15 mL/min：安全性及有效性尚未建立。';}}
  const b=priorityBlocks(ambiguous).find(b=>/<15[-–]29/.test(n(b.quote)));if(b)all.push(ev(ambiguous,b));status='待藥師複核（章節表述不一致）';note=`第 ${ambiguous.no} 節有「Clcr <15-29」不明確表述，須對照第 6.7 節複核。`;reason='同份 XML 的 Clcr 區間表述不一致';
 }
 const combined=n(all.map(e=>e.quote).join('\n'));
 const defined=amount.test(combined)||/無[須需]|不[須需必].*(?:調整|減少劑量)|毋[須需]|正常[的之]?劑量|一般(?:起始)?劑量|禁用|不[可宜得應能].*(?:使用|服用|給與|給予)|不建議.*(?:使用|服用|用於)|禁忌章節列有/.test(combined+' '+all.map(e=>e.scope_label).join(' '));
 if(!defined&&!tables.length&&!note){note='調整幅度或具體用量：仿單未明確記載；不得自行推算。';reason='僅有減量／慎用／資料有限敘述，缺少明確數值方案';status='待藥師複核（調整方案未明載）';}
 return finish(answer,status,all,reason,{note,decision:tables.length?'renal_table':'renal_statement'});
}
function maximum(p,src){
 let list=[];
 for(const s of src){
  if(!s.roles.has('dose')||['pregnancy','lactation','trial','pk','mechanism','adverse','overdose'].some(r=>s.roles.has(r)))continue;
  for(const b of priorityBlocks(s)){
   if(b.heading||b.table||!cap.test(n(b.quote))||!amount.test(n(b.quote))||exclude.test(n(b.quote)))continue;
   if(s.no==='3.3'&&s.text.includes('|')&&b.start>s.text.indexOf('|'))continue;
   const q=n(b.quote);
   // 選取必須是劑量上限，不是天數上限，或其他合併藥品的上限。
   if(!/(?:最[高大][^。；]{0,35}(?:量|mg|毫克)|不(?:得|可|能|應|要)?超過[^。；，,]{0,35}\d+(?:\.\d+)?(?:mg|毫克|gm?|公克|克|錠|顆|片|粒|ml|毫升|單位|iu)|不得超\d|不建議(?:使用)?(?:高於|大於)\d|不建議用超過\d|限量)/i.test(q))continue;
   if(/aspirin(?:的|之)?劑量不[可得應]?超過/.test(q)&&!/aspirin|acetylsalicylic/i.test(p.ingredient))continue;
   if(/每邊|單一位置|分兩個位置|溶解後|注射用水/.test(q))continue;
   if(/sildenafil.*\d+mg/.test(q)&&!/sildenafil/i.test(p.ingredient)&&!q.includes('tadalafil'))continue;
   if(/^\d+(?:\.\d+)?(?:mg|毫克)[—:：-]/u.test(q)&&!n(p.strength).includes(q.match(/^\d+(?:\.\d+)?(?:mg|毫克)/)[0]))continue;
   const e=ev(s,b);if(/(?:骨關節炎|類風濕性關節炎|僵直性脊椎炎|急性痛風|原發性經痛|牙科手術|婦科手術).*最高/.test(q)){e.scope_label='';e.scope_quote='';}list.push(e);
  }
 }
 list=unique(list);
 if(!list.length)return {...empty(src,'max'),decision:'no_explicit_max'};
 const general=list.filter(e=>!/併用|合併使用|同時(?:使用|服用)|抑制劑|肝功能|腎功能|肌酸酐|clcr|crcl|65歲|老年|小兒|兒童|孩童|新生兒|cyp2c19/.test(n(e.quote)+' '+n(e.scope_label))&&!/新生兒、兒童及青少年/.test(n(e.quote)));
 // 一般上限放前；條件性上限仍保留，但不得代替一般上限。
 list=[...general,...list.filter(e=>!general.includes(e))];
 const compound=/\+| and |複方|\/|glimepiride.*metformin|vildagliptin.*metformin|pioglitazone.*metformin|sitagliptin.*metformin/i.test(p.ingredient+' '+p.english);
 let answer=concise(list,330),status='待人工審核',note='',reason='有最高用量明文，仍須核對適應症與族群';
 if(!answer){answer='最高劑量依適應症、族群或併用藥物而異，仿單未提供適用所有情境的單一上限。請見下方相關原文。';status='待藥師複核（最高劑量條件）';reason='多個條件性上限，需依適應症／族群套用';}
 if(!general.length){answer='一般最高劑量：仿單未明確記載；下方僅有特定族群、療程或併用條件的上限。';status='待藥師複核（條件性上限）';reason='僅有特定情境上限，不能當作所有病人的最高劑量';}
 if(compound&&list.some(e=>/metformin|vildagliptin|pioglitazone|glimepiride/i.test(e.quote))){status='待藥師複核（複方用量）';note='成分上限不等同複方產品的建議用量；不得據此自行換算最高錠數。';reason='複方各成分上限與產品推薦量需分開核對';}
 if(/furosemide/i.test(p.ingredient)&&list.some(e=>/600mg/.test(n(e.quote))&&/4g/.test(n(e.quote)))){status='待藥師複核（上限與例外）';answer='仿單分列成人與兒童最高量，另有慢性腎衰竭的高劑量敘述；不能視為一般用量。請核對下方原文。';reason='同段列有一般上限與慢性腎衰竭例外，需專業判讀';}
 if(/vildagliptin/i.test(p.ingredient)&&/metformin/i.test(p.ingredient)){
  const s=src.find(s=>s.no==='3.1'&&s.roles.has('dose'));
  const b=s&&priorityBlocks(s).find(b=>/每日建議劑量為100毫克vildagliptin加上2000毫克metformin/.test(n(b.quote)));
  if(b&&list.some(e=>/3000毫克/.test(n(e.quote)))){list.unshift(ev(s,b));answer='本複方同節記載每日建議量：100mg vildagliptin＋2000mg metformin。\n另列成分上限：vildagliptin 100mg／日、metformin 3000mg／日。';}
 }
 return finish(answer,status,list,reason,{note,decision:general.length?'maximum_statement':'conditional_maximum'});
}
export function priorityAnswer(p,t,src){
 if(/^category-.*腎功能/u.test(t.id)||t.id==='category-高尿酸／痛風-11'||['category-代謝系統-18','category-糖尿病-18'].includes(t.id))t={...t,id:'common-16'};
 const checked=complexClarification(p,t);if(checked)return checked;
 if(t.id==='common-12')return half(p,src);
 if(t.id==='common-16')return renalAnswer(p,src);
 if(t.id==='common-09')return maximum(p,src);
 return null;
}
