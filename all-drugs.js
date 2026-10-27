import {validateManifest,dataPath,officialUrl,licenseStatus,taiwanToday} from './all-drugs-core.js';
import {productPhoto} from './product-photos.js?v=20261027-photo20';
const $=id=>document.getElementById(id);
const create=(tag,text,className)=>{
  const element=document.createElement(tag);
  if (text!==undefined) element.textContent=String(text);
  if (className) element.className=className;
  return element;
};
let mounted=false, manifest=null, manifestPending=null, worker=null, seq=0, timer=null, last=null, detailSeq=0;
const detailCache=new Map();
const base=new URL('data/all-drugs/',import.meta.url);
async function loadPublicationStatus() {
  if (!['localhost','127.0.0.1','[::1]'].includes(location.hostname)) return;
  try {
    const response=await fetch(new URL('reports/publication-status.json',import.meta.url),{cache:'no-store'});
    if (!response.ok) return;
    const status=await response.json();
    let notice=$('all-publication-notice');
    if (!notice) {
      notice=create('aside',undefined,'all-publication-notice');notice.id='all-publication-notice';
      notice.setAttribute('aria-label','本機資料發布狀態');
      $('all-source-date').closest('.all-heading').after(notice);
    }
    const labels={initial_publication_pending:'待首次發布確認',pending:'本機有新資料，待確認發布',current:'資料與發布紀錄一致',update_failed:'資料更新失敗，請先檢查'};
    const title=create('strong',labels[status.state]||'請檢視本機更新狀態');
    const text=create('p',status.needs_publication?'本機資料尚待檢視；剛更新後請重新整理預覽。只有你回覆「確認發布」後，才會進行發布作業。':'目前未發現與正式發布紀錄的資料差異。');
    const details=create('a','查看更新與待發布狀態');details.href=new URL('reports/publication-status.html',import.meta.url).href;details.target='_blank';details.rel='noopener noreferrer';
    notice.replaceChildren(title,text,details);
  } catch { /* Local administration status never blocks public search. */ }
}
async function json(url) {
  const response=await fetch(url);
  if (!response.ok) throw new Error('無法讀取資料（'+response.status+'），請重試');
  return response.json();
}
async function loadManifest() {
  if (manifest) return manifest;
  if (!manifestPending) manifestPending=json(new URL('manifest.json',base)).then(validateManifest).then(value=>{
    manifest=value;
    $('all-source-summary').textContent=`收錄 ${value.license_count.toLocaleString('zh-TW')} 張不同許可證；其中 ${value.with_leaflet.toLocaleString('zh-TW')} 張附官方仿單連結。`;
    const dates=[...new Set(value.sources.map(s=>s.downloaded_at.slice(0,10)))];
    $('all-source-date').textContent='官方資料下載日期：'+dates.join('、')+'；許可證狀態依資料所載日期判定，仍請核對官方最新公告。';
    loadPublicationStatus();
    return value;
  }).catch(error=>{manifestPending=null;throw error});
  return manifestPending;
}
function statusBadge(row) {
  const status=licenseStatus(row);
  return create('span',status.label,'all-badge all-badge-'+status.code);
}
function link(url,label) {
  const safe=officialUrl(url);
  if (!safe) return null;
  const a=create('a',label,'all-official-link');
  a.href=safe;a.target='_blank';a.rel='noopener noreferrer';
  a.setAttribute('aria-label',label+'（新分頁開啟TFDA官方來源）');
  return a;
}
function showError(message) {
  $('all-status').textContent=message;
  $('all-retry').hidden=false;
  $('all-results').setAttribute('aria-busy','false');
  $('all-pagination').hidden=true;
}
function getWorker() {
  if (!worker) {
    worker=new Worker(new URL('./all-drugs-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      if (data.seq!==seq) return;
      if (data.error) return showError(data.error);
      last=data.result;
      $('all-search-metrics').textContent=`搜尋處理 ${Math.round(data.searchMs)} ms`;
      renderResults(last);
    };
    worker.onerror=()=>{
      worker.terminate();worker=null;
      showError('搜尋模組載入失敗，請重試或重新整理。');
    };
  }
  return worker;
}
async function search(page=0) {
  const token=++seq;
  const query=$('all-query').value.trim().slice(0,100);
  $('all-retry').hidden=true;
  $('all-suggestions').replaceChildren();
  if (!query) {
    $('all-results').replaceChildren();$('all-results').setAttribute('aria-busy','false');
    $('all-pagination').hidden=true;
    $('all-status').textContent='輸入關鍵字後顯示結果；不會預先列出全部產品。';
    $('all-search-metrics').textContent='';last=null;return;
  }
  $('all-results').setAttribute('aria-busy','true');
  $('all-status').textContent=worker?'正在搜尋…':'首次搜尋需載入獨立索引，請稍候…';
  // Clear old results so an earlier search cannot be mistaken for this query.
  $('all-results').replaceChildren();$('all-pagination').hidden=true;
  try {
    const data=await loadManifest();
    if (token!==seq) return;
    getWorker().postMessage({seq:token,manifest:data,query,
      options:{page,status:$('all-state').value,leafletOnly:$('all-has-leaflet').checked,today:taiwanToday()}});
  } catch(error) { if (token===seq) showError(error.message); }
}
function renderResults(result) {
  const root=$('all-results');root.replaceChildren();root.setAttribute('aria-busy','false');
  $('all-status').textContent=result.total?`找到 ${result.total.toLocaleString('zh-TW')} 項，每頁最多 25 項。`:'沒有符合的品項，請縮短關鍵字或調整篩選條件。';
  const suggestions=$('all-suggestions');suggestions.replaceChildren();
  if (result.total && result.page===0) {
    suggestions.append(create('span','搜尋建議','all-suggestion-label'));
    for (const row of result.suggestions) {
      const button=create('button',row[1]||row[2]||row[0]);button.type='button';
      button.title=row[0];button.onclick=()=>showDetail(row);suggestions.append(button);
    }
  }
  for (const row of result.rows) {
    const card=create('article',undefined,'all-result');
    const identity=create('div',undefined,'all-result-identity');
    const title=create('button',row[1]||'官方未提供中文品名','all-result-title');title.type='button';
    title.onclick=()=>showDetail(row);
    identity.append(title,create('p',row[2]||'官方未提供英文品名','all-english'),create('p',row[0],'all-license'));
    const badges=create('div',undefined,'all-badges');badges.append(statusBadge(row));
    if (!row[8]) badges.append(create('span','未取得仿單連結','all-badge all-badge-muted'));
    identity.append(badges);
    const info=create('div',undefined,'all-result-info');
    info.append(create('p','成分：'+(row[3]||'官方未提供成分略述')),create('p','劑型：'+(row[5]||'官方未提供')),create('p','申請商：'+(row[4]||'官方未提供')));
    const actions=create('div',undefined,'all-result-actions');
    const detail=create('button','詳細資料與仿單','all-detail-button');detail.type='button';detail.onclick=()=>showDetail(row);
    actions.append(productPhoto(row),detail);card.append(identity,info,actions);root.append(card);
  }
  $('all-pagination').hidden=result.pages<=1;
  $('all-page-info').textContent=`第 ${result.page+1}／${result.pages} 頁`;
  $('all-prev').disabled=result.page<=0;
  $('all-next').disabled=result.page>=result.pages-1;
}
function values(items) { return Array.isArray(items)&&items.length?items.join('；'):'官方未提供'; }
function addField(root,label,value) {
  root.append(create('dt',label),create('dd',value||'官方未提供'));
}
function officialLinks(root,urls,label,missing) {
  const group=create('div',undefined,'all-official-group');group.append(create('h4',label));
  const links=(urls||[]).map((url,i)=>link(url,label==='官方仿單'?(i?'開啟官方仿單 '+(i+1):'開啟官方仿單'):'開啟官方外盒／標籤 '+(i+1))).filter(Boolean);
  if (links.length) group.append(...links);else group.append(create('p',missing,'all-muted'));
  root.append(group);
}
async function showDetail(row) {
  const token=++detailSeq;
  const area=$('all-detail');area.hidden=false;area.setAttribute('aria-busy','true');
  $('all-detail-title').textContent=row[1]||row[2]||row[0];
  $('all-detail-content').replaceChildren(create('p','正在讀取此許可證資料…'));
  area.scrollIntoView({behavior:'instant',block:'start'});$('all-detail-title').focus({preventScroll:true});
  try {
    const data=await loadManifest();
    const path=dataPath(data.details[row[9]]);
    if (!detailCache.has(path)) {
      detailCache.set(path,json(new URL(path,base)).catch(error=>{detailCache.delete(path);throw error}));
      // Bound detail memory to eight shards; original QA cache is untouched.
      if (detailCache.size>8) detailCache.delete(detailCache.keys().next().value);
    }
    const shard=await detailCache.get(path), product=shard[row[0]];
    if (token!==detailSeq) return;
    if (!product || product.license!==row[0]) throw new Error('詳細資料與許可證不一致');
    renderDetail(product,row);
  } catch(error) {
    if (token===detailSeq) {
      const retry=create('button','重試讀取此產品','all-detail-button');retry.onclick=()=>showDetail(row);
      $('all-detail-content').replaceChildren(create('p',error.message,'all-error'),retry);
    }
  } finally {if (token===detailSeq) area.setAttribute('aria-busy','false');}
}
function renderDetail(product,row) {
  const root=$('all-detail-content');root.replaceChildren();
  if (!product.master_available) root.append(create('p','此筆來自官方仿單資料集，未取得相符許可證主檔；效期、廠商等未載欄位請核對官方來源。','all-scope-note'));
  const badges=create('p');badges.append(statusBadge(row));root.append(badges);
  // The primary task is opening the official leaflet; keep it above long
  // indication/ingredient text, especially on phones.
  const links=create('section',undefined,'all-official-sources');
  officialLinks(links,product.leaflets,'官方仿單','目前未取得官方仿單連結');
  officialLinks(links,product.cartons,'外盒／標籤','目前未取得官方外盒連結');root.append(links);
  const access=create('div',undefined,'all-access-help');
  access.append(create('p','若官方網站暫時無法提供服務，請稍後重試；也可複製許可證字號，於 TFDA 仿單查詢平台查詢。','all-muted'));
  const copy=create('button','複製許可證字號');copy.type='button';
  const copyStatus=create('span','');copyStatus.setAttribute('role','status');
  copy.onclick=async()=>{
    try {await navigator.clipboard.writeText(product.license);copyStatus.textContent='已複製：'+product.license;}
    catch {copyStatus.textContent='請選取並複製下方字號：'+product.license;}
  };
  access.append(copy,copyStatus);root.append(access);
  root.append(create('h4','藥品基本資料','all-basic-heading'));
  const dl=create('dl',undefined,'all-fields');
  for (const [label,value] of [
    ['中文品名',values(product.names)],['英文品名',values(product.english_names)],['許可證字號',product.license],
    ['主成分略述',values(product.ingredient_summary)],['劑型',values(product.forms)],['包裝',values(product.packages)],
    ['適應症',values(product.indications)],['用法用量',values(product.dosage)],['申請商',values(product.applicants)],
    ['製造商',product.manufacturers?.map(m=>[m['製造商名稱'],m['製造廠國別'],m['製造廠廠址'],m['製程']].filter(Boolean).join('｜')).join('\n')||'官方未提供'],
    ['許可證種類',values(product.license_types)],['藥品類別',values(product.drug_categories)],
    ['許可證有效日期',values(product.expiry_dates)],['註銷狀態',!product.master_available?'未取得許可證主檔':row[6]?values(product.cancel_statuses):'資料未註記註銷'],
    ['註銷日期／理由',row[6]?values([...(product.cancel_dates||[]),...(product.cancel_reasons||[])]):'資料未註記'],
    ['發證日期',values(product.issue_dates)],['來源異動日期',values(product.change_dates)]
  ]) addField(dl,label,value);
  root.append(dl);
  const ing=create('section',undefined,'all-ingredient-details');ing.append(create('h4','官方詳細處方成分'));
  if (product.ingredients?.length) {
    const list=create('ul');
    for (const r of product.ingredients) {
      const item=create('li');
      item.append(create('strong',r['成分名稱']||'官方未提供成分名稱'),create('p','含量：'+(r['含量']?r['含量']+' '+r['含量單位']:'官方未提供數值含量')+(r['含量描述']?'；含量描述：'+r['含量描述']:'')),create('p','處方標示：'+(r['處方標示']||'官方未提供')+'｜成分代碼：'+(r['成分代碼']||'官方未提供')));
      list.append(item);
    }
    ing.append(list);
  } else ing.append(create('p','官方未提供詳細處方成分；請核對原始仿單。','all-muted'));
  root.append(ing);
  const sources=create('details',undefined,'all-source-details');sources.append(create('summary','資料來源與版本'));
  sources.append(create('p',product.master_available?'許可證來源列：'+product.source_rows.join('、')+'（9122 CSV，含標題列；同證的製造資訊分別保留）':'來源：9117 官方仿單資料集；未對到9122許可證主檔。'));
  for (const s of manifest.sources) {
    const p=create('p');const a=create('a','官方資料集 '+s.dataset);a.href=s.catalog_url;a.target='_blank';a.rel='noopener noreferrer';
    p.append(a,create('span','｜下載日期 '+s.downloaded_at.slice(0,10)+'｜'+s.rows.toLocaleString('zh-TW')+' 列'));
    sources.append(p,create('p','來源 SHA-256：'+s.sha256,'all-hash'));
  }
  sources.append(create('p','資料版本：'+manifest.version+'。授權：政府資料開放授權條款第1版。下載日期不等於官方內容更新日期。'));
  root.append(sources);
}
export async function mount() {
  if (mounted) return;
  mounted=true;
  window.addEventListener('focus',loadPublicationStatus);
  $('all-query').addEventListener('input',()=>{
    clearTimeout(timer);++seq;
    timer=setTimeout(()=>search(0),250);
  });
  $('all-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);search(0)});
  for (const id of ['all-state','all-has-leaflet']) $(id).addEventListener('change',()=>{clearTimeout(timer);search(0)});
  $('all-clear').onclick=()=>{
    clearTimeout(timer);$('all-query').value='';detailSeq++;$('all-detail').hidden=true;
    search(0);$('all-query').focus();
  };
  $('all-prev').onclick=()=>{if(last)search(last.page-1)};
  $('all-next').onclick=()=>{if(last)search(last.page+1)};
  $('all-retry').onclick=async()=>{
    if ($('all-query').value.trim()) return search(last?.page||0);
    $('all-retry').hidden=true;
    try {await loadManifest();$('all-status').textContent='輸入關鍵字後顯示結果；不會預先列出全部產品。';}
    catch(error) {showError(error.message);}
  };
  $('all-detail-close').onclick=()=>{detailSeq++;$('all-detail').hidden=true;$('all-query').focus()};
  try {
    await loadManifest();
    $('all-status').textContent='輸入關鍵字後顯示結果；不會預先列出全部產品。';
  } catch(error) {showError(error.message);}
}
