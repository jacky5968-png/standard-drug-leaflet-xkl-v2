import {searchProducts as searchOriginalProducts,rankedQuestions,answerQuestion,normalize} from './engine.js';
import {QA_VERSION} from './qa.js';
import {configureProductDisplay,productDisplay,searchProductsForDisplay} from './product-display.js?v=20261025-name-audit';
const searchProducts=(items,query)=>searchProductsForDisplay(items,query,searchOriginalProducts);
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let products=[],bank,extensions={questions:[],reviews:[]},auditHolds=[];
const cache=new Map(),selected={single:null,leaflet:null,compare:[null,null,null,null]},epochs={single:0,compare:0,leaflet:0};
const timers={};
const productPickers=new Map();
const selectedQuestions={single:null,compare:null},rankedFor={single:[],compare:[]};
const chosenProducts=view=>view==='compare'?selected.compare.filter(Boolean):selected[view]?[selected[view]]:[];
function syncQuery(view){if(view==='leaflet')return;const chosen=chosenProducts(view),t=selectedQuestions[view];$(view+'-summary').textContent=chosen.length?chosen.map(p=>productDisplay(p).english).join('、')+(t?' 的「'+t.title+'」':'，請選擇問題'):view==='compare'?'請選擇2～4項產品與共同問題':'請先選擇產品與問題';$(view+'-ask').disabled=!t||chosen.length<(view==='compare'?2:1);}
async function json(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw new Error(`無法載入 ${url}（${r.status}）`);return r.json()}
function fail(e,target='load-error'){$(target).hidden=false;$(target).textContent=e.message||String(e)}
function load(p){if(!cache.has(p.id))cache.set(p.id,(async()=>{const full=await json(p.data_url);if(p.qa_url){try{const qa=await json(p.qa_url);if(qa.engine_version===QA_VERSION&&qa.license===full.license&&qa.source_sha256===full.source_sha256){full.generated_answers=qa.answers;full.product_questions=qa.questions}}catch(e){console.warn('本產品問答資料無法載入，改依本份 XML 即時檢索。')}}return full})().catch(e=>{cache.delete(p.id);throw e}));return cache.get(p.id)}
function reset(view){if(view==='compare'){clearTimeout(timers.compare);epochs.compare++;$('compare-choices').replaceChildren();$('compare-results').replaceChildren();return}clearTimeout(timers[view]);epochs[view]++;if(view!=='leaflet'){selectedQuestions[view]=null;rankedFor[view]=[];$(view+'-choices').replaceChildren();$(view+'-results').replaceChildren();$(view+'-answer-layout').hidden=true;$(view+'-product-nav').replaceChildren();$(view+'-hint').textContent='先選擇產品與建議題目，再按「查詢」查看答案與來源。';syncQuery(view);}else $('leaflet-results').replaceChildren()}
function picker(container,view,slot=null){
  const id=view;
  container.innerHTML=`<div class="picker">${view==='leaflet'?`<label for="search-${id}">產品（中文／英文名稱、成分或許可證）</label>`:''}<div class="input-with-icon"><img src="assets/query-icons/search.svg" alt="" width="22" height="22"><input id="search-${id}" placeholder="搜尋商品名、成分或許可證" autocomplete="off" aria-controls="options-${id}" aria-expanded="false"></div><p id="caption-${id}" class="field-caption">${view==='compare'?'搜尋並加入2～4項產品':'輸入後才顯示符合品項'}</p><div id="options-${id}" class="product-options" role="group" aria-label="符合的產品"></div><div id="meta-${id}" class="selected-products"></div></div>`;
  const input=$('search-'+id),options=$('options-'+id),meta=$('meta-'+id);const defaultPlaceholder=input.placeholder;
  function renderSelection(){meta.replaceChildren();const list=chosenProducts(view);input.placeholder=list.length?'搜尋以更換產品':defaultPlaceholder;list.forEach(p=>{const c=document.createElement('div');c.className='selected-product';c.innerHTML=`<strong>${esc(productDisplay(p).english)}</strong><span>${esc(productDisplay(p).chinese)}</span>`;const remove=document.createElement('button');remove.type='button';remove.className='remove-product';remove.textContent='移除';remove.setAttribute('aria-label','移除 '+productDisplay(p).english);remove.onclick=()=>{if(view==='compare')selected.compare=selected.compare.map(x=>x?.id===p.id?null:x);else selected[view]=null;input.value='';options.replaceChildren();input.setAttribute('aria-expanded','false');reset(view);renderSelection();input.focus();if(view!=='leaflet')scheduleSuggestions(view)};c.append(remove);meta.append(c)});if(view==='leaflet'&&list.length){const p=list[0],identity=document.createElement('p');identity.className='field-caption leaflet-identity';identity.textContent=p.license+'｜版本 '+(p.version||'未記載')+'｜仿單日期 '+(p.date||'未記載');meta.append(identity);}$('caption-'+id).textContent=list.length?'已選擇 '+list.length+' 項'+(view==='compare'?'，可比較2～4項產品':''):view==='compare'?'搜尋並加入2～4項產品':'輸入後才顯示符合品項';}
  function choose(p){
    if(view==='compare'){const list=chosenProducts(view);if(list.some(x=>x.id===p.id)){options.replaceChildren();input.value='';input.setAttribute('aria-expanded','false');$('caption-'+id).textContent='此產品已選取，請搜尋其他產品。';return}if(list.length>=4){$('caption-'+id).textContent='已選4項，請先移除一項再加入。';options.replaceChildren();input.setAttribute('aria-expanded','false');return}selected.compare=[...list,p,...Array(3-list.length).fill(null)];}else selected[view]=p;
    reset(view);options.replaceChildren();input.value='';input.setAttribute('aria-expanded','false');renderSelection();
    if(view==='leaflet')return renderLeaflet();scheduleSuggestions(view);
  }
  productPickers.set(id,choose);
  input.addEventListener('input',()=>{
    if(view!=='compare'){selected[view]=null;reset(view);renderSelection();}options.replaceChildren();
    const hits=searchProducts(products,input.value);
    input.setAttribute('aria-expanded',String(!!input.value.trim()));
    if(!input.value.trim()){$('caption-'+id).textContent=view==='compare'?'已選擇 '+chosenProducts(view).length+' 項，搜尋以加入產品':'輸入後才顯示符合品項';return;}
    $('caption-'+id).textContent='符合品項 '+hits.length+' 項，可點選指定規格';
    if(!hits.length){options.innerHTML='<p class="muted quote">沒有符合的產品，請試用商品名、成分或許可證。</p>';return}
    hits.forEach(p=>{
      const b=document.createElement('button');b.className='product-option';b.type='button';
      b.innerHTML=`<strong>${esc(productDisplay(p).english)}</strong><span>${esc(productDisplay(p).chinese)}</span>`;
      b.onclick=()=>choose(p);options.append(b);
    });
  });
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){options.replaceChildren();input.setAttribute('aria-expanded','false')}if(e.key==='ArrowDown'){e.preventDefault();options.querySelector('button')?.focus()}if(e.key==='Enter'){e.preventDefault();options.querySelector('button')?.click()}});
  options.addEventListener('keydown',e=>{const list=[...options.querySelectorAll('button')],i=list.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();list[(i+1)%list.length]?.focus()}if(e.key==='ArrowUp'){e.preventDefault();list[(i-1+list.length)%list.length]?.focus()}if(e.key==='Escape'){options.replaceChildren();input.setAttribute('aria-expanded','false');input.focus()}});
}
function comparisonPicker(container,view,slot=null){
  const id=slot===null?view:`compare-${slot}`;
  container.innerHTML=`<div class="picker"><label for="search-${id}">${slot===null?'產品（中文／英文名稱、成分或許可證）':`產品 ${slot+1}${slot<2?'':'（選填）'}`}</label><input id="search-${id}" placeholder="輸入產品中文名、英文名、成分或許可證字號" autocomplete="off" aria-controls="options-${id}" aria-expanded="false"><div id="options-${id}" class="product-options" role="group" aria-label="符合的產品"></div><div id="meta-${id}"></div></div>`;
  const input=$('search-'+id),options=$('options-'+id),meta=$('meta-'+id);const defaultPlaceholder=input.placeholder;
  function set(p){if(view==='compare')selected.compare[slot]=p;else selected[view]=p;input.placeholder=p?'搜尋以更換產品':defaultPlaceholder;reset(view)}
  function choose(p){set(p);options.replaceChildren();input.value='';input.setAttribute('aria-expanded','false');
    meta.innerHTML=`<div class="product-meta"><strong class="selected-product-name">${esc(productDisplay(p).english)}</strong><span class="selected-product-chinese">${esc(productDisplay(p).chinese)}</span><p>${esc(p.category)}｜${esc(p.license)}｜版本 ${esc(p.version||'未記載')}｜仿單日期 ${esc(p.date||'未記載')}</p><button class="clear-product" aria-label="清除產品" type="button">×</button></div>`;
    meta.querySelector('button').onclick=()=>{set(null);input.value='';meta.replaceChildren();input.focus()};
    if(view==='leaflet')return renderLeaflet();
  }
  productPickers.set(id,choose);
  input.addEventListener('input',()=>{
    set(null);meta.replaceChildren();options.replaceChildren();
    const hits=searchProducts(products,input.value);
    input.setAttribute('aria-expanded',String(!!input.value.trim()));
    if(!input.value.trim())return;
    if(!hits.length){options.innerHTML='<p class="muted quote">沒有符合的產品，請試用商品名、成分或許可證。</p>';return}
    hits.forEach(p=>{
      const b=document.createElement('button');b.className='product-option';b.type='button';
      b.innerHTML=`<strong>${esc(productDisplay(p).english)}</strong><span>${esc(productDisplay(p).chinese)}</span><br><small>${esc(p.license)}｜${esc(p.category)}</small>`;
      b.onclick=()=>choose(p);options.append(b);
    });
  });
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){options.replaceChildren();input.setAttribute('aria-expanded','false')}if(e.key==='ArrowDown'){e.preventDefault();options.querySelector('button')?.focus()}if(e.key==='Enter'){e.preventDefault();options.querySelector('button')?.click()}});
  options.addEventListener('keydown',e=>{const list=[...options.querySelectorAll('button')],i=list.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();list[(i+1)%list.length]?.focus()}if(e.key==='ArrowUp'){e.preventDefault();list[(i-1+list.length)%list.length]?.focus()}if(e.key==='Escape'){options.replaceChildren();input.setAttribute('aria-expanded','false');input.focus()}});
}
async function askComparison(view='compare'){
  reset(view);const token=epochs[view],target=$(view+'-choices'),q=$(view+'-question').value.trim();
  const chosen=view==='single'?[selected.single]:selected.compare.filter(Boolean);
  if(chosen.some(p=>!p)||chosen.length<(view==='single'?1:2)){target.textContent=view==='single'?'請先搜尋並選擇產品。':'請選擇 2 至 4 項產品。';return}
  if(new Set(chosen.map(p=>p.id)).size!==chosen.length){target.textContent='比較產品重複，請改選不同許可證的產品。';return}
  if(q.length<2){target.textContent='請輸入至少兩個字的問題。';return}
  target.textContent='正在比對題目…';
  if(view==='single')$('single-hint').hidden=true;
  try{
    const [full,freshReviews,freshAudit]=await Promise.all([Promise.all(chosen.map(load)),json('data/extensions.json'),json('data/audit-holds.json')]);if(token!==epochs[view])return;extensions=freshReviews;auditHolds=freshAudit.engine_version===QA_VERSION?freshAudit.holds:[];
    const ranked=rankedQuestions(full,bank,q,extensions.questions);
    target.innerHTML=ranked.length?'<p class="choice-label">找到相關題目，請選擇最接近的一題，再查看答案與來源</p>':'沒有足夠相關的題目。請換個說法，或到「完整仿單」搜尋原文。';
    for(const t of ranked){const b=document.createElement('button');b.className='choice';b.type='button';b.innerHTML=`<small>${esc(t.kind)}</small><span>${esc(t.title)}</span><span aria-hidden="true">→</span>`;
      b.onclick=()=>{if(token!==epochs[view])return;const results=$(view+'-results');results.replaceChildren();full.forEach(p=>results.append(card(p,answerQuestion(p,t,extensions.reviews,[...(extensions.pending_reviews||[]),...auditHolds]))));results.scrollIntoView({behavior:'smooth',block:'start'})};target.append(b)}
  }catch(e){if(token===epochs[view])target.textContent=e.message}
}
function makeTablesReadable(root){
  for(const table of root.querySelectorAll('table')){
    if(table.closest('.table-scroll'))continue;
    const scroll=document.createElement('div');scroll.className='table-scroll';scroll.tabIndex=0;
    scroll.setAttribute('role','region');scroll.setAttribute('aria-label','XML 原文表格，可左右捲動');
    scroll.addEventListener('keydown',e=>{if(e.target!==scroll||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();scroll.scrollLeft+=(e.key==='ArrowRight'?1:-1)*Math.max(40,Math.round(scroll.clientWidth/3));}});
    table.before(scroll);scroll.append(table);
  }
}
function productHeading(p){return `<div class="answer-product"><div class="english">${esc(productDisplay(p).english)}</div><div class="chinese">${esc(productDisplay(p).chinese)}</div></div>`}
function displaySectionNo(p,s){if(s.no)return s.no;const visited=new Set();let a=s;while(a?.parent&&!visited.has(a.id)){visited.add(a.id);a=p.sections.find(x=>x.id===a.parent);if(a?.no)return a.no}return '未編號'}
function card(p,answer){
  const root=document.createElement('article');root.className='answer-card';
  // 外勤答案卡不呈現內部審核欄位；審核狀態與紀錄仍由原流程保留。
  const identity=[p.english,p.name,p.strength].join('\n'),label=productDisplay(p);
  const answerText=answer.question_id==='common-01'&&answer.answer_text===identity?label.english+'\n'+label.chinese:answer.answer_text;
  root.innerHTML=productHeading(p)+`<h3>${esc(answer.question)}</h3><p class="answer-text">${esc(answerText)}</p><div class="source-meta">${esc(p.license)}｜版本 ${esc(p.version)}｜${esc(p.date)}</div>`;
  const grouped=new Map();for(const e of answer.evidence){if(!grouped.has(e.section_id))grouped.set(e.section_id,[]);grouped.get(e.section_id).push(e)}
  let referenceNumber=0;
  const scopesShown=new Set();
  function scopeOriginal(piece,d){const key=piece.section_id+':'+piece.scope_quote;if(piece.scope_quote&&!piece.quote.includes(piece.scope_quote)&&!scopesShown.has(key)){const label=document.createElement('p');label.className='evidence-context';label.textContent='適用條件原文：'+piece.scope_quote;d.append(label);scopesShown.add(key)}}
  function appendOriginal(piece,d){if(piece.original_table_html){const table=document.createElement('div');table.className='source-table';table.innerHTML=piece.original_table_fragment?`<table><tbody>${piece.original_table_html}</tbody></table>`:piece.original_table_html;makeTablesReadable(table);d.append(table)}else{const pre=document.createElement('pre');pre.className='quote';pre.textContent=piece.quote;d.append(pre)}}
  for(const list of grouped.values()){
    const e=list[0],d=document.createElement('details');d.className='evidence';d.open=referenceNumber++===0;
    d.innerHTML=`<summary>XML 原文｜${['INFO','APPEARANCES'].includes(e.no)?'基本來源':'第 '+esc(e.no)+' 節'} · ${esc(e.title||'來源章節')}${list.length>1?' · '+list.length+' 個相關段落':''}</summary>`;
    let tableContext='',headerContext='';
    for(const piece of list){
      scopeOriginal(piece,d);
      if(piece.text_source==='TITLE'&&piece.context||piece.table_context&&piece.table_context!==tableContext){const context=document.createElement('p');context.className='evidence-context';context.textContent=piece.table_context||'章節脈絡：'+piece.context;d.append(context);tableContext=piece.table_context||''}
      if(piece.table_header_quote&&piece.table_header_quote!==headerContext){const header=document.createElement('pre');header.className='quote evidence-table-header';header.textContent=piece.table_header_quote;d.append(header);headerContext=piece.table_header_quote}
      appendOriginal(piece,d);
    }
    if(!['INFO','APPEARANCES'].includes(e.section_id)){const open=document.createElement('button');open.className='text-button source-jump';open.type='button';open.textContent='閱讀此章完整內容';open.onclick=()=>openSource(p,e.section_id);d.append(open)}
    root.append(d);
  }
  return root;
}
function singleCard(p,answer,index){
  const root=card(p,answer),label=productDisplay(p),text=root.querySelector('.answer-text');
  const copyText=`題目：${label.english} 的「${answer.question}」\n答案：${text.textContent}`;
  root.classList.add('single-qa-card');
  root.querySelector(':scope > h3').remove();
  root.querySelector('.answer-product .english').remove();
  const answerLabel=document.createElement('strong');answerLabel.textContent='答案：';text.prepend(answerLabel);
  const disclosure=document.createElement('details');disclosure.className='single-qa';disclosure.open=true;
  const heading=document.createElement('summary');heading.className='single-qa-summary';
  heading.innerHTML=`<span class="single-qa-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="single-qa-title">題目：<strong>${esc(label.english)}</strong> 的「${esc(answer.question)}」</span><span class="single-qa-state" aria-hidden="true">收合</span>`;
  disclosure.addEventListener('toggle',()=>{heading.querySelector('.single-qa-state').textContent=disclosure.open?'收合':'展開'});
  const body=document.createElement('div');body.className='single-qa-body';body.append(...root.childNodes);
  const actions=document.createElement('div');actions.className='single-qa-actions';
  const feedback=document.createElement('span');feedback.className='copy-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const copy=document.createElement('button');copy.type='button';copy.className='copy-answer text-button';copy.textContent='複製答案';
  copy.onclick=async()=>{copy.disabled=true;feedback.textContent='';try{await navigator.clipboard.writeText(copyText);feedback.textContent='已複製題目與答案'}catch{feedback.textContent='無法自動複製，請選取題目與答案文字複製。'}finally{copy.disabled=false}};
  actions.append(feedback,copy);body.append(actions);disclosure.append(heading,body);root.append(disclosure);
  return root;
}
async function openSource(p,sectionId){$('leaflet-query').value='';$('tab-leaflet').click();await productPickers.get('leaflet')(products.find(x=>x.id===p.license));const section=$('leaf-'+sectionId);if(section){section.open=true;section.scrollIntoView({behavior:'smooth',block:'start'})}}
async function suggestQuestions(view){
  reset(view);const token=epochs[view],target=$(view+'-choices'),q=$(view+'-question').value.trim(),chosen=chosenProducts(view),label=$(view+'-choice-label');
  if(chosen.length<(view==='single'?1:2)){label.textContent=view==='single'?'請先搜尋並選擇產品':'請選擇2～4項產品，再輸入共同問題';return;}
  if(q.length<2){label.textContent='輸入至少兩個字，搜尋建議問法';return;}
  label.textContent='正在比對相關題目…';
  try{
    const full=await Promise.all(chosen.map(load));if(token!==epochs[view])return;
    const ranked=rankedQuestions(full,bank,q,extensions.questions);
    rankedFor[view]=ranked;label.textContent=ranked.length?'建議問法，可點選確認':'沒有足夠相關的題目，請換個說法或到完整仿單搜尋。';
    for(const t of ranked){const b=document.createElement('button');b.className='choice';b.type='button';b.textContent=t.title;b.setAttribute('aria-pressed','false');b.onclick=()=>{if(!rankedFor[view].includes(t))return;epochs[view]++;$(view+'-results').replaceChildren();$(view+'-answer-layout').hidden=true;$(view+'-product-nav').replaceChildren();selectedQuestions[view]=t;target.querySelectorAll('button').forEach(n=>{n.classList.toggle('selected',n===b);n.setAttribute('aria-pressed',String(n===b))});syncQuery(view);$(view+'-hint').textContent='已選擇建議題目，按「查詢」查看精簡答案與XML來源。';};target.append(b)}
  }catch(e){if(token===epochs[view])label.textContent=e.message}
}
function scheduleSuggestions(view){reset(view);if($(view+'-question').value.trim().length>=2)timers[view]=setTimeout(()=>suggestQuestions(view),300);else $(view+'-choice-label').textContent='輸入問題，選擇建議問法';}
async function ask(view){const chosen=chosenProducts(view),t=selectedQuestions[view];if(!t||chosen.length<(view==='compare'?2:1))return;const token=++epochs[view];$(view+'-ask').disabled=true;$(view+'-hint').textContent='正在讀取本次查詢的答案與XML來源…';try{
 const[full,reviews,audit]=await Promise.all([Promise.all(chosen.map(load)),json('data/extensions.json'),json('data/audit-holds.json')]);if(token!==epochs[view])return;extensions=reviews;auditHolds=audit.engine_version===QA_VERSION?audit.holds:[];
 const results=$(view+'-results'),nav=$(view+'-product-nav');results.replaceChildren();nav.innerHTML=`<div class="product-nav-heading"><strong>查詢品項</strong><span>${full.length} 項</span></div>`;
 full.forEach((p,i)=>{const answer=answerQuestion(p,t,extensions.reviews,[...(extensions.pending_reviews||[]),...auditHolds]),article=view==='single'?singleCard(p,answer,i):card(p,answer);article.id=view+'-answer-'+i;if(view==='single'){const add=document.createElement('button');add.type='button';add.className='add-comparison text-button';add.textContent='加入比較';add.onclick=()=>{$('tab-compare').click();if(!$('compare-question').value.trim())$('compare-question').value=$('single-question').value;addComparisonProduct(chosen[i]);};article.querySelector('.answer-product').append(add);}results.append(article);const b=document.createElement('button');b.type='button';b.className='queried-product'+(i===0?' selected':'');b.innerHTML=`<strong>${esc(productDisplay(p).english)}</strong><span>${esc(productDisplay(p).chinese)}</span>`;b.onclick=()=>{nav.querySelectorAll('button').forEach(n=>n.classList.toggle('selected',n===b));const disclosure=article.querySelector('.single-qa');if(disclosure)disclosure.open=true;article.scrollIntoView({behavior:'smooth',block:'start'})};nav.append(b);});
 $(view+'-answer-layout').hidden=false;$(view+'-hint').textContent='已顯示上述詢問用詞的來源答案；修改輸入後請再次查詢。';
 }catch(e){if(token===epochs[view])$(view+'-hint').textContent=e.message;}finally{if(token===epochs[view])syncQuery(view);}}
function clearQuery(view){if(view==='compare')selected.compare=[null,null,null,null];else selected.single=null;reset(view);$('search-'+view).value='';$('search-'+view).setAttribute('aria-expanded','false');$('options-'+view).replaceChildren();$('meta-'+view).replaceChildren();$(view+'-question').value='';$('caption-'+view).textContent=view==='compare'?'搜尋並加入2～4項產品':'輸入後才顯示符合品項';$(view+'-choice-label').textContent='輸入問題，選擇建議問法';$('search-'+view).focus();}
function highlight(root,q){if(!q)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){const value=n.textContent,needle=q.toLowerCase();let i=0,pos;const f=document.createDocumentFragment();while((pos=value.toLowerCase().indexOf(needle,i))>=0){f.append(document.createTextNode(value.slice(i,pos)));const m=document.createElement('mark');m.textContent=value.slice(pos,pos+q.length);f.append(m);i=pos+q.length}if(i){f.append(document.createTextNode(value.slice(i)));n.replaceWith(f)}}}
async function renderLeaflet(){
  const p=selected.leaflet;if(!p)return;const token=++epochs.leaflet,target=$('leaflet-results'),q=$('leaflet-query').value.trim();target.textContent='正在載入此產品仿單…';
  try{const full=await load(p);if(token!==epochs.leaflet)return;const sections=full.sections.filter(s=>!q||normalize(s.no+' '+s.title+' '+s.text).includes(normalize(q)));
    target.replaceChildren();
    if(full.conflict){const warning=document.createElement('p');warning.className='notice';warning.textContent='同版本內容衝突，請先由管理者確認來源。';target.append(warning)}
    if(!sections.length){const msg=document.createElement('p');msg.className='muted';msg.textContent='此產品 XML 沒有符合的章節。';target.append(msg)}
    for(const s of sections){const d=document.createElement('details');d.className='leaf-section';d.id='leaf-'+s.id;d.open=!!q;d.innerHTML=`<summary>第 ${esc(displaySectionNo(full,s))} 節 · ${esc(s.title)}</summary>`;
      const fill=()=>{if(d.querySelector('.leaf-body'))return;const body=document.createElement('div');body.className='leaf-body';const assets=full.assets.filter(a=>a.section_id===s.id);body.innerHTML=s.html||(assets.length?'<p class="muted">此節含圖片，文字檢索不涵蓋圖中文字。</p>':'<p>此為上層章節，請閱讀下方子章節。</p>');highlight(body,q);makeTablesReadable(body);for(const a of assets){const img=document.createElement('img');img.className='asset';img.src=a.url;img.alt=a.label;img.loading='lazy';body.append(img)}d.append(body)};
      d.addEventListener('toggle',()=>{if(d.open)fill()});if(q)fill();target.append(d)
    }
    if(full.assets.some(a=>!a.section_id)){const images=document.createElement('details');images.className='leaf-section';images.innerHTML='<summary>XML 附件圖片（按需載入）</summary>';images.addEventListener('toggle',()=>{if(!images.open||images.querySelector('img'))return;for(const a of full.assets.filter(a=>!a.section_id)){const img=document.createElement('img');img.className='asset';img.src=a.url;img.alt=a.label;img.loading='lazy';images.append(img)}});target.append(images)}
    const history=document.createElement('details');history.className='history';history.innerHTML=`<summary>保留版本 · ${full.history.length} 份獨立內容</summary>`;
    full.history.forEach(v=>{const entry=document.createElement('div');entry.textContent=`版本 ${v.version}｜${v.date}｜SHA256 ${v.sha256.slice(0,12)}…`;history.append(entry)});target.append(history);
  }catch(e){if(token===epochs.leaflet)target.textContent=e.message}
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-view]').forEach(n=>{n.classList.toggle('active',n===b);if(n===b)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!=='view-'+b.dataset.view)});
picker($('single-picker'),'single');picker($('leaflet-picker'),'leaflet');for(let i=0;i<4;i++){const div=document.createElement('div');$('compare-pickers').append(div);comparisonPicker(div,'compare',i)}
function addComparisonProduct(p){const duplicate=selected.compare.findIndex(x=>x?.id===p.id);if(duplicate>=0){$('search-compare-'+duplicate).focus();return}const slot=selected.compare.findIndex(x=>!x);if(slot<0){$('compare-choices').textContent='已選4項，請先清除一項再加入。';return}productPickers.get('compare-'+slot)(p)}
for(const v of ['single']){
 const input=$(v+'-question');
 const suggest=()=>scheduleSuggestions(v);
 $(v+'-ask').onclick=()=>ask(v);
 input.addEventListener('input',e=>{if(!e.isComposing)suggest()});
 input.addEventListener('compositionstart',()=>reset(v));
 input.addEventListener('compositionend',suggest);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing)ask(v)});
 $(v+'-clear').onclick=()=>clearQuery(v);
 document.querySelectorAll(`.examples[data-target="${v}"] button`).forEach(b=>b.onclick=()=>{input.value=b.textContent;suggestQuestions(v)});
}
// 比較頁沿用原四個選品欄、查詢比較及點選題目後顯示答案的流程。
{
 const input=$('compare-question');
 const suggest=()=>{reset('compare');if(input.value.trim().length>=2)timers.compare=setTimeout(()=>askComparison(),350)};
 $('compare-ask').onclick=()=>askComparison();
 input.addEventListener('input',e=>{if(!e.isComposing)suggest()});
 input.addEventListener('compositionstart',()=>reset('compare'));
 input.addEventListener('compositionend',suggest);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing)askComparison()});
 document.querySelectorAll('.examples[data-target="compare"] button').forEach(b=>b.onclick=()=>{input.value=b.textContent;askComparison()});
}
$('leaflet-query').addEventListener('input',renderLeaflet);
window.addEventListener('focus',()=>json('data/extensions.json').then(value=>{extensions=value}).catch(()=>{}));
try{const [index,questions,custom]=await Promise.all([json('data/products-index.json'),json('data/questions.json'),json('data/extensions.json')]);products=index.products;configureProductDisplay(products);bank=questions;extensions=custom;$('import-count').textContent=`${products.length} 項獨立許可證 · ${new Set(products.map(p=>p.category)).size} 個資料分類`;$('header-count').textContent=products.length+'項產品'}
catch(e){fail(e);document.querySelectorAll('.primary').forEach(b=>b.disabled=true)}
