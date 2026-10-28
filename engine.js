import {generateProductQuestions} from './qa.js?v=28';
export {answerQuestion,generateProductQuestions} from './qa.js?v=28';
export const normalize = s => String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
export function searchProducts(products, query) {
  const terms=String(query||'').normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if(!terms.length)return [];
  return products.map(p=>({p, text:normalize([p.name,p.english,p.ingredient,p.strength,p.license].join(' '))}))
    .filter(x=>terms.every(t=>x.text.includes(normalize(t))))
    .sort((a,b)=>Number(normalize(b.p.english).startsWith(normalize(query)))-Number(normalize(a.p.english).startsWith(normalize(query))))
    .map(x=>x.p);
}
function category(p, bank) {
  const x=normalize(p.ingredient+' '+p.english);
  if(/febuxostat|allopurinol|benzbromarone/.test(x))return '高尿酸／痛風';
  if(/acarbose|gliclazide|glibenclamide|metformin|glimepiride|sitagliptin|vildagliptin|pioglitazone|repaglinide|miglitol/.test(x))return '糖尿病';
  if(/amlodipine|olmesartan/.test(x))return '高血壓';
  if(/levetiracetam|pregabalin|donepezil|escitalopram|zolpidem|alprazolam/.test(x))return '神經系統';
  return bank.categories[p.category]?p.category:null;
}
export function questionList(products,bank,custom=[]) {
  const byId=new Map(bank.common.map(q=>[q.id,q]));
  (bank.supplemental||[]).forEach(q=>byId.set(q.id,q));
  products.forEach(p=>(bank.categories[category(p,bank)]||[]).forEach(q=>byId.set(q.id,q)));
  products.forEach(p=>(p.product_questions||generateProductQuestions(p)).forEach(q=>byId.set(q.id,q)));
  custom.filter(q=>products.some(p=>p.license===q.license && p.source_sha256===q.source_sha256)).forEach(q=>byId.set(q.id,{...q,kind:'產品專屬題'}));
  return [...byId.values()];
}
function questionText(value){
 return normalize(value).replace(/喝酒|飲酒/g,'酒精').replace(/開車|駕車/g,'駕駛').replace(/餵母奶|餵奶/g,'哺乳').replace(/掰半|折半/g,'剝半').replace(/腎不好|腎臟不好|腎臟功能/g,'腎功能').replace(/肝不好|肝臟不好|肝臟功能/g,'肝功能').replace(/副反應|副反映/g,'副作用').replace(/相互作用|交互影響|互相影響/g,'交互作用').replace(/吃藥/g,'服藥').replace(/餐前/g,'飯前').replace(/餐後/g,'飯後').replace(/用藥持續天數|服藥天數|(?:要)?(?:吃|用)多久|(?:要)?(?:吃|用)幾天/g,'療程長度');
}
function phrase(value){
 return questionText(value).replace(/[\p{P}\p{S}]/gu,'').replace(/^(?:(?:我)?(?:想請問|請問|想知道|請教)|這個藥品|這個藥|這藥|本品)+/u,'').replace(/(?:有哪些|有什麼|是什麼|怎麼樣|如何|嗎|呢|的問題|相關問題|問題)$/u,'');
}
function similarPhrase(query,candidate){
 const a=phrase(query),b=phrase(candidate);
 if(a.length<3||b.length<3)return 0;
 if(a===b)return 18;
 // 僅對有足夠共同詞組的短問句補充排序，不猜測字誤或改換醫藥名詞。
 if(a.length>32||b.length>32)return 0;
 const grams=s=>new Set([...s].slice(1).map((c,i)=>s[i]+c));
 const x=grams(a),y=grams(b),shared=[...x].filter(g=>y.has(g)).length;
 const ratio=2*shared/(x.size+y.size);
 return shared>=2&&ratio>=0.65?Math.round(12*ratio):0;
}
export function rankedQuestions(products,bank,input,custom=[]) {
  const q=questionText(input); if(q.length<2)return [];
  const rawList=questionList(products,bank,custom);
  const comparable=new Map();
  for(const t of rawList){
    if(products.length>1&&t.kind==='產品專屬題'){
      const key=(t.scope||'safety')+':'+(t.terms||t.aliases).map(normalize).sort().join('|');
      if(!comparable.has(key))comparable.set(key,{...t,id:'compare-'+t.id,license:undefined,source_sha256:undefined,source_section_ids:undefined,kind:'專屬主題比較'});
    }else comparable.set(t.id,t);
  }
  const list=[...comparable.values()];
  const intents=[[/剝半|半錠|半顆|切半|分錠|分割/,'common-12'],[/肝功能|肝機能|肝臟|肝不全/,'common-17'],[/腎功能|腎機能|腎臟|腎不全|腎衰|clcr|crcl|洗腎/,'common-16'],[/孕婦|懷孕|妊娠/,'common-20'],[/哺乳|授乳/,'common-21'],[/半衰期|半減期|t1\/2/,'common-28'],[/兒童|小孩|小朋友|嬰兒|幼兒|青少年/,'common-19'],[/老年|老人|高齡|長輩/,'common-18'],[/最高|最大|最多.*(?:量|吃|用)|用量上限/,'common-09'],[/漏服|漏吃|忘記(?:吃|用|服)|忘了吃/,'common-14'],[/(?:一|每)天.*(?:幾|多少)次|服(?:用|藥)頻率|用藥頻率/,'common-10'],[/一次(?:要)?(?:吃|服|用).*(?:多少|幾)|單次用量|一次用量/,'common-08']];
  const faqIntents=[
   [/磨粉|磨碎|壓碎|碾碎|咀嚼|咬嚼|咬碎|嚼碎|(?:打開|開啟|拆開|剝開|拆|開)(?:膠囊|膠囊殼)|膠囊(?:殼)?[^。？?]{0,10}(?:打開|拆開|剝開|開啟|拆|開)/,'common-13'],
   [/副作用|不良反應|不舒服/,'common-23'],
   [/禁忌|禁用|(?:誰|哪些人|什麼人).*(?:不能|不可以|不適合)|(?:什麼|哪些)情況.*(?:不能|不可以|禁止)|不能(?:服用|使用|吃|用)的人/,'common-22'],
   [/交互作用|合併用藥|併用|合用|併服|一起(?:吃|用)|同時服用|其他藥/,'common-25'],
   [/飯前|飯後|空腹|隨餐|用餐|餐時|食物/,'common-11'],
   [/商品名|產品名|藥品名|中文名|英文名/,'common-01'],
   [/(?:^|[^非])有效成分|主成分|成分與含量|成分及含量/,'common-03'],
   [/劑型|外觀|形狀|顏色/,'common-04'],
   [/適應症|什麼用途|治什麼病/,'common-06'],
   [/警語|注意事項|注意什麼|要注意哪些/,'common-24'],
   [/作用機轉|藥理|如何作用/,'common-26'],
   [/賦形劑|其他成分|非有效成分|非活性成分/,'excipients'],
   [/懷孕分級|懷孕等級|妊娠分級|妊娠分類|孕婦分級|pregnancycategory/,'pregnancy-grade']
  ];
  const matched=intents.filter(([r])=>r.test(q));
  const faqMatched=faqIntents.filter(([r])=>r.test(q));
  const allMatched=[...matched,...faqMatched];
  const populationIds=/特殊族群|特殊人群/.test(q)&&!matched.length?['common-16','common-17','common-18','common-19','common-20']:[];
  const generalDose=/用法|用量|劑量|服法|(?:服用|服藥|用藥|使用)(?:方式|方法|說明)|(?:怎麼|如何)(?:吃|用|服用|服藥)|^(?:服用|服藥|用藥|dosage|dosing|dosageandadministration)$/u.test(q);
  // 概括問題先給可選標準題；明確族群、腎肝功能或最高量仍優先按原意檢索。
  const doseIds=allMatched.length||populationIds.length?[]:['common-08','common-10','common-07','common-11','common-09'];
  const scoped=populationIds.length?list.filter(t=>populationIds.includes(t.id)):allMatched.length?list.filter(t=>allMatched.some(([r,id])=>t.id===id||r.test(questionText(t.title+' '+t.aliases.join(' '))))):list;
  const generic=new Set(['劑量','調整','處理','注意','使用','治療','監測','風險','安全','用藥','建議','常見']);
  if(generic.has(q)&&!generalDose)return [];
  const ranked=scoped.map(t=>{
    const texts=[t.title,...t.aliases].map(questionText);
    const hits=[...new Set(texts)].filter(a=>a.length>=2&&!generic.has(a) && (q.includes(a)||(a.includes(q)&&q.length>=2)));
    let score=hits.reduce((n,a)=>n+Math.min(a.length,12),0);
    score+=Math.max(0,...texts.filter(a=>!generic.has(a)).map(a=>similarPhrase(q,a)));
    if(generalDose&&doseIds.includes(t.id))score+=80-doseIds.indexOf(t.id)*8;
    if(matched.some(([,id])=>t.id===id))score+=['common-08','common-10'].includes(t.id)&&matched.some(([,id])=>!['common-08','common-10'].includes(id))?50:100;
    if(faqMatched.some(([,id])=>t.id===id))score+=80;
    if(t.id==='common-11'&&faqMatched.some(([,id])=>id==='common-11'))score+=30;
    if(t.id==='common-25'&&/其他藥|藥物之間|併服|合併用藥|交互作用/.test(q))score+=30;
    if(populationIds.includes(t.id))score+=150-populationIds.indexOf(t.id)*8;
    if(t.id==='pregnancy-grade'&&faqMatched.some(([,id])=>id==='pregnancy-grade'))score+=100;
    if(t.id==='excipients'&&faqMatched.some(([,id])=>id==='excipients'))score+=100;
    // 明確問某種併用藥時，先推薦該藥的專屬題，而非展開全部交互作用。
    if(t.scope==='interaction'&&texts.some(a=>a.length>=2&&!generic.has(a)&&q.includes(a)))score+=120;
    if(t.kind==='共同題')score+=score?1:0;
    return {...t,score};
  }).filter(t=>t.score>=2).sort((a,b)=>b.score-a.score).slice(0,5);
  if(!ranked.length) {
    // 未知題只在所選產品 XML 原文明確命中時建立全文檢索題，不猜測醫藥意義。
    const clean=q.replace(/[?？!！。]/g,'').replace(/^(?:請問|這個藥|這藥|本品|我|能否|可不可以|可否|可以|能不能|能|可|想知道|與|和|跟)+/u,'').replace(/(?:一起吃|一起用|併用|合用|服用|使用)?(?:嗎|呢|如何|是什麼|怎麼辦|會怎樣|有什麼影響|有什麼限制|有什麼副作用|有什麼注意事項)+$/u,'');
    const term=[input.trim(),clean].find(term=>normalize(term).length>=2&&!generic.has(normalize(term))&&products.some(p=>p.sections.some(s=>normalize(s.text).includes(normalize(term)))));
    if(term)return [{id:'fulltext',title:`搜尋 XML 原文：「${term}」`,aliases:[term],sections:[],kind:'全文檢索',risk:true}];
  }
  return ranked;
}
