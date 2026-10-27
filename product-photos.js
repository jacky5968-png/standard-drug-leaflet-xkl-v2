// Official TFDA appearance metadata; no guessed URLs and no package PDFs.
const base=new URL('data/all-drugs/photos/',import.meta.url);
let pending=null;
export function photoUrl(value) {
  try {
    const url=new URL(value);
    return url.protocol==='https:'&&url.hostname==='mcp.fda.gov.tw'&&!url.username&&!url.password&&/^\/insert\/shapeImg\/[a-zA-Z0-9_-]+$/.test(url.pathname)?url.href:null;
  } catch {return null;}
}
function localPath(value) {
  if(!/^releases\/[a-f0-9]{16}\/index\.json(?:\.gz)?$/.test(value))throw new Error('照片索引路徑不正確');
  return value;
}
async function getIndex() {
  if(!pending)pending=(async()=>{
    const response=await fetch(new URL('manifest.json',base));
    if(!response.ok)throw new Error('照片資料暫無法讀取');
    const manifest=await response.json();
    if(manifest.schema!==1||manifest.source?.dataset!=='9120'||!Number.isInteger(manifest.license_count))throw new Error('照片資料格式不正確');
    const compressed=typeof DecompressionStream==='function';
    const r=await fetch(new URL(localPath(compressed?manifest.compressed_index:manifest.index),base));
    if(!r.ok)throw new Error('照片資料暫無法讀取');
    let entries;
    if(compressed){
      const bytes=new Uint8Array(await r.arrayBuffer());
      entries=bytes[0]===31&&bytes[1]===139?
        JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()):
        JSON.parse(new TextDecoder().decode(bytes));
    } else entries=await r.json();
    if(Object.keys(entries).length!==manifest.license_count)throw new Error('照片資料筆數不完整');
    return {entries,manifest};
  })().catch(error=>{pending=null;throw error});
  return pending;
}
const element=(tag,text,className)=>{
  const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;
};
export function productPhoto(row) {
  const figure=element('figure',undefined,'all-product-photo');
  figure.dataset.license=row[0];
  figure.append(element('figcaption','產品照片'),element('div','查詢照片…','all-photo-placeholder'));
  // Metadata is small, cached once and independent of the search/QA modules.
  getIndex().then(({entries})=>{
    if(!figure.isConnected)return;
    const entry=entries[row[0]];
    const urls=entry?.license===row[0]?entry.urls?.map(photoUrl).filter(Boolean):[];
    const body=figure.querySelector('.all-photo-placeholder');
    if(!urls?.length){body.textContent='暫無官方照片';figure.dataset.photoState='missing';return;}
    const anchor=element('a');anchor.href=urls[0];anchor.target='_blank';anchor.rel='noopener noreferrer';
    anchor.setAttribute('aria-label','開啟 '+(row[1]||row[0])+' 的TFDA官方外觀照片（新分頁）');
    const img=element('img');img.alt=(row[1]||row[0])+'｜TFDA官方藥品外觀圖';
    img.width=112;img.height=88;img.loading='lazy';img.decoding='async';
    img.onload=()=>{figure.dataset.photoState='loaded';};
    img.onerror=()=>{
      img.remove();body.textContent='官方照片暫無法載入';body.hidden=false;figure.dataset.photoState='unavailable';
      // The original official URL stays available without retry loops.
      anchor.textContent='查看官方照片';anchor.classList.add('all-photo-fallback-link');
    };
    body.hidden=true;anchor.append(img);figure.append(anchor);
    figure.dataset.photoState='loading';img.src=urls[0];
  }).catch(()=>{
    if(!figure.isConnected)return;
    figure.querySelector('.all-photo-placeholder').textContent='照片資料暫無法讀取';figure.dataset.photoState='metadata-unavailable';
  });
  return figure;
}
