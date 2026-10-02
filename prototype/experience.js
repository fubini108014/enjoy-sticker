/* Guided customer experience, preview images and reference-only draft history. */
let stage='upload', customLayout=false, restoring=true, saveChain=Promise.resolve();
const imageRegistry=new Map(),sourceIds=new Map(),storedImageIds=new Set();
let saveRevision=0;
function registerImage(source,id){if(!source)return null;if(sourceIds.has(source))return sourceIds.get(source);const key=id||crypto.randomUUID();sourceIds.set(source,key);imageRegistry.set(key,{source,blob:null});return key;}
function encodeItems(list){return list.map(item=>{const copy={...item};copy.imageRefs={};for(const field of ['src','originalSrc','cutSrc'])if(copy[field]){copy.imageRefs[field]=registerImage(copy[field]);delete copy[field];}return copy;});}
function decodeItems(list){return list.map(item=>{const copy={...item};for(const [field,id] of Object.entries(copy.imageRefs||{})){if(!imageRegistry.has(id))throw new Error('來源圖片已失效。');copy[field]=imageRegistry.get(id).source;}delete copy.imageRefs;return copy;});}
// Undo snapshots contain asset IDs and lightweight settings, never image strings.
snapshot=function(){history.push(JSON.stringify(encodeItems(items)));if(history.length>30)history.shift();future=[];};
$('undo').onclick=()=>{if(!history.length)return;future.push(JSON.stringify(encodeItems(items)));items=decodeItems(JSON.parse(history.pop()));selected=items[0]?.id??null;render();};
$('redo').onclick=()=>{if(!future.length)return;history.push(JSON.stringify(encodeItems(items)));items=decodeItems(JSON.parse(future.pop()));selected=items[0]?.id??null;render();};
function smallDraft(){return {version:3,savedAt:new Date().toISOString(),items:encodeItems(items),finish:document.querySelector('[name="finish"]:checked').value,quantity:Number($('quantity').value),purpose,customLayout};}
async function saveAsynchronously(manual=false){
 if(restoring)return;
 const revision=++saveRevision;const draft=smallDraft();
 const ids=new Set(draft.items.flatMap(item=>Object.values(item.imageRefs)));
 $('save-status').textContent='正在儲存…';
 saveChain=saveChain.catch(()=>{}).then(async()=>{
  const newAssets=[];
  for(const id of ids){if(storedImageIds.has(id))continue;const asset=imageRegistry.get(id);if(!asset.blob)asset.blob=await (await fetch(asset.source)).blob();newAssets.push({id,blob:asset.blob});}
  await StudioStorage.save(draft,newAssets);
  for(const asset of newAssets)storedImageIds.add(asset.id);
  if(revision===saveRevision){$('save-status').textContent='已儲存 · 此裝置 30 天';$('save-status').classList.remove('error');}
  // Legacy data is removed only after the asynchronous draft commit succeeds.
  localStorage.removeItem(DRAFT_KEY);
  if(manual)notify('草稿已儲存在此裝置，圖片不用重複保存。');
 }).catch(()=>{$('save-status').textContent='儲存失敗，請勿關閉';$('save-status').classList.add('error');notify('無法儲存草稿，請確認瀏覽器儲存空間或使用一般瀏覽模式。');});
 return saveChain;
}
persistDraft=function(manual=false){return saveAsynchronously(manual);};
clearTimeout(saveTimer);lastDraft='';
queueSave=function(){if(restoring)return;const value=JSON.stringify({items:encodeItems(items),quantity:$('quantity').value,finish:document.querySelector('[name="finish"]:checked').value,purpose,customLayout});if(value===lastDraft)return;lastDraft=value;$('save-status').textContent='正在儲存…';clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveAsynchronously(),600);};
$('save').onclick=()=>{clearTimeout(saveTimer);saveAsynchronously(true);};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){clearTimeout(saveTimer);saveAsynchronously();}});

// Move rarely needed numeric controls into a single advanced section.
const section=document.querySelector('.setting-section');
const advanced=document.createElement('details');advanced.className='advanced-settings';advanced.innerHTML='<summary>進階設定：尺寸、角度與白邊</summary><div class="advanced-body"></div>';
const advancedBody=advanced.querySelector('.advanced-body');
for(const node of [...section.children]){if(node.classList.contains('label-row')||node.classList.contains('number-input')||node.classList.contains('dimension-info')||node.classList.contains('rotation-control')||node.id==='border'||node.classList.contains('range-labels'))advancedBody.append(node);}
section.prepend(advanced);
const shapeHint=document.createElement('p');shapeHint.className='size-hint';shapeHint.id='size-hint';document.querySelector('.quick-sizes').append(shapeHint);
const panelClose=document.createElement('button');panelClose.className='mobile-panel-close';panelClose.textContent='完成調整';panelClose.onclick=()=>document.body.classList.remove('mobile-editing');document.querySelector('.settings').prepend(panelClose);
const freeLayout=document.createElement('button');freeLayout.className='free-layout';freeLayout.id='free-layout';freeLayout.textContent='自行調整排版';document.querySelector('.desk-toolbar').append(freeLayout);
const continueButton=document.createElement('button');continueButton.id='continue-flow';continueButton.className='button primary continue-flow';continueButton.textContent='下一步：確認訂製';document.querySelector('.desk-bottom').after(continueButton);
const clearSelection=()=>{selected=null;document.body.classList.remove('mobile-editing');render();};
$('mobile-deselect').onclick=clearSelection;
$('paper').addEventListener('click',event=>{if(!event.target.closest('.sticker'))clearSelection();});
function goStage(next){
 if(next!=='upload'&&!items.length){notify('先上傳一張照片，或點選「先試試看」。');return;}
 if(next==='confirm'){document.querySelectorAll('.steps [data-stage]').forEach(button=>{button.closest('li').classList.toggle('active',button.dataset.stage==='confirm');button.removeAttribute('aria-current');if(button.dataset.stage==='confirm')button.setAttribute('aria-current','step');});$('checkout').click();return;}
 stage=next;document.body.dataset.stage=stage;
 document.querySelectorAll('.steps [data-stage]').forEach(button=>{button.closest('li').classList.toggle('active',button.dataset.stage===stage);button.removeAttribute('aria-current');if(button.dataset.stage===stage)button.setAttribute('aria-current','step');});
 $('flow-message').textContent=stage==='upload'?'先選照片，其他的我們幫你準備。':'調整喜歡的大小與份數。已自動排版，也可以自己移動。';
 $('continue-flow').textContent=stage==='upload'?'下一步：確認貼紙效果':'下一步：確認訂製';
 document.body.classList.remove('mobile-editing');updateExperience();
}
$('modal').addEventListener('close',()=>{if(stage!=='upload')goStage('edit');});
document.querySelectorAll('.steps [data-stage]').forEach(button=>button.onclick=()=>goStage(button.dataset.stage));
$('continue-flow').onclick=()=>goStage(stage==='upload'?'edit':'confirm');
$('mobile-continue').onclick=()=>goStage(stage==='upload'?'edit':'confirm');
freeLayout.onclick=()=>{customLayout=!customLayout;updateExperience();queueSave();if(customLayout)notify('可拖曳貼紙與角落控制點；排版檢查會提醒超出或重疊。');};
$('try-demo').onclick=()=>{if(items.length){notify('點開素材庫即可加入示範圖案。');document.querySelector('.sample-library').open=true;return;}snapshot();items=assets.slice(0,3).map(makeItem);const packed=packList(items);if(packed)items=packed;selected=items[0].id;goStage('edit');render();recordEvent('demo_started');};
const basicAdd=addAsset;
addAsset=function(asset){basicAdd(asset);if(items.length){const packed=packList(items);if(packed){items=packed;}else notify('新圖案放不下，請縮小尺寸或減少份數；原尺寸已保留。');goStage('edit');render();}};
function autoArrange(){if(customLayout)return;const packed=packList(items);if(packed)items=packed;else notify('目前尺寸排不下，請選較小尺寸或減少圖案。');}
document.querySelectorAll('[data-size]').forEach(button=>button.onclick=()=>{const item=selectedItem();if(!item)return;snapshot();item.w=Number(button.dataset.size);moveItem(item,item.x,item.y);autoArrange();render();recordEvent('size_preset',{mm:item.w});});
const widthAction=$('width').onchange;
$('width').onchange=()=>{widthAction();autoArrange();render();};
const originalDuplicate=$('duplicate').onclick;
$('duplicate').onclick=()=>{originalDuplicate();autoArrange();render();};
function updateExperience(){
 const item=selectedItem();document.body.classList.toggle('has-selection',Boolean(item));document.body.classList.toggle('custom-layout',customLayout);
 $('empty-paper').hidden=Boolean(items.length);
 document.querySelector('.safe-label').hidden=!items.length;
 $('no-selection').hidden=Boolean(item);$('continue-flow').disabled=!items.length;$('mobile-continue').disabled=!items.length;
 $('checkout').disabled=!items.length;
 $('mobile-subtotal').textContent='NT$'+$('price').textContent;
 $('mobile-sheet-count').textContent=`${$('quantity').value} 張 A4 · 運費下一步確認`;
 $('mobile-continue').textContent=stage==='upload'?'下一步':'確認訂製';
 $('free-layout').textContent=customLayout?'完成自由排版':'自行調整排版';$('free-layout').setAttribute('aria-pressed',String(customLayout));
 $('size-hint').textContent=item?`現在 ${ (item.w/10).toFixed(1)} × ${(item.w/item.ratio/10).toFixed(1)} cm，保持圖片比例。`:'點選圖案後，可選擇大小。';
 document.querySelectorAll('[data-size]').forEach(button=>{button.disabled=!item;button.setAttribute('aria-pressed',String(item&&item.w===Number(button.dataset.size)));});
 document.querySelector('.selection-badge').textContent=item?'已選取':'整張貼紙板';
}
const renderBeforeExperience=render;
render=function(){renderBeforeExperience();updateExperience();};
const priceBeforeExperience=updatePrice;
updatePrice=function(){priceBeforeExperience();if($('mobile-subtotal')){$('mobile-subtotal').textContent='NT$'+$('price').textContent;$('mobile-sheet-count').textContent=`${$('quantity').value} 張 A4 · 運費下一步確認`;}};
document.querySelectorAll('[data-tool]').forEach(button=>button.onclick=()=>{if(!selectedItem())return;if(button.dataset.tool==='delete'){$('delete').click();return;}document.body.classList.add('mobile-editing');document.querySelector('.settings').dataset.tool=button.dataset.tool;});

// Decode one source at a time; render with a bounded preview, retain the original Blob.
upload=async function(files){
 for(const file of files){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){notify('請選擇 JPG、PNG 或 WebP 圖片。');continue;}
  if(file.size>25*1024*1024){notify(`${file.name} 超過 25 MB，請先縮小。`);continue;}
  if(items.length>=40){notify('最多可放入 40 個圖案。');break;}
  let originalUrl,bitmap;
  try{
   $('flow-message').textContent='正在準備照片，請稍候…';
   originalUrl=URL.createObjectURL(file);const originalId=registerImage(originalUrl);imageRegistry.get(originalId).blob=file;
   bitmap=await createImageBitmap(file);
   const pixels=bitmap.width,ratio=bitmap.width/bitmap.height;
   if(ratio<.25||ratio>4)throw new Error('請先裁切圖片至寬高比 1:4 至 4:1。');
   const factor=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*factor));canvas.height=Math.max(1,Math.round(bitmap.height*factor));
   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
   const previewBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.85));if(!previewBlob)throw new Error('無法產生照片預覽，請換一張圖片。');
   const src=URL.createObjectURL(previewBlob),previewId=registerImage(src);imageRegistry.get(previewId).blob=previewBlob;
   const asset={name:file.name.replace(/\.[^.]+$/,''),src,originalSrc:src,sourceOriginal:originalUrl,sourceOriginalId:originalId,ratio,pixels,backgroundMode:'original'};
   assets.push(asset);renderAssets();addAsset(asset);recordEvent('upload_completed',{count:1,previewWidth:canvas.width});
  }catch(error){if(originalUrl){URL.revokeObjectURL(originalUrl);const key=sourceIds.get(originalUrl);if(key){imageRegistry.delete(key);sourceIds.delete(originalUrl);}}notify(error.message||'無法讀取照片，請換另一張。');}
  finally{bitmap?.close();}
 }
 $('upload').value='';goStage(items.length?'edit':'upload');
};
// Preserve original upload IDs separately, outside rendered image fields.
const encodeBeforeOriginals=encodeItems;
encodeItems=function(list){return encodeBeforeOriginals(list).map((copy,index)=>{if(list[index].sourceOriginal){copy.imageRefs.sourceOriginal=registerImage(list[index].sourceOriginal,list[index].sourceOriginalId);delete copy.sourceOriginal;}return copy;});};
$('guide').onclick=()=>modal('<h2>三步，完成你的貼紙板</h2><ol><li>上傳自己的照片，或先試試示範圖案。</li><li>選擇大小與份數，我們幫你排版；需要時再開啟自由編輯。</li><li>確認材質、A4 張數與含運費總額。</li></ol><p>圖案份數是每張底紙上的貼紙數，A4 張數是要印幾張相同貼紙板。半斷裁切會保留底紙，圖案可逐張撕下。本機草稿保留 30 天，實際照片去背與付款尚未串接。</p>');
// Workshop view is a separate URL, never a customer editing tool.
$('operations').onclick=null;
document.querySelectorAll('.mobile-operations').forEach(button=>{if(button.textContent==='工坊示範')button.remove();});

// Persist demo order snapshots with image IDs, retaining images across reloads.
saveOrders=async function(){
 const record={version:3,orders:localOrders.map(order=>({...order,snapshot:{...order.snapshot,items:encodeItems(order.snapshot.items)}}))};
 let success=false;
 saveChain=saveChain.catch(()=>{}).then(async()=>{
  const ids=new Set(record.orders.flatMap(order=>order.snapshot.items.flatMap(item=>Object.values(item.imageRefs))));
  const pending=[];
  for(const id of ids){if(storedImageIds.has(id))continue;const asset=imageRegistry.get(id);if(!asset.blob)asset.blob=await (await fetch(asset.source)).blob();pending.push({id,blob:asset.blob});}
  await StudioStorage.save(record,pending,'orders');for(const asset of pending)storedImageIds.add(asset.id);
  localStorage.removeItem(ORDER_KEY);success=true;
 }).catch(()=>notify('示範訂單儲存失敗，請確認瀏覽器儲存空間。'));
 await saveChain;return success;
};
async function restoreDraft(){
 $('workspace').inert=true;$('save-status').textContent='正在恢復草稿…';
 try{
  const saved=await StudioStorage.load();
  for(const asset of saved.assets){const url=URL.createObjectURL(asset.blob);registerImage(url,asset.id);imageRegistry.get(asset.id).blob=asset.blob;storedImageIds.add(asset.id);}
  if(saved.orders?.version===3)localOrders=saved.orders.orders.map(order=>({...order,snapshot:{...order.snapshot,items:decodeItems(order.snapshot.items)}}));
  if(saved.draft&&saved.draft.version===3){
   if(Date.now()-Date.parse(saved.draft.savedAt)<30*86400000){
    const restored=decodeItems(saved.draft.items);
    if(restored.length>40||restored.some(i=>!Number.isFinite(i.id)||!Number.isFinite(i.w)||i.w<15||i.w>100||!Number.isFinite(i.ratio)||i.ratio<.25||i.ratio>4||!Number.isFinite(i.x)||!Number.isFinite(i.y)))throw new Error('草稿格式不完整。');
    items=restored;selected=null;sequence=Math.max(sequence,0,...items.map(i=>i.id));purpose=saved.draft.purpose==='business'?'business':'life';customLayout=Boolean(saved.draft.customLayout);
    $('quantity').value=clamp(Number(saved.draft.quantity)||1,1,99);document.querySelector(`[name="finish"][value="${saved.draft.finish==='glossy'?'glossy':'matte'}"]`).checked=true;
    for(const item of items)if(!assets.some(a=>a.src===item.src||(!item.pixels&&!a.pixels&&a.name===item.name)))assets.push({...item});
   }else{items=[];selected=null;notify('草稿已超過 30 天，可以開始新的貼紙板。');}
  }
 }catch(error){$('save-status').classList.add('error');notify('草稿無法恢復：'+error.message+' 你仍可開始編輯。');}
 finally{
  restoring=false;$('workspace').inert=false;history=[];future=[];
  document.querySelector(`[name="purpose"][value="${purpose}"]`).checked=true;renderAssets();goStage(items.length?'edit':'upload');render();
  if(new URLSearchParams(location.search).get('view')==='workshop'){document.body.classList.add('workshop-view');showOrders(true);}
 }
}

// In guided mode, tapping selects; only explicit free layout enables dragging.
const dragBeforeGuided=startDrag;
startDrag=function(event,item,element){if(customLayout)dragBeforeGuided(event,item,element);};
const modalBeforeGuided=modal;
modal=function(html){
 modalBeforeGuided(html);
 if(!$('shipping'))return;
 const choices=document.createElement('div');choices.className='confirmation-options';
 choices.innerHTML='<label for="confirm-finish">表面觸感</label><select id="confirm-finish"><option value="matte">霧面 · 柔和不反光</option><option value="glossy">亮面 · 鮮明有光澤</option></select><label for="confirm-quantity">印幾張相同的 A4 貼紙板？</label><input id="confirm-quantity" type="number" min="1" max="99" value="1"><small>圖案份數是每張紙上的貼紙數；印製張數是整張 A4 的數量。</small>';
 $('shipping').previousElementSibling.before(choices);
 $('confirm-finish').value=document.querySelector('[name="finish"]:checked').value;$('confirm-quantity').value=$('quantity').value;
 const sync=()=>{
  document.querySelector(`[name="finish"][value="${$('confirm-finish').value}"]`).checked=true;
  $('quantity').value=clamp(Math.round(Number($('confirm-quantity').value)||1),1,99);$('confirm-quantity').value=$('quantity').value;
  updatePrice();document.querySelector('.sheet-preview + p').textContent='A4 白底防水貼紙，'+($('confirm-finish').value==='matte'?'霧面':'亮面')+'覆膜。採半斷裁切：收到整張底紙，每個圖案可獨立撕下。';document.querySelector('.flow-total>span').textContent=`${$('quantity').value} 張 NT$ ${$('price').textContent} + 運費`;
  $('shipping').dispatchEvent(new Event('change'));queueSave();
 };
 $('confirm-finish').onchange=sync;$('confirm-quantity').onchange=sync;
 $('confirm-quantity').oninput=()=>{if($('confirm-quantity').value)sync();};
};
// A slow save must not create multiple orders from repeated clicks.
let creatingDemoOrder=false;
const createBeforeStorage=createOrder;
createOrder=async function(fee){
 if(creatingDemoOrder)return;
 creatingDemoOrder=true;if($('create-order'))$('create-order').disabled=true;
 try{await createBeforeStorage(fee);}catch{notify('示範訂單建立失敗，請保留草稿後再試。');}
 finally{creatingDemoOrder=false;if($('create-order'))$('create-order').disabled=false;}
};
// Export self-contained image data instead of temporary Object URLs.
async function downloadSnapshot(order,button){
 button.disabled=true;
 try{
  const copy=JSON.parse(JSON.stringify(order.snapshot)),converted=new Map();
  for(const item of copy.items)for(const field of ['src','originalSrc','cutSrc','sourceOriginal']){
   const source=item[field];if(!source?.startsWith('blob:'))continue;
   if(!converted.has(source)){
    const blob=await (await fetch(source)).blob();
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
    converted.set(source,data);
   }
   item[field]=converted.get(source);
  }
  const url=URL.createObjectURL(new Blob([JSON.stringify(copy,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=order.id+'-design-snapshot.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch{notify('無法下載圖片快照，請重新開啟訂單後再試。');}
 finally{button.disabled=false;}
}
const ordersBeforeExport=renderOrders;
renderOrders=function(operations){
 ordersBeforeExport(operations);
 $('order-list').querySelectorAll('[data-action="download"]').forEach(button=>button.onclick=()=>{const order=localOrders.find(o=>o.id===button.dataset.order);if(order)downloadSnapshot(order,button);});
};
restoreDraft();

