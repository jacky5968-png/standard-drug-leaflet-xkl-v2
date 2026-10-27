// Only a tiny listener joins the existing shell. Large modules/data are lazy.
const tab=document.getElementById('tab-all-drugs');
let mounted=false, pending=null;
tab.addEventListener('click',async()=>{
  if (mounted) return;
  const status=document.getElementById('all-status');
  status.textContent='正在準備全部藥品仿單查詢…';
  try {
    if (!pending) pending=import('./all-drugs.js?v=20261027-photo-clean');
    const module=await pending;
    await module.mount();
    mounted=true;
  } catch(error) {
    pending=null;
    status.textContent='模組載入失敗，請重新整理後再試。'+error.message;
  }
});
