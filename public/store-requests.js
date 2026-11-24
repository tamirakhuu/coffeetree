const escape = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={pending:'Хүлээгдэж байна',preparing:'Бэлдсэн',sent:'Илгээсэн',received:'Хүлээн авсан',rejected:'Татгалзсан',cancelled:'Цуцалсан'};
const actionLabels={cancelled:'Цуцлах'}; // товчны бичвэр — статусын нэрнээс ялгаатайгаар "хийх үйлдэл" гэдгийг тодруулна
const tagClass={pending:'sr-tag-pending',preparing:'sr-tag-pending',sent:'sr-tag-ok',received:'sr-tag-ok',rejected:'sr-tag-bad',cancelled:'sr-tag-bad'};
// toLocaleString('mn-MN') зарим төхөөрөмжид (бүрэн ICU локал дата байхгүй үед) буруу
// харагддаг тул гараар, тогтвортой форматаар он-сар-өдөр цаг-минутыг бичнэ.
function formatDateTime(iso){
  const d=new Date(iso);
  const p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function ensurePrintSlip(){
  let el=document.getElementById('sr-print-slip');
  if(!el){el=document.createElement('div');el.id='sr-print-slip';document.body.appendChild(el);}
  return el;
}
export function stockOptions(p){
  if(p.powder_sizes) return Object.entries(p.powder_sizes).map(([key,v])=>({key,label:v.label||key.slice(-1).toUpperCase(),stock:v.stock}));
  if(p.coffee_sizes) return Object.entries(p.coffee_sizes).map(([key,v])=>({key,label:key==='size_1kg'?'1кг':'250гр',stock:v.stock}));
  const keys=[];
  if(p.box_price>0) keys.push('box');
  if(p.unit_price>0) keys.push('unit');
  return keys.map(key=>({key,label:p[key+'_label']||(key==='box'?'Хайрцаг':'Ширхэг'),stock:p['warehouse_'+key+'_stock']||0}));
}
export async function mountRequests(root,sb,mode='staff'){
  root.classList.add('sr');
  root.classList.add('sr-'+mode);
  let products=[],brands=[],requests=[],draft=[],user=null,branch=null,search='',busy=false,retry=null,closed=false,loadId=0,cartOpen=false;
  const excluded=new Set();
  let brandFilter='',inStock=false;
  root.innerHTML='<p>Түр хүлээнэ үү…</p>';
  const session=await sb.auth.getUser(); user=session.data?.user;
  if(!user){root.innerHTML='<p>Эхлээд нэвтэрнэ үү.</p>';return;}
  const access=await sb.rpc(mode==='warehouse'?'is_request_manager':'request_store');
  if(access.error||!access.data){root.innerHTML='<p class="error">Хандах эрхгүй эсвэл SQL шинэчлэлт хийгдээгүй байна.</p>';return;}
  branch=mode==='staff'?access.data:null;
  root.innerHTML=`<header><div><h2>${mode==='staff'?'Бараа захиалах':'Дэлгүүрүүдийн захиалга'}</h2><p class="muted">${escape(branch||'Агуулахад ирсэн хүсэлтүүд')}</p></div><button data-refresh class="secondary">Шинэчлэх</button></header><p role="status" data-message></p>
    ${mode==='staff'?`<div class="sr-toolbar"><input data-search placeholder="Нэр, брэндээр хайх…" aria-label="Бараа хайх"><select data-brand aria-label="Брэнд"><option value="">Бүх брэнд</option></select><label><input type="checkbox" data-instock> Үлдэгдэлтэй</label></div><p class="muted" data-count></p><div data-products></div><details class="sr-history"><summary>Захиалгын түүх харах</summary><div data-requests></div></details>`:'<h2 style="margin:18px 0 10px">Хүсэлтүүд</h2><div data-requests></div>'}
    ${mode==='staff'?`<div class="sr-backdrop" data-cart-backdrop hidden></div><div class="sr-bar"><div class="sr-cart-sheet" data-cart-sheet hidden><div class="sr-sheet-head"><strong>Сонгосон бараа <span data-sheet-count>(0)</span></strong><button type="button" class="sr-sheet-close" data-cart-toggle aria-label="Хаах">✕</button></div><div data-draft></div><label class="sr-note-label" for="request-note">Нэмэлт тайлбар(Заавал биш)</label><textarea id="request-note" data-note maxlength="500" placeholder="Жишээ: Хүргэлтээр гарах бараа"></textarea></div><div class="in"><button type="button" class="sr-bar-info" data-cart-toggle><small>Сонгосон</small><strong data-sum>0 бараа</strong></button><button data-submit>Захиалга илгээх</button></div></div>`:''}`;
  const $=q=>root.querySelector(q);
  if(mode==='warehouse'){
    const hint=document.createElement('p');hint.className='muted';
    hint.textContent='Бэлдэх бараануудаа сонгоод “Бэлдсэн” гэж батлахад сонгосон барааны нөөц хасагдана. Сонгоогүй барааг энэ хүсэлтээр илгээхгүй. “Илгээх” цэсээр давхар шилжүүлэхгүй.';
    root.querySelector('header').after(hint);
  }
  function message(t,error=false){$('[data-message]').textContent=t;$('[data-message]').className=error?'error':'success';}
  function printRequest(r){
    const items=(r.store_request_items||[]).filter(i=>i.approved);
    const rows=items.map(i=>{
      const product=products.find(p=>p.id===i.product_id);
      const brandName=brands.find(b=>b.id===product?.brand_id)?.name||'';
      return `<tr><td>${escape(brandName)}</td><td>${escape(i.product_name)} (${escape(i.option_label)})</td><td>${i.qty}</td></tr>`;
    }).join('');
    ensurePrintSlip().innerHTML=`<h1>CUPPA · Бэлдсэн барааны баримт</h1><p>${escape(r.store_name)} · ${formatDateTime(r.created_at)}</p><table><thead><tr><th>Брэнд</th><th>Бараа</th><th>Тоо</th></tr></thead><tbody>${rows}</tbody></table>`;
    const cleanup=()=>{document.body.classList.remove('sr-printing');window.removeEventListener('afterprint',cleanup);};
    window.addEventListener('afterprint',cleanup);
    document.body.classList.add('sr-printing');
    window.print();
  }
  function requestItem(item,request){
    const product=products.find(p=>p.id===item.product_id);
    const brand=brands.find(b=>b.id===product?.brand_id)?.name;
    const image=product?.images?.[0];
    const key=request.id+':'+item.product_id+':'+item.option_type;
    const select=mode==='warehouse'&&request.status==='pending';
    return `<div class="sr-request-item">${select?`<input type="checkbox" data-select-item="${escape(key)}" aria-label="${escape(item.product_name+' '+item.option_label)} бэлдэх" ${excluded.has(key)?'':'checked'} ${busy?'disabled':''}>`:''}<div class="sr-request-image">${image?`<img src="${escape(image)}" alt="${escape(item.product_name)}" loading="lazy">`:''}<span ${image?'hidden':''}>Зураггүй</span></div><div class="sr-request-info"><div class="muted">${escape(brand||'Брэнд оруулаагүй')}</div><strong>${escape(item.product_name)}</strong><div>${escape(item.option_label)} × <b>${item.qty}</b></div>${request.status!=='pending'?(item.approved?`<div class="muted">Бэлдсэн</div>`:`<div class="sr-tag-unprepared">Бэлдээгүй</div>`):''}</div></div>`;
  }
  function requestCard(r){
    const actions=mode==='warehouse'?(r.status==='pending'?['preparing','rejected']:r.status==='preparing'?['sent','rejected']:[]):r.status==='pending'&&r.requested_by===user.id?['cancelled']:r.status==='sent'?['received']:[];
    const header=mode==='warehouse'?`<strong>${escape(r.store_name)} · ${escape(r.id.slice(0,8))}</strong><span class="sr-tag ${tagClass[r.status]}">${labels[r.status]}</span>`:`<span class="sr-tag ${tagClass[r.status]}">${labels[r.status]}</span>`;
    const canPrint=mode==='warehouse'&&['preparing','sent','received'].includes(r.status);
    return `<article class="sr-card"><div class="sr-row">${header}</div><p class="muted">${formatDateTime(r.created_at)}</p>${(r.store_request_items||[]).map(i=>requestItem(i,r)).join('')}${r.note?`<p class="muted">${escape(r.note)}</p>`:''}<div class="sr-row">${actions.map(a=>`<button data-action="${a}" data-id="${r.id}" ${busy?'disabled':''} class="${a==='rejected'||a==='cancelled'?'danger':''}">${actionLabels[a]||labels[a]}</button>`).join('')}${canPrint?`<button data-print="${r.id}" class="secondary">Хэвлэх</button>`:''}</div></article>`;
  }
  root.addEventListener('error',e=>{
    if(e.target.matches?.('.sr-request-image img')){e.target.hidden=true;e.target.nextElementSibling.hidden=false;}
    if(e.target.matches?.('.sr-thumb img')){e.target.parentElement.textContent='Зураггүй';}
  },true);
  function render(){
    if(mode==='staff'){
      $('[data-products]').innerHTML=products.filter(p=>{
        const brand=brands.find(b=>b.id===p.brand_id)?.name||'';
        return stockOptions(p).length&&(p.name+' '+brand).toLowerCase().includes(search.toLowerCase())&&(!brandFilter||String(p.brand_id)===brandFilter)&&(!inStock||stockOptions(p).some(o=>o.stock>0));
      }).map(p=>`<div class="sr-product"><div class="sr-thumb">${p.images?.[0]?`<img src="${escape(p.images[0])}" alt="" loading="lazy">`:'<span>Зураггүй</span>'}</div><div class="sr-product-heading"><div class="muted">${escape(brands.find(b=>b.id===p.brand_id)?.name||'Брэнд оруулаагүй')}</div><strong>${escape(p.name)}</strong>${p.box_price>0&&p.box_per_box?`<div class="muted">1 хайрцагт ${p.box_per_box} ширхэг</div>`:''}<div class="sr-choices">${stockOptions(p).map(o=>{const addLabel=o.key==='box'?'Хайрцаг':o.key==='unit'?'Ширхэг':o.label;return `<div class="sr-choice"><span>${escape(o.label)}<small>Үлдэгдэл: ${o.stock}</small></span><button data-add="${p.id}" data-option="${escape(o.key)}" ${busy||o.stock<=0?'disabled':''}>${o.stock>0?'+ '+escape(addLabel):'Дууссан'}</button></div>`;}).join('')}</div></div></div>`).join('')||'<p class="sr-empty">Таны хайлтад тохирох бараа олдсонгүй.</p>';
      $('[data-count]').textContent=`${$('[data-products]').querySelectorAll('.sr-product').length} бараа · Агуулахын үлдэгдэл`;
      $('[data-sheet-count]').textContent=`(${draft.length})`;
      $('[data-draft]').innerHTML=draft.map((d,i)=>`<div class="sr-card"><div class="sr-thumb">${d.image?`<img src="${escape(d.image)}" alt="" loading="lazy">`:'<span>Зураггүй</span>'}</div><div class="sr-draft-info"><strong>${escape(d.name)}</strong><p>${escape(d.label)}</p><div class="sr-row"><div class="sr-stepper"><button type="button" data-dec="${i}" aria-label="Тоо хасах" ${busy?'disabled':''}>−</button><input data-qty="${i}" type="number" min="1" max="${d.stock}" value="${d.qty}" aria-label="Тоо ширхэг" ${busy?'disabled':''}><button type="button" data-inc="${i}" aria-label="Тоо нэмэх" ${busy||d.qty>=d.stock?'disabled':''}>+</button></div><button data-remove="${i}" class="danger" ${busy?'disabled':''}>Устгах</button></div></div></div>`).join('')||'<p class="muted">Бараа сонгоно уу.</p>';
      $('[data-sum]').textContent=(draft.length?`${draft.length} бараа`:'0 бараа')+' '+(cartOpen?'▴':'▾');
      $('[data-submit]').disabled=busy||!draft.length;
      $('[data-submit]').textContent=busy?'Илгээж байна…':'Захиалга илгээх';
      $('[data-note]').disabled=busy;
      $('[data-cart-sheet]').hidden=!cartOpen;
      $('[data-cart-backdrop]').hidden=!cartOpen;
    }
    $('[data-requests]').innerHTML=requests.map(requestCard).join('')||'<p class="muted">Захиалга байхгүй.</p>';
  }
  async function refresh(){
    const seq=++loadId;
    const [p,r,b]=await Promise.all([sb.from('products').select('*').order('name'),sb.from('store_requests').select('*,store_request_items(*)').order('created_at',{ascending:false}).limit(200),sb.from('brands').select('id,name')]);
    if(closed||seq!==loadId)return;
    if(p.error||r.error||b.error){message((p.error||r.error||b.error).message,true);return;}
    products=p.data;requests=r.data;brands=b.data;
    if(mode==='staff'){
      $('[data-brand]').innerHTML='<option value="">Бүх брэнд</option>'+brands.map(b=>`<option value="${b.id}">${escape(b.name)}</option>`).join('');
      $('[data-brand]').value=brandFilter;
    }
    if(mode==='staff'&&retry&&requests.some(r=>r.id===retry&&r.requested_by===user.id)){
      draft=[];retry=null;cartOpen=false;$('[data-note]').value='';message('Захиалга агуулахад бүртгэгдсэн байна.');
    }
    draft.forEach(d=>{const prod=products.find(p=>p.id===d.product_id);d.stock=stockOptions(prod||{}).find(o=>o.key===d.option_type)?.stock||0;d.image=prod?.images?.[0];});render();
  }
  root.addEventListener('input',e=>{
    if(e.target.matches('[data-search]')){search=e.target.value;render();}
    if(e.target.matches('[data-note]'))retry=null;
  });
  root.addEventListener('change',e=>{if(e.target.matches('[data-qty]')&&!busy){draft[Number(e.target.dataset.qty)].qty=Number(e.target.value);retry=null;}});
  root.addEventListener('click',e=>{if(e.target.matches('[data-cart-backdrop]')){cartOpen=false;render();}});
  root.addEventListener('change',e=>{if(e.target.matches('[data-select-item]')){if(e.target.checked)excluded.delete(e.target.dataset.selectItem);else excluded.add(e.target.dataset.selectItem);}});
  root.addEventListener('change',e=>{if(e.target.matches('[data-brand]')){brandFilter=e.target.value;render();}if(e.target.matches('[data-instock]')){inStock=e.target.checked;render();}});
  root.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b||busy)return;
    if(b.hasAttribute('data-refresh'))return refresh();
    if(b.dataset.print){const r=requests.find(x=>x.id===b.dataset.print);if(r)printRequest(r);return;}
    if(b.hasAttribute('data-cart-toggle')){cartOpen=!cartOpen;render();return;}
    if(b.hasAttribute('data-add')){
      const p=products.find(p=>p.id===Number(b.dataset.add));const o=stockOptions(p).find(o=>o.key===b.dataset.option);
      const d=draft.find(d=>d.product_id===p.id&&d.option_type===o.key);
      if(o.stock<=0)return;
      if(d){if(d.qty>=o.stock)return message('Үлдэгдлээс их тоо сонгох боломжгүй.',true);d.qty++;}
      else draft.push({product_id:p.id,option_type:o.key,qty:1,name:p.name,label:o.label,stock:o.stock,image:p.images?.[0]});
      retry=null;render();return;
    }
    if(b.hasAttribute('data-inc')){const d=draft[Number(b.dataset.inc)];if(d&&d.qty<d.stock){d.qty++;retry=null;render();}return;}
    if(b.hasAttribute('data-dec')){const i=Number(b.dataset.dec);const d=draft[i];if(d){if(d.qty<=1)draft.splice(i,1);else d.qty--;retry=null;render();}return;}
    if(b.hasAttribute('data-remove')){draft.splice(Number(b.dataset.remove),1);retry=null;render();return;}
    if(b.hasAttribute('data-submit')){
      if(draft.some(d=>!Number.isInteger(d.qty)||d.qty<1||d.qty>d.stock||d.qty>1000))return message('Тоо ширхэгийг үлдэгдэлд багтааж зөв оруулна уу.',true);
      retry ||= crypto.randomUUID();busy=true;render();
      try{const {error}=await sb.rpc('submit_store_request',{p_id:retry,p_items:draft.map(({product_id,option_type,qty})=>({product_id,option_type,qty})),p_note:$('[data-note]').value});
        if(error)throw error;draft=[];retry=null;cartOpen=false;$('[data-note]').value='';message('Захиалга агуулахад илгээгдлээ.');
      }catch(e){message(e.message||'Холболт тасарлаа. Дахин оролдоно уу.',true);}finally{busy=false;await refresh();render();}return;
    }
    if(b.dataset.action){
      const request=requests.find(r=>r.id===b.dataset.id);
      const chosen=(request?.store_request_items||[]).filter(i=>!excluded.has(request.id+':'+i.product_id+':'+i.option_type)).map(i=>({product_id:i.product_id,option_type:i.option_type}));
      if(b.dataset.action==='preparing'&&!chosen.length)return message('Бэлдэх бараагаа сонгоно уу.',true);
      if(!confirm(`${labels[b.dataset.action]} төлөвт шилжүүлэх үү?`))return;
      busy=true;render();
      try{const {error}=await (b.dataset.action==='preparing'?sb.rpc('prepare_store_request',{p_id:b.dataset.id,p_items:chosen}):sb.rpc('change_store_request',{p_id:b.dataset.id,p_status:b.dataset.action}));if(error)throw error;message('Төлөв шинэчлэгдлээ.');}
      catch(e){message(e.message,true);}finally{busy=false;await refresh();render();}
    }
  });
  await refresh();
  const channel=sb.channel('store-requests-'+mode+'-'+Math.random()).on('postgres_changes',{event:'*',schema:'public',table:'store_requests'},refresh).on('postgres_changes',{event:'UPDATE',schema:'public',table:'products'},refresh).subscribe();
  const timer=setInterval(()=>{if(!document.hidden)refresh();},30000);
  window.addEventListener('pagehide',()=>{closed=true;clearInterval(timer);sb.removeChannel(channel);},{once:true});
}
