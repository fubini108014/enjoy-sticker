/* Asynchronous local draft persistence. Images are stored once as Blobs. */
window.StudioStorage=(()=>{
 let database;
 function open(){
  if(database)return database;
  database=new Promise((resolve,reject)=>{
   if(!window.indexedDB){reject(new Error('這個瀏覽器無法保存圖片草稿。'));return;}
   const request=indexedDB.open('enjoy-sticker-studio',1);
   const timeout=setTimeout(()=>reject(new Error('儲存資料庫開啟逾時。')),6000);
   request.onupgradeneeded=()=>{request.result.createObjectStore('assets',{keyPath:'id'});request.result.createObjectStore('drafts',{keyPath:'id'});};
   request.onsuccess=()=>{clearTimeout(timeout);resolve(request.result);};
   request.onerror=()=>{clearTimeout(timeout);reject(request.error);};
   request.onblocked=()=>{clearTimeout(timeout);reject(new Error('請關閉其他舊版頁面，再重新載入。'));};
  });
  return database;
 }
 function done(transaction){return new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('草稿儲存已取消。'));});}
 async function load(){
  const db=await open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(['drafts','assets'],'readonly');
   const draft=tx.objectStore('drafts').get('active');const orders=tx.objectStore('drafts').get('orders');const images=tx.objectStore('assets').getAll();
   tx.oncomplete=()=>resolve({draft:draft.result,assets:images.result,orders:orders.result});tx.onerror=()=>reject(tx.error);
  });
 }
 async function save(draft,assets,id='active'){
  const db=await open();const tx=db.transaction(['drafts','assets'],'readwrite');const complete=done(tx);
  for(const asset of assets)tx.objectStore('assets').put(asset);
  tx.objectStore('drafts').put({...draft,id});
  await complete;
 }
 return {load,save};
})();
