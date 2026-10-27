import {prepareIndex,searchIndex,validateManifest,dataPath} from './all-drugs-core.js';
let prepared=null, loading=null, latest=0;
async function ensureIndex(manifest) {
  if (prepared) return prepared;
  if (!loading) loading=(async()=>{
    validateManifest(manifest);
    // Bound concurrent requests; the 16 chunks are cached for this worker.
    const paths=typeof DecompressionStream==='function'&&manifest.compressed_search?manifest.compressed_search:manifest.search;
    const chunks=new Array(paths.length);
    let cursor=0;
    await Promise.all(Array.from({length:4},async()=>{
      for (;;) {
        const i=cursor++;
        if (i>=chunks.length) break;
        const response=await fetch(new URL('data/all-drugs/'+dataPath(paths[i]),import.meta.url));
        if (!response.ok) throw new Error('搜尋索引下載失敗，請重試');
        let data;
        if (paths[i].endsWith('.gz')) {
          const bytes=new Uint8Array(await response.arrayBuffer());
          // Some hosts may already decode Content-Encoding: gzip.
          data=bytes[0]===31&&bytes[1]===139?
            JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()):
            JSON.parse(new TextDecoder().decode(bytes));
        } else data=await response.json();
        if (!Array.isArray(data) || data.some(r=>!Array.isArray(r)||r.length!==10)) throw new Error('搜尋索引格式不正確');
        chunks[i]=data;
      }
    }));
    const rows=chunks.flat();
    if (rows.length!==manifest.license_count) throw new Error('搜尋索引筆數不完整');
    prepared=prepareIndex(rows);
    return prepared;
  })().catch(error=>{loading=null;throw error});
  return loading;
}
self.onmessage=async({data})=>{
  latest=data.seq;
  const start=performance.now();
  try {
    const index=await ensureIndex(data.manifest);
    if (data.seq!==latest) return;
    const searchStart=performance.now();
    const result=searchIndex(index,data.query,data.options);
    self.postMessage({seq:data.seq,result,searchMs:performance.now()-searchStart,totalMs:performance.now()-start});
  } catch(error) {
    if (data.seq===latest) self.postMessage({seq:data.seq,error:error.message});
  }
};
