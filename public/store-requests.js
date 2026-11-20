const escape = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={pending:'Хүлээгдэж байна',preparing:'Бэлтгэж байна',sent:'Илгээсэн',received:'Хүлээн авсан',rejected:'Татгалзсан',cancelled:'Цуцалсан'};
export function stockOptions(p){
  if(p.powder_sizes) return Object.entries(p.powder_sizes).map(([key,v])=>({key,label:v.label||key.slice(-1).toUpperCase(),stock:v.stock}));
  if(p.coffee_sizes) return Object.entries(p.coffee_sizes).map(([key,v])=>({key,label:key==='size_1kg'?'1кг':'250гр',stock:v.stock}));
  return ['unit','box'].filter(k=>p[k+'_price']>0).map(key=>({key,label:p[key+'_label']||key,stock:p['warehouse_'+key+'_stock']||0}));
}
export async function mountRequests(root,sb,mode='staff'){
  root.classList.add('sr');
  let products=[],brands=[],requests=[],draft=[],user=null,branch=null,search='',busy=false,retry=null,closed=false,loadId=0;
  const excluded=new Set();
  root.innerHTML='<p>Түр хүлээнэ үү…</p>';
  const session=await sb.auth.getUser(); user=session.data?.user;
  if(!user){root.innerHTML='<p>Эхлээд нэвтэрнэ үү.</p>';return;}
  const access=await sb.rpc(mode==='warehouse'?'is_request_manager':'request_store');
  if(access.error||!access.data){root.innerHTML='<p class="error">Хандах эрхгүй эсвэл SQL шинэчлэлт хийгдээгүй байна.</p>';return;}
  branch=mode==='staff'?access.data:null;
  root.innerHTML=`<header><div><h1>${mode==='staff'?'Дэлгүүрийн бараа захиалга':'Дэлгүүрүүдийн захиалга'}</h1><p>${escape(branch||'Агуулахад ирсэн хүсэлтүүд')}</p></div><button data-refresh class="secondary">Шинэчлэх</button></header><p role="status" data-message></p>
    ${mode==='staff'?'<p class="muted">Илгээсэн тоог агуулахын боломжит үлдэгдлээс түр хасна. Цуцлах эсвэл татгалзахад буцааж нэмнэ.</p><div class="sr-grid"><section><input data-search placeholder="Барааны нэрээр хайх" aria-label="Бараа хайх"><div data-products></div></section><section><h2>Захиалах бараа</h2><div data-draft></div><textarea data-note maxlength="500" placeholder="Тайлбар (заавал биш)" aria-label="Тайлбар"></textarea><button data-submit style="margin-top:12px">Захиалга илгээх</button></section></div>':''}<h2>Захиалгын түүх</h2><div data-requests></div>`;
  const $=q=>root.querySelector(q);
  if(mode==='staff') $('.sr-grid').previousElementSibling.textContent='Хүсэлт илгээхэд нөөц хасагдахгүй. Агуулах барааг сонгож “Бэлтгэж байна” гэж баталсны дараа нөөц хасагдана.';
  if(mode==='warehouse'){
    const hint=document.createElement('p');hint.className='muted';
    hint.textContent='Бэлдэх бараануудаа сонгоод “Бэлтгэж байна” гэж батлахад сонгосон барааны нөөц хасагдана. Сонгоогүй барааг энэ хүсэлтээр илгээхгүй. “Илгээх” цэсээр давхар шилжүүлэхгүй.';
    root.querySelector('header').after(hint);
  }
  function message(t,error=false){$('[data-message]').textContent=t;$('[data-message]').className=error?'error':'success';}
  function requestItem(item,request){
    const product=products.find(p=>p.id===item.product_id);
    const brand=brands.find(b=>b.id===product?.brand_id)?.name;
    const image=product?.images?.[0];
    const key=request.id+':'+item.product_id+':'+item.option_type;
    const select=mode==='warehouse'&&request.status==='pending';
    return `<div class="sr-request-item">${select?`<input type="checkbox" data-select-item="${escape(key)}" aria-label="${escape(item.product_name+' '+item.option_label)} бэлдэх" ${excluded.has(key)?'':'checked'} ${busy?'disabled':''}>`:''}<div class="sr-request-image">${image?`<img src="${escape(image)}" alt="${escape(item.product_name)}" loading="lazy">`:''}<span ${image?'hidden':''}>Зураггүй</span></div><div class="sr-request-info"><div class="muted">${escape(brand||'Брэнд оруулаагүй')}</div><strong>${escape(item.product_name)}</strong><div>${escape(item.option_label)} × <b>${item.qty}</b></div>${request.status!=='pending'?`<div class="muted">${item.approved?'Бэлдэхээр сонгосон':'Бэлдэхээр сонгоогүй'}</div>`:''}</div></div>`;
  }
  root.addEventListener('error',e=>{
    if(e.target.matches?.('.sr-request-image img')){e.target.hidden=true;e.target.nextElementSibling.hidden=false;}
  },true);
  function render(){
    if(mode==='staff'){
      $('[data-products]').innerHTML=products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).map(p=>`<div class="sr-product"><div class="sr-row">${p.images?.[0]?`<img src="${escape(p.images[0])}" alt="">`:''}<strong>${escape(p.name)}</strong></div><div class="sr-choices">${stockOptions(p).map(o=>`<div class="sr-choice"><span>${escape(o.label)} · Үлдэгдэл: <b>${o.stock}</b></span><button data-add="${p.id}" data-option="${escape(o.key)}" ${busy||o.stock<=0?'disabled':''}>${o.stock>0?'Нэмэх':'Дууссан'}</button></div>`).join('')}</div></div>`).join('')||'<p>Бараа олдсонгүй.</p>';
      $('[data-draft]').innerHTML=draft.map((d,i)=>`<div class="sr-card"><strong>${escape(d.name)}</strong><p>${escape(d.label)}</p><div class="sr-row"><input data-qty="${i}" type="number" min="1" max="${d.stock}" value="${d.qty}" aria-label="Тоо ширхэг" ${busy?'disabled':''}><button data-remove="${i}" class="danger" ${busy?'disabled':''}>Хасах</button></div></div>`).join('')||'<p class="muted">Бараа сонгоно уу.</p>';
      $('[data-submit]').disabled=busy||!draft.length;
      $('[data-submit]').textContent=busy?'Илгээж байна…':'Захиалга илгээх';
      $('[data-note]').disabled=busy;
    }
    $('[data-requests]').innerHTML=requests.map(r=>{
      const actions=mode==='warehouse'?(r.status==='pending'?['preparing','rejected']:r.status==='preparing'?['sent','rejected']:[]):r.status==='pending'&&r.requested_by===user.id?['cancelled']:r.status==='sent'?['received']:[];
      return `<article class="sr-card"><div class="sr-row"><strong>${escape(r.store_name)} · ${escape(r.id.slice(0,8))}</strong><b>${labels[r.status]}</b></div><p class="muted">${escape(new Date(r.created_at).toLocaleString('mn-MN'))}</p>${(r.store_request_items||[]).map(i=>requestItem(i,r)).join('')}<p>${escape(r.note)}</p><div class="sr-row">${actions.map(a=>`<button data-action="${a}" data-id="${r.id}" ${busy?'disabled':''} class="${a==='rejected'||a==='cancelled'?'danger':''}">${labels[a]}</button>`).join('')}</div></article>`;
    }).join('')||'<p class="muted">Захиалга байхгүй.</p>';
  }
  async function refresh(){
    const seq=++loadId;
    const [p,r,b]=await Promise.all([sb.from('products').select('*').order('name'),sb.from('store_requests').select('*,store_request_items(*)').order('created_at',{ascending:false}).limit(200),sb.from('brands').select('id,name')]);
    if(closed||seq!==loadId)return;
    if(p.error||r.error||b.error){message((p.error||r.error||b.error).message,true);return;}
    products=p.data;requests=r.data;brands=b.data;
    if(mode==='staff'&&retry&&requests.some(r=>r.id===retry&&r.requested_by===user.id)){
      draft=[];retry=null;$('[data-note]').value='';message('Захиалга агуулахад бүртгэгдсэн байна.');
    }
    draft.forEach(d=>{d.stock=stockOptions(products.find(p=>p.id===d.product_id)||{}).find(o=>o.key===d.option_type)?.stock||0;});render();
  }
  root.addEventListener('input',e=>{
    if(e.target.matches('[data-search]')){search=e.target.value;render();}
    if(e.target.matches('[data-note]'))retry=null;
  });
  root.addEventListener('change',e=>{if(e.target.matches('[data-qty]')&&!busy){draft[Number(e.target.dataset.qty)].qty=Number(e.target.value);retry=null;}});
  root.addEventListener('change',e=>{if(e.target.matches('[data-select-item]')){if(e.target.checked)excluded.delete(e.target.dataset.selectItem);else excluded.add(e.target.dataset.selectItem);}});
  root.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b||busy)return;
    if(b.hasAttribute('data-refresh'))return refresh();
    if(b.hasAttribute('data-add')){
      const p=products.find(p=>p.id===Number(b.dataset.add));const o=stockOptions(p).find(o=>o.key===b.dataset.option);
      const d=draft.find(d=>d.product_id===p.id&&d.option_type===o.key);
      if(o.stock<=0)return;
      if(d){if(d.qty>=o.stock)return message('Үлдэгдлээс их тоо сонгох боломжгүй.',true);d.qty++;}
      else draft.push({product_id:p.id,option_type:o.key,qty:1,name:p.name,label:o.label,stock:o.stock});
      retry=null;render();return;
    }
    if(b.hasAttribute('data-remove')){draft.splice(Number(b.dataset.remove),1);retry=null;render();return;}
    if(b.hasAttribute('data-submit')){
      if(draft.some(d=>!Number.isInteger(d.qty)||d.qty<1||d.qty>d.stock||d.qty>1000))return message('Тоо ширхэгийг үлдэгдэлд багтааж зөв оруулна уу.',true);
      retry ||= crypto.randomUUID();busy=true;render();
      try{const {error}=await sb.rpc('submit_store_request',{p_id:retry,p_items:draft.map(({product_id,option_type,qty})=>({product_id,option_type,qty})),p_note:$('[data-note]').value});
        if(error)throw error;draft=[];retry=null;$('[data-note]').value='';message('Захиалга агуулахад илгээгдлээ.');
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
