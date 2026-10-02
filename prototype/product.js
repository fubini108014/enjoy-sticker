/* Local product-flow prototype. No network uploads, payment or production exports. */
const DRAFT_KEY='enjoy-sticker-draft';
const ORDER_KEY='enjoy-sticker-orders-v2';
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saveTimer, lastDraft='', backgroundJob=0, purpose='life';
let localOrders=[];
try{localOrders=JSON.parse(localStorage.getItem(ORDER_KEY)||'[]');if(!Array.isArray(localOrders))localOrders=[];localOrders=localOrders.filter(o=>o&&typeof o.id==='string'&&Array.isArray(o.log)&&o.snapshot&&Array.isArray(o.snapshot.items));}catch{localOrders=[];}
const telemetry=[];
function recordEvent(name,detail={}){telemetry.push({name,detail,time:new Date().toISOString()});if(telemetry.length>100)telemetry.shift();}
function bounds(item){const r=item.rotation*Math.PI/180,h=item.w/item.ratio;const bw=Math.abs(item.w*Math.cos(r))+Math.abs(h*Math.sin(r))+2*item.border,bh=Math.abs(h*Math.cos(r))+Math.abs(item.w*Math.sin(r))+2*item.border;const cx=item.x+item.w/2,cy=item.y+h/2;return {left:cx-bw/2,right:cx+bw/2,top:cy-bh/2,bottom:cy+bh/2};}
function inspectLayout(list=items){const errors=[],warnings=[];if(!list.length)errors.push('還沒有貼紙，請先加入素材。');for(const item of list){const b=bounds(item);if(b.left<14.99||b.right>195.01||b.top<23.49||b.bottom>273.51)errors.push(`${item.name} 超出安全區，請縮小或移動。`);if(item.pixels){const dpi=Math.round(item.pixels/(item.w/25.4));if(dpi<300)warnings.push(`${item.name} 為 ${dpi} DPI${dpi<150?'，印製可能模糊':'，細節可能較柔和'}。`);}}
 for(let a=0;a<list.length;a++)for(let b=a+1;b<list.length;b++){const first=bounds(list[a]),second=bounds(list[b]);if(first.left<second.right+3-.01&&first.right+3-.01>second.left&&first.top<second.bottom+3-.01&&first.bottom+3-.01>second.top){errors.push('部分貼紙重疊或間距小於 3 mm，請自動排版或手動調整。');a=list.length;break;}}
 return {errors:[...new Set(errors)],warnings};}
function draftData(){return {version:2,savedAt:new Date().toISOString(),items,finish:document.querySelector('[name="finish"]:checked').value,quantity:Number($('quantity').value),purpose};}
function persistDraft(manual=false){try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draftData()));$('save-status').textContent='已自動儲存 · 此裝置';$('save-status').classList.remove('error');if(manual)notify('草稿已儲存在此裝置，保留 30 天。');}catch{$('save-status').textContent='儲存失敗，空間不足';$('save-status').classList.add('error');if(manual)notify('儲存空間不足，請減少上傳圖片或換較小檔案。');}}
function queueSave(){const value=JSON.stringify({items,quantity:$('quantity').value,finish:document.querySelector('[name="finish"]:checked').value,purpose});if(value===lastDraft)return;lastDraft=value;$('save-status').textContent='正在儲存…';clearTimeout(saveTimer);saveTimer=setTimeout(()=>persistDraft(),500);}
function backgroundSource(item){if(item.originalSrc)return item.originalSrc;return svg(`<rect x="0" y="0" width="160" height="160" rx="8" fill="#d9e7f1"/><image href="${escapeText(item.cutSrc||item.src)}" width="160" height="160"/>`);}
function enrich(item){if(!item.cutSrc&&!item.originalSrc){if(item.pixels){item.originalSrc=item.src;item.backgroundMode='original';}else{item.cutSrc=item.src;item.backgroundMode='cut';}}return item;}
items.forEach(enrich);
// Repair old draft positions to account for the rotated preview bounds.
moveItem=function(item,x,y){item.x=x;item.y=y;let b=bounds(item);if(b.right-b.left>180||b.bottom-b.top>250)return;item.x+=Math.max(0,15-b.left)-Math.max(0,b.right-195);item.y+=Math.max(0,23.5-b.top)-Math.max(0,b.bottom-273.5);};
items.forEach(item=>moveItem(item,item.x,item.y));
const oldRender=render;
render=function(){items.forEach(enrich);oldRender();const item=selectedItem();$('height-value').textContent=item?(item.w/item.ratio).toFixed(1):'—';$('rotation').value=item?.rotation??0;for(const id of ['rotation','repeat','fill-sheet','keep-background','remove-background','compare-background'])$(id).disabled=!item;
 $('keep-background').setAttribute('aria-pressed',String(item?.backgroundMode==='original'));$('remove-background').setAttribute('aria-pressed',String(item?.backgroundMode==='cut'));
 $('background-status').textContent=item?.backgroundState==='processing'?'正在處理示範結果…':item?.backgroundState==='failed'?'尚未連接 AI 去背服務，原圖已保留。可重試或繼續使用原圖。':item?.pixels?'照片尚未串接 AI 去背；選擇保留原圖可繼續。':'示範素材可比較原圖與去背結果。';$('retry-background').hidden=item?.backgroundState!=='failed';
 const result=inspectLayout();$('preflight').className='preflight'+(result.errors.length?' blocked':'');$('preflight').textContent=result.errors.length?`需調整：${result.errors[0]}`:result.warnings.length?`可繼續：${result.warnings.length} 張圖片需確認解析度。`:'尺寸與間距檢查通過，確認後可建立示範訂單。';queueSave();};
const oldUpdatePrice=updatePrice;updatePrice=function(){oldUpdatePrice();queueSave();};
$('save').onclick=()=>persistDraft(true);
document.querySelectorAll('[name="finish"]').forEach(input=>input.addEventListener('change',()=>{recordEvent('finish_changed');queueSave();}));
document.querySelectorAll('[name="purpose"]').forEach(input=>input.addEventListener('change',()=>{purpose=input.value;$('purpose-hint').textContent=purpose==='business'?'設定 Logo 尺寸與份數，使用同圖排滿快速製作。':'免登入開始，照片與草稿保留在你的瀏覽器。';recordEvent('purpose_selected',{purpose});queueSave();}));
$('rotation').onchange=()=>{const item=selectedItem();if(!item)return;snapshot();item.rotation=clamp(Number($('rotation').value)||0,-180,180);moveItem(item,item.x,item.y);render();};
$('keep-background').onclick=()=>{const item=selectedItem();if(!item)return;backgroundJob++;snapshot();item.src=backgroundSource(item);item.originalSrc=item.src;item.backgroundMode='original';item.backgroundState='idle';render();recordEvent('background_original');};
async function removeBackground(){const item=selectedItem();if(!item)return;const job=++backgroundJob;item.backgroundState='processing';render();$('remove-background').disabled=true;recordEvent('background_started');await new Promise(resolve=>setTimeout(resolve,650));if(job!==backgroundJob||!items.includes(item))return;if(item.pixels){item.backgroundState='failed';recordEvent('background_failed',{reason:'service_unavailable'});render();return;}snapshot();item.src=item.cutSrc;item.backgroundMode='cut';item.backgroundState='done';recordEvent('background_completed',{demo:true});render();}
$('remove-background').onclick=removeBackground;$('retry-background').onclick=removeBackground;
$('compare-background').onclick=()=>{const item=selectedItem();if(!item)return;modal(`<h2>原圖與去背結果</h2><div class="split-preview"><div><img src="${escapeText(backgroundSource(item))}" alt="原圖"><span>原圖</span></div><div>${item.cutSrc?`<img src="${escapeText(item.cutSrc)}" alt="去背示範結果">`:'<p>尚未產生去背結果</p>'}<span>${item.cutSrc?'去背示範結果':'原圖保留完整'}</span></div></div><p>實際照片的 AI 去背服務尚未串接；目前只有示範素材可預覽兩種效果。</p>`);};
function packList(source){let x=15,y=23.5,rowHeight=0;const result=[];for(const item of source){const w=item.w+item.border*2,h=item.w/item.ratio+item.border*2;if(w>180||h>250)return null;if(x+w>195.01){x=15;y+=rowHeight+3;rowHeight=0;}if(y+h>273.51)return null;result.push({...item,x:x+item.border,y:y+item.border,rotation:0});x+=w+3;rowHeight=Math.max(rowHeight,h);}return result;}
$('pack').onclick=()=>{const packed=packList(items);if(!packed){notify('目前尺寸排不下；尺寸未變更，請縮小或減少貼紙。');recordEvent('pack_failed');return;}snapshot();items=packed;render();notify('已排版，維持原尺寸與方向朝上，白邊之間至少 3 mm。');recordEvent('pack_completed');};
$('repeat').onclick=()=>{const item=selectedItem();if(!item)return;const amount=clamp(Math.round(Number($('copy-count').value)||1),1,40);$('copy-count').value=amount;if(items.length+amount>40){notify('最多 40 個素材，請減少新增份數。');return;}const copies=Array.from({length:amount},()=>({...item,id:++sequence}));const packed=packList([...items,...copies]);if(!packed){notify('指定份數排不下，請減少份數或縮小尺寸。');return;}snapshot();items=packed;selected=copies[0].id;render();recordEvent('repeat_added',{amount});};
$('fill-sheet').onclick=()=>{const item=selectedItem();if(!item)return;const cols=Math.floor(183/(item.w+2*item.border+3)),rows=Math.floor(253/(item.w/item.ratio+2*item.border+3)),count=Math.min(40,cols*rows);if(!count){notify('此尺寸放不進安全區，請縮小貼紙。');return;}modal(`<h2>用這個圖案排滿？</h2><p>維持 ${item.w} × ${(item.w/item.ratio).toFixed(1)} mm，預計可排入 ${count} 個圖案。會取代目前畫布，之後可以復原。原型最多 40 個素材。</p><button id="confirm-fill" class="button primary">取代畫布並排滿</button>`);$('confirm-fill').onclick=()=>{const packed=packList(Array.from({length:count},()=>({...item,id:++sequence})));if(!packed)return;snapshot();items=packed;selected=items[0].id;$('modal').close();render();recordEvent('sheet_filled',{count});notify(`已放入 ${count} 個同圖貼紙，尺寸維持不變。`);};};
const oldModal=modal;modal=function(html){$('modal').classList.remove('wide');oldModal(html);};
function sheetPreview(list){return '<div class="sheet-preview" aria-label="貼紙板排版預覽">'+list.map(i=>`<img src="${escapeText(i.src)}" alt="${escapeText(i.name)}" style="left:${i.x/210*100}%;top:${i.y/297*100}%;width:${i.w/210*100}%;height:${i.w/i.ratio/297*100}%;transform:rotate(${i.rotation}deg)">`).join('')+'</div>';}
function checkout(){const result=inspectLayout();recordEvent('preflight_opened',{errors:result.errors.length,warnings:result.warnings.length});const finish=document.querySelector('[name="finish"]:checked').value==='matte'?'霧面':'亮面';const rows=items.map(i=>`<tr><td>${escapeText(i.name)}</td><td>${i.w} × ${(i.w/i.ratio).toFixed(1)}</td><td>${i.border}</td></tr>`).join('');modal(`<h2>確認印製內容</h2>${sheetPreview(items)}<p>A4 白底防水貼紙，${finish}覆膜。採半斷裁切：收到整張底紙，每個圖案可獨立撕下。</p><ul class="check-list">${result.errors.map(message=>`<li class="error">需修正：${escapeText(message)}</li>`).join('')}${result.warnings.map(message=>`<li class="warning">提醒：${escapeText(message)}</li>`).join('')}${!result.errors.length?'<li>安全區與白邊間距檢查通過。</li>':''}</ul><div class="scroll-table"><table class="summary-table"><thead><tr><th>圖案（每個 1 份）</th><th>寬 × 高 mm</th><th>白邊 mm</th></tr></thead><tbody>${rows}</tbody></table></div><label class="shipping-choice" for="shipping">配送方式（示範費率）</label><select id="shipping"><option value="60">超商取貨 · NT$60</option><option value="40">郵局寄送 · NT$40</option></select><div class="flow-total"><span>${$('quantity').value} 張 NT$ ${$('price').textContent} + 運費</span><span id="total-price"></span></div><p class="checkout-note">示範預估：付款確認後 2 個工作天出貨，不含配送時間。實際費率與出貨日將由正式服務計算。螢幕與成品可能有色差。</p>${result.warnings.length?'<label class="confirmation"><input type="checkbox" id="accept-quality">我已確認解析度提醒，願意使用目前圖片。</label>':''}<label class="confirmation"><input type="checkbox" id="accept-design">我已確認尺寸、材質與圖案，並有權使用這些圖片。</label><p class="checkout-note">下一步只建立此瀏覽器的示範訂單，不付款、不上傳照片、不安排寄件。設計會保存為獨立快照。</p><button id="create-order" class="button primary" disabled>建立示範訂單</button><button id="back-edit" class="modal-back">返回調整貼紙</button>`);$('modal').classList.add('wide');const update=()=>{$('total-price').textContent='NT$ '+(Number($('quantity').value)*200+Number($('shipping').value)).toLocaleString();$('create-order').disabled=Boolean(result.errors.length)||!$('accept-design').checked||(result.warnings.length&&!$('accept-quality').checked);};$('shipping').onchange=()=>{recordEvent('shipping_viewed',{fee:Number($('shipping').value)});update();};$('accept-design').onchange=update;if($('accept-quality'))$('accept-quality').onchange=update;$('back-edit').onclick=()=>$('modal').close();$('create-order').onclick=()=>createOrder(Number($('shipping').value));update();}
$('checkout').onclick=checkout;
function saveOrders(){try{localStorage.setItem(ORDER_KEY,JSON.stringify(localOrders));return true;}catch{notify('訂單快照儲存失敗，請減少圖片或清理瀏覽器空間。');return false;}}
async function createOrder(shippingFee){if(inspectLayout().errors.length)return;const order={id:'DEMO-'+Date.now().toString(36).toUpperCase(),status:'PENDING_PAYMENT',snapshot:JSON.parse(JSON.stringify({version:1,createdAt:new Date().toISOString(),items,finish:document.querySelector('[name="finish"]:checked').value,quantity:Number($('quantity').value),unitPrice:200,subtotal:Number($('quantity').value)*200,shippingFee,total:Number($('quantity').value)*200+shippingFee,shipping:shippingFee===60?'超商取貨':'郵局寄送',purpose})),log:['已建立設計與價格快照'],reason:'',tracking:''};localOrders.push(order);if(!await saveOrders()){localOrders.pop();return;}recordEvent('demo_order_created');showOrders(false);}
const states={PENDING_PAYMENT:'待付款',PAYMENT_FAILED:'付款失敗',EXPIRED:'付款逾期',PROCESSING_RENDER:'渲染中',RENDER_FAILED:'渲染失敗',NEEDS_REVIEW:'待客戶確認',QUEUED_TO_PRINT:'待印製',REPRINT:'待重製',PACKED:'已包裝',SHIPPED:'已出貨',DELIVERED:'已送達',SHIPPING_EXCEPTION:'物流異常',CANCELLED:'已取消',REFUND_PENDING:'待退款',REFUNDED:'已退款'};
const transitions={PENDING_PAYMENT:[['PROCESSING_RENDER','模擬付款成功'],['PAYMENT_FAILED','模擬付款失敗'],['EXPIRED','模擬付款逾期'],['CANCELLED','取消訂單']],PAYMENT_FAILED:[['PROCESSING_RENDER','重試付款成功'],['CANCELLED','取消訂單']],PROCESSING_RENDER:[['QUEUED_TO_PRINT','渲染完成'],['RENDER_FAILED','渲染失敗'],['NEEDS_REVIEW','需要客戶確認'],['REFUND_PENDING','申請退款']],RENDER_FAILED:[['PROCESSING_RENDER','重試渲染'],['REFUND_PENDING','申請退款']],NEEDS_REVIEW:[['PROCESSING_RENDER','客戶已確認'],['REFUND_PENDING','申請退款']],QUEUED_TO_PRINT:[['PACKED','完成印裁與包裝'],['REPRINT','印裁失敗，重製'],['REFUND_PENDING','申請退款']],REPRINT:[['QUEUED_TO_PRINT','重製準備完成']],PACKED:[['SHIPPED','登記出貨']],SHIPPED:[['DELIVERED','已送達'],['SHIPPING_EXCEPTION','物流異常']],SHIPPING_EXCEPTION:[['QUEUED_TO_PRINT','安排補寄重製'],['REFUND_PENDING','申請退款']],REFUND_PENDING:[['REFUNDED','模擬退款完成']]};
function showOrders(operations=false){recordEvent(operations?'operations_opened':'orders_opened');modal(`<h2>${operations?'工坊訂單示範':'我的示範訂單'}</h2><p>所有資料只在本機瀏覽器。狀態按鈕為流程模擬，沒有付款、退款、物流或正式生產檔案。</p><div id="order-list"></div>${operations?'<details><summary>本次操作事件</summary><div id="event-list" class="order-log"></div></details>':'<button id="open-operations" class="modal-back">開啟工坊示範</button>'}`);$('modal').classList.add('wide');renderOrders(operations);if($('open-operations'))$('open-operations').onclick=()=>showOrders(true);}
function renderOrders(operations){$('order-list').innerHTML=localOrders.length?localOrders.slice().reverse().map(order=>{const s=order.snapshot;return `<article class="order-card"><h3>${escapeText(order.id)} <span class="status-tag">${escapeText(states[order.status]||order.status)}</span></h3><p>${s.items.length} 個圖案，${s.quantity} 張 A4，${s.finish==='matte'?'霧面':'亮面'}，${escapeText(s.shipping)}<br>商品 NT$${s.subtotal} + 運費 NT$${s.shippingFee} = NT$${s.total}<br>快照建立於 ${escapeText(new Date(s.createdAt).toLocaleString('zh-TW'))}</p><div class="order-actions"><button data-order="${escapeText(order.id)}" data-action="preview">核對快照</button><button data-order="${escapeText(order.id)}" data-action="download">下載設計快照</button><button data-order="${escapeText(order.id)}" data-action="reorder">再次編輯</button>${operations?(transitions[order.status]||[]).map(([next,label])=>`<button data-order="${escapeText(order.id)}" data-next="${next}">${label}</button>`).join(''):order.status==='PENDING_PAYMENT'?`<button data-order="${escapeText(order.id)}" data-next="CANCELLED">取消示範訂單</button>`:''}</div><div class="order-log">${order.log.map(escapeText).join('<br>')}${order.tracking?'<br>出貨紀錄：'+escapeText(order.tracking):''}</div></article>`;}).join(''):'<p>還沒有示範訂單。完成印製檢查後，即可建立第一筆。</p>';
 $('order-list').querySelectorAll('button').forEach(button=>button.onclick=()=>{const order=localOrders.find(o=>o.id===button.dataset.order);if(!order)return;if(button.dataset.next){transitionOrder(order,button.dataset.next,operations);return;}if(button.dataset.action==='download'){const blob=new Blob([JSON.stringify(order.snapshot,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=order.id+'-design-snapshot.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}if(button.dataset.action==='reorder'){snapshot();items=JSON.parse(JSON.stringify(order.snapshot.items));for(const item of items)item.id=++sequence;selected=items[0]?.id??null;$('quantity').value=order.snapshot.quantity;document.querySelector(`[name="finish"][value="${order.snapshot.finish==='glossy'?'glossy':'matte'}"]`).checked=true;$('modal').close();render();notify('已載入獨立副本，原訂單快照不受影響；重新下單使用目前價格。');return;}if(button.dataset.action==='preview'){const s=order.snapshot;modal(`<h2>核對訂單快照</h2>${sheetPreview(s.items)}<div class="scroll-table"><table class="summary-table"><thead><tr><th>圖案</th><th>寬 × 高 mm</th><th>白邊 mm</th></tr></thead><tbody>${s.items.map(i=>`<tr><td>${escapeText(i.name)}</td><td>${i.w} × ${(i.w/i.ratio).toFixed(1)}</td><td>${i.border}</td></tr>`).join('')}</tbody></table></div><div class="split-preview">${s.items.slice(0,6).map(i=>`<div><img src="${escapeText(i.src)}" alt="${escapeText(i.name)}"><span>${escapeText(i.name)}</span></div>`).join('')}</div><p>此快照保存圖檔、尺寸、位置、材質與價格。正式印刷 PDF / SVG / DXF 尚未產生。</p><button id="back-orders" class="modal-back">返回訂單</button>`);$('modal').classList.add('wide');$('back-orders').onclick=()=>showOrders(operations);}});
 if($('event-list'))$('event-list').textContent=telemetry.map(e=>e.time+' '+e.name+' '+JSON.stringify(e.detail)).join('\n');}
async function transitionOrder(order,next,operations){if(!(transitions[order.status]||[]).some(([state])=>state===next))return;const needsReason=['REPRINT','SHIPPING_EXCEPTION','REFUND_PENDING','NEEDS_REVIEW'].includes(next);if(needsReason||next==='SHIPPED'){modal(`<h2>${next==='SHIPPED'?'登記示範出貨':'記錄處理原因'}</h2><label for="action-note">${next==='SHIPPED'?'示範追蹤編號':'原因與處理方式'}</label><input id="action-note" class="action-note" maxlength="180"><p>只保存本機記錄，不會通知客戶或物流公司。</p><button id="confirm-transition" class="button primary">儲存處理紀錄</button>`);$('confirm-transition').onclick=async()=>{const note=$('action-note').value.trim();if(!note){notify('請填寫原因或示範追蹤編號。');return;}await applyTransition(order,next,note);showOrders(operations);};}else{await applyTransition(order,next,'');renderOrders(operations);}}
async function applyTransition(order,next,note){const previous=JSON.parse(JSON.stringify(order));order.status=next;order.log.push(new Date().toLocaleTimeString('zh-TW')+' '+states[next]+(note?'：'+note:''));if(next==='SHIPPED')order.tracking=note;if(!await saveOrders()){Object.assign(order,previous);return;}recordEvent('order_state_changed',{next});}
$('orders').onclick=()=>showOrders(false);$('operations').onclick=()=>showOrders(true);
const mobileOps=document.createElement('button');mobileOps.className='mobile-operations';mobileOps.textContent='工坊示範';mobileOps.onclick=()=>showOrders(true);document.querySelector('.purpose-bar').append(mobileOps);
$('guide').onclick=()=>modal('<h2>從照片到一張貼紙板</h2><ol><li>免登入上傳，選擇保留原圖或去背。</li><li>設定 mm 尺寸、白邊與份數。</li><li>自動排版，檢查間距與清晰度。</li><li>確認材質、運費與總額。</li></ol><p>半斷裁切會保留整張底紙，圖案可逐張撕下。草稿自動保存在此裝置 30 天，無法跨裝置同步。示範去背不處理實際照片；示範訂單不收款。</p>');
const baseUpload=upload;
upload=async function(files){const before=items.length;await baseUpload(files);if(items.length>before)recordEvent('upload_completed',{count:items.length-before});};
const baseWidthChange=$('width').onchange;
$('width').onchange=()=>{baseWidthChange();recordEvent('size_changed');};
const baseDrag=startDrag;
startDrag=function(event,item,element){baseDrag(event,item,element);element.addEventListener('pointerup',()=>recordEvent('canvas_interaction'),{once:true});};
const mobileGuide=document.createElement('button');mobileGuide.className='mobile-operations';mobileGuide.textContent='製作指南';mobileGuide.onclick=()=>$('guide').click();document.querySelector('.purpose-bar').append(mobileGuide);
try{const saved=JSON.parse(localStorage.getItem(DRAFT_KEY));if(saved?.savedAt&&Date.now()-Date.parse(saved.savedAt)>30*86400000){items=[];selected=null;notify('舊草稿已超過 30 天，已建立新的貼紙板。');}purpose=saved?.purpose==='business'?'business':'life';document.querySelector(`[name="purpose"][value="${purpose}"]`).checked=true;}catch{}
if(purpose==='business')$('purpose-hint').textContent='設定 Logo 尺寸與份數，使用同圖排滿快速製作。';
window.addEventListener('pagehide',()=>persistDraft());render();

// Direct canvas transforms. Keep one undo entry for an entire pointer gesture.
const renderBeforeHandles = render;
const rotatePoint = (x,y,r) => ({x:x*Math.cos(r)-y*Math.sin(r),y:x*Math.sin(r)+y*Math.cos(r)});
const normalizeDegrees = angle => ((angle+180)%360+360)%360-180;
function transformFeedback(item,element){
 element.style.left=item.x/210*100+'%';
 element.style.top=item.y/297*100+'%';
 element.style.width=item.w/210*100+'%';
 element.style.height=(item.w/item.ratio)/297*100+'%';
 element.style.transform=`rotate(${item.rotation}deg)`;
 $('width').value=item.w;
 $('height-value').textContent=(item.w/item.ratio).toFixed(1);
 $('rotation').value=item.rotation;
 const hint=element.querySelector('.transform-readout');
 if(hint)hint.textContent=`${item.w} mm · ${item.rotation}°`;
}
function beginCanvasTransform(event,item,element,handle,corner){
 if(event.button!==0)return;
 event.stopPropagation();event.preventDefault();
 const paper=$('paper').getBoundingClientRect();
 const scale=paper.width/210;
 const initial={...item};
 const center={x:item.x+item.w/2,y:item.y+item.w/item.ratio/2};
 const radians=item.rotation*Math.PI/180;
 const axis=corner?rotatePoint(corner[0],corner[1]/item.ratio,radians):null;
 const fixed=corner?{x:center.x-axis.x*item.w/2,y:center.y-axis.y*item.w/2}:null;
 const pointer=ev=>({x:(ev.clientX-paper.left)/scale,y:(ev.clientY-paper.top)/scale});
 const start=pointer(event);
 const startingAngle=Math.atan2(start.y-center.y,start.x-center.x)*180/Math.PI;
 let changed=false;
 handle.setPointerCapture(event.pointerId);
 element.classList.add('transforming');
 function move(ev){
  const p=pointer(ev);
  if(!changed&&Math.hypot(p.x-start.x,p.y-start.y)<.6)return;
  if(!changed){snapshot();changed=true;}
  if(corner){
   const relative={x:p.x-fixed.x,y:p.y-fixed.y};
   const projected=(relative.x*axis.x+relative.y*axis.y)/(axis.x*axis.x+axis.y*axis.y);
   item.w=Math.round(clamp(projected,15,Math.min(100,200*item.ratio))*10)/10;
   item.x=fixed.x+axis.x*item.w/2-item.w/2;
   item.y=fixed.y+axis.y*item.w/2-item.w/item.ratio/2;
  }else{
   const current=Math.atan2(p.y-center.y,p.x-center.x)*180/Math.PI;
   const angle=normalizeDegrees(initial.rotation+current-startingAngle);
   item.rotation=normalizeDegrees(Math.round(angle/(ev.shiftKey?15:1))*(ev.shiftKey?15:1));
   item.x=center.x-item.w/2;item.y=center.y-item.w/item.ratio/2;
  }
  moveItem(item,item.x,item.y);
  transformFeedback(item,element);
 }
 function end(ev){
  handle.removeEventListener('pointermove',move);
  handle.removeEventListener('pointerup',end);
  handle.removeEventListener('pointercancel',end);
  if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
  element.classList.remove('transforming');
  if(ev.type==='pointercancel'&&changed){Object.assign(item,initial);history.pop();}
  render();
  if(changed&&ev.type!=='pointercancel')recordEvent(corner?'canvas_resized':'canvas_rotated');
 }
 handle.addEventListener('pointermove',move);
 handle.addEventListener('pointerup',end);
 handle.addEventListener('pointercancel',end);
}
function makeTransformHandle(item,element,corner){
 const handle=document.createElement('span');
 const resize=Boolean(corner);
 const cornerName=corner?`${corner[1]<0?'上':'下'}${corner[0]<0?'左':'右'}`:'';
 handle.className='transform-handle '+(resize?`resize-handle ${cornerName}`:'rotate-handle');
 handle.setAttribute('role','button');handle.tabIndex=0;
 handle.setAttribute('aria-label',resize?`${cornerName}角等比例縮放`:'旋轉貼紙');
 handle.title=resize?'拖曳調整大小；方向鍵微調尺寸':'拖曳旋轉；按住 Shift 以 15° 調整';
 handle.textContent=resize?'':'↻';
 handle.addEventListener('click',event=>{event.stopPropagation();event.preventDefault();});
 handle.addEventListener('pointerdown',event=>beginCanvasTransform(event,item,element,handle,corner));
 handle.addEventListener('keydown',event=>{
  event.stopPropagation();
  if(!['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(event.key))return;
  event.preventDefault();snapshot();
  const amount=(event.key==='ArrowUp'||event.key==='ArrowRight'?1:-1)*(event.shiftKey?5:1);
  const cx=item.x+item.w/2,cy=item.y+item.w/item.ratio/2;
  if(resize){item.w=clamp(item.w+amount,15,Math.min(100,200*item.ratio));item.x=cx-item.w/2;item.y=cy-item.w/item.ratio/2;}
  else item.rotation=normalizeDegrees(item.rotation+amount);
  moveItem(item,item.x,item.y);render();
  const selector=resize?`.resize-handle.${cornerName}`:'.rotate-handle';
  document.querySelector('.sticker.selected '+selector)?.focus();
  recordEvent(resize?'canvas_resized':'canvas_rotated');
 });
 return handle;
}
render=function(){
 renderBeforeHandles();
 document.querySelectorAll('.transform-handle,.transform-readout').forEach(node=>node.remove());
 const item=selectedItem(),element=document.querySelector('.sticker.selected');
 if(!item||!element)return;
 for(const corner of [[-1,-1],[1,-1],[-1,1],[1,1]])element.append(makeTransformHandle(item,element,corner));
 element.append(makeTransformHandle(item,element,null));
 const readout=document.createElement('span');readout.className='transform-readout';readout.setAttribute('aria-hidden','true');
 element.append(readout);transformFeedback(item,element);
};
document.querySelector('.desk-bottom > span:nth-child(2)').textContent='拖曳角落縮放 · 上方把手旋轉';
render();
