// Independent TFDA search helpers. Never imported by the existing QA engine.
export const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\s\u3000]+/g, '').trim();
export function taiwanToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  return ['year','month','day'].map(key=>parts.find(p=>p.type===key).value).join('-');
}
export function licenseStatus(row, today=taiwanToday()) {
  if (row[6]) return {code:'cancelled',label:'已註銷'};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row[7])) return {code:'unknown',label:'效期未明'};
  return row[7] < today ? {code:'expired',label:'已逾資料所載效期'} : {code:'active',label:'資料所載有效'};
}
export function officialUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol==='https:' && url.hostname==='mcp.fda.gov.tw' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function dataPath(value) {
  if (!/^releases\/[a-f0-9]{16}\/(?:search-\d{2}\.json(?:\.gz)?|detail-[a-f0-9]{2}\.json)$/.test(value)) throw new Error('資料索引路徑不正確');
  return value;
}
export function validateManifest(manifest) {
  if (manifest?.schema!==1 || !Number.isInteger(manifest.license_count) || manifest.license_count<=0 ||
      !Array.isArray(manifest.search) || manifest.search.length!==16 || !manifest.details || !Array.isArray(manifest.sources)) throw new Error('資料版本不相容，請重新整理或稍後再試');
  if (manifest.compressed_search && (!Array.isArray(manifest.compressed_search)||manifest.compressed_search.length!==16)) throw new Error('壓縮索引不完整');
  for (const path of [...manifest.search,...(manifest.compressed_search||[]),...Object.values(manifest.details)]) dataPath(path);
  if (manifest.sources.some(s=>!/^https:\/\/data\.gov\.tw\/dataset\/\d+$/.test(s.catalog_url)||typeof s.downloaded_at!=='string'||!Number.isInteger(s.rows)||!(/^[a-f0-9]{64}$/).test(s.sha256))) throw new Error('官方資料來源識別不完整');
  return manifest;
}
export function prepareIndex(rows) {
  return rows.map(row=>({row, keys:row.slice(0,6).map(normalize)}));
}
export function searchIndex(index, query, {status='all',leafletOnly=false,page=0,pageSize=25,today=taiwanToday()}={}) {
  const q=normalize(query).slice(0,100);
  if (!q) return {total:0,page:0,pages:0,rows:[],suggestions:[]};
  const matches=[];
  for (const item of index) {
    if (leafletOnly && !item.row[8]) continue;
    const state=licenseStatus(item.row,today);
    if (status!=='all' && state.code!==status) continue;
    const [license,chinese,english,ingredient,applicant,form]=item.keys;
    const fields=[license,chinese,english,ingredient,applicant,form];
    let score=0;
    if (license===q || chinese===q || english===q) score=120;
    else if (license.startsWith(q)||chinese.startsWith(q)||english.startsWith(q)) score=100;
    else if (chinese.includes(q)||english.includes(q)) score=80;
    else if (ingredient.includes(q)) score=60;
    else if (applicant.includes(q)) score=40;
    else if (fields.some(f=>f.includes(q))) score=20;
    if (score) matches.push({row:item.row,score:score+(state.code==='active'?1:0)});
  }
  matches.sort((a,b)=>b.score-a.score || a.row[0].localeCompare(b.row[0],'zh-Hant'));
  const pages=Math.ceil(matches.length/pageSize), safePage=Math.min(Math.max(0,page),Math.max(0,pages-1));
  return {total:matches.length,page:safePage,pages,
    rows:matches.slice(safePage*pageSize,(safePage+1)*pageSize).map(x=>x.row),
    suggestions:matches.slice(0,5).map(x=>x.row)};
}
