/* Public read-only showcase. The application remains the owner of live forms/DB. */
(()=>{
const prefix='/enduro-vietnam-showcase',localPath=location.pathname.slice(prefix.length).replace(/\/$/,'')||'/',ru=localPath.startsWith('/ru');
document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;let href=a.getAttribute('href');if(href.startsWith('/')&&!href.startsWith('//')&&!href.startsWith(prefix+'/')){a.setAttribute('href',prefix+href);href=prefix+href;}if(href.startsWith(prefix+'/admin')||href.startsWith(prefix+'/api')){e.preventDefault();location.href='https://t.me/mototourvietnam';}},true);
const search=document.querySelector('.home-search');if(search){const choice=search.querySelector('select:not([name])');choice?.addEventListener('change',()=>{search.action=prefix+(ru?'/ru':'')+(choice.value==='rentals'?'/rentals/motorbikes':'/all-tours');});}
const form=document.querySelector('.catalog-filters');if(!form)return;
fetch(prefix+'/catalog.json').then(r=>r.json()).then(data=>{
const inventory=data.catalogs[localPath]||[],params=new URLSearchParams(location.search);form.querySelectorAll('[name]').forEach(e=>{if(params.has(e.name)&&!e.disabled)e.value=params.get(e.name);});
const selected=k=>params.get(k)||'',fixedCity=form.querySelector('[name=city]')?.disabled?form.querySelector('[name=city]').value:'',fixedCategory=form.querySelector('[name=category]')?.disabled?form.querySelector('[name=category]').value:'';
let entries=inventory.map(c=>({card:c,o:data.offers.find(o=>o.id===c.id)})).filter(x=>x.o);
entries=entries.filter(({o})=>{const t=o.translations[ru?'ru':'en'],destination=data.destinations?.find(d=>d.id===o.city),text=[t?.title,t?.description,destination?.names.ru,destination?.names.en,...(destination?.aliases||[]),o.city].join(' ').toLowerCase();const city=fixedCity||selected('city'),category=fixedCategory||selected('category'),unit=selected('unit'),tariff=unit&&o.type==='rental'?o.tariffs?.find(t=>t.period===unit):null,c=tariff?{...tariff,unit:tariff.period}:o.commerce,v=o.vehicle||{},duration=o.duration,currency=selected('currency'),comparable=currency&&unit,scale=currency==='USD'?100:1;
return (!selected('q')||text.includes(selected('q').toLowerCase()))&&(!city||o.city===city||o.endCity===city)&&(!category||o.category===category||o.categories.includes(category))&&(!selected('type')||o.type===selected('type'))&&(!currency||c.currency===currency)&&(!unit||c.unit===unit)&&(!comparable||!selected('priceMin')||c.amountMinor!==null&&c.amountMinor>=Number(selected('priceMin'))*scale)&&(!comparable||!selected('priceMax')||c.amountMinor!==null&&c.amountMinor<=Number(selected('priceMax'))*scale)&&(!selected('durationMin')||duration&&duration.unit===(selected('durationUnit')||'hours')&&duration.value>=Number(selected('durationMin')))&&(!selected('durationMax')||duration&&duration.unit===(selected('durationUnit')||'hours')&&duration.value<=Number(selected('durationMax')))&&(!selected('level')||o.level?.toLowerCase().includes(selected('level').toLowerCase()))&&(!selected('engineMin')||typeof v.engineCC==='number'&&v.engineCC>=Number(selected('engineMin')))&&(!selected('seats')||typeof v.seats==='number'&&v.seats>=Number(selected('seats')))&&(!selected('gearbox')||String(v.gearbox||'').toLowerCase()===selected('gearbox'))&&(!selected('drive')||typeof v.selfDrive==='boolean'&&v.selfDrive===(selected('drive')==='self'));});
if(selected('sort')==='price'&&selected('currency')&&selected('unit'))entries.sort((a,b)=>{const amount=o=>(o.type==='rental'?o.tariffs?.find(t=>t.period===selected('unit')):o.commerce)?.amountMinor??Infinity;return amount(a.o)-amount(b.o)||a.o.id.localeCompare(b.o.id);});
const count=document.querySelector('[data-results]')||form.parentElement.querySelector('p[aria-live]'),pages=Math.ceil(entries.length/9),page=Math.max(1,Number(selected('page'))||1);if(count){count.textContent=ru?'Найдено '+entries.length+' позиций':entries.length+' offers';count.dataset.results=entries.length;}
let grid=document.querySelector('#rentalGrid,.offering-grid');if(!grid){grid=document.createElement('div');grid.className=localPath.includes('rent')?'rental-grid':'offering-grid';count?.after(grid);}grid.innerHTML=entries.slice((page-1)*9,page*9).map(c=>{if(!selected('unit')||c.o.type!=='rental')return c.card.html;const rate=c.o.tariffs?.find(t=>t.period===selected('unit'));if(!rate)return c.card.html;const template=document.createElement('template');template.innerHTML=c.card.html;const amount=template.content.querySelector('.card-body>p:not(.eyebrow)');if(amount){const units={day:ru?'день':'day',week:ru?'неделя':'week',month:ru?'месяц':'month','3_days':ru?'3 дня':'3 days'};amount.textContent=rate.amountMinor===null?(ru?'Цена по запросу':'Price on request'):(ru?'от ':'from ')+new Intl.NumberFormat(ru?'ru-RU':'en-US',{style:'currency',currency:rate.currency,maximumFractionDigits:rate.currency==='VND'?0:2}).format(rate.currency==='USD'?rate.amountMinor/100:rate.amountMinor)+' / '+(units[rate.period]||rate.period);}return template.innerHTML;}).join('');document.querySelector('.catalog-empty')?.remove();if(!entries.length)grid.textContent=ru?'Предложения не найдены. Измените фильтры.':'No matching offers. Try different filters.';
let pagination=document.querySelector('.pagination');if(!pagination){pagination=document.createElement('nav');pagination.className='pagination';pagination.setAttribute('aria-label',ru?'Страницы каталога':'Catalog pages');grid.after(pagination);}pagination.replaceChildren();for(let n=1;n<=pages;n++){const a=document.createElement('a'),q=new URLSearchParams(params);q.set('page',n);a.href=prefix+localPath+'/?'+q+(localPath.includes('rent')?'#models':'');a.textContent=n;if(n===page)a.setAttribute('aria-current','page');pagination.append(a);}
window.showcaseCatalogReady=true;
}).catch(()=>{window.showcaseCatalogReady=false;});
})();

(() => {
    const root = document.querySelector('.city-page');
    if (!root)
        return;
    const controller = new AbortController(), signal = controller.signal;
    const drawer = root.querySelector('#drawer'), backdrop = root.querySelector('#backdrop'), menu = root.querySelector('#openMenu'), header = root.querySelector('#siteHeader'), toc = root.querySelector('#sideToc');
    const oldOverflow = document.body.style.overflow;
    let focusTimer;
    function setDrawer(open, restore = true) { clearTimeout(focusTimer); drawer.classList.toggle('open', open); backdrop.classList.toggle('open', open); drawer.inert = !open; drawer.setAttribute('aria-hidden', String(!open)); menu.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : oldOverflow; if (open) {
        const ms = Math.max(...getComputedStyle(drawer).transitionDuration.split(',').map(v => parseFloat(v) * 1000));
        focusTimer = setTimeout(() => { if (drawer.classList.contains('open'))
            drawer.querySelector('#closeMenu')?.focus({ preventScroll: true }); }, ms + 50);
    }
    else if (restore)
        menu.focus({ preventScroll: true }); }
    menu.addEventListener('click', () => setDrawer(true), { signal });
    root.querySelector('#closeMenu').addEventListener('click', () => setDrawer(false), { signal });
    backdrop.addEventListener('click', () => setDrawer(false), { signal });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setDrawer(false, false), { signal }));
    document.addEventListener('keydown', e => { if (!drawer.classList.contains('open'))
        return; if (e.key === 'Escape') {
        e.preventDefault();
        setDrawer(false);
    } if (e.key === 'Tab') {
        const nodes = [...drawer.querySelectorAll('a[href],button')].filter(e => e.getClientRects().length), first = nodes[0], last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
        }
    } }, { signal });
    const scroll = () => { header.classList.toggle('scrolled', scrollY > 50); header.classList.toggle('over-content', (root.querySelector('.hero')?.getBoundingClientRect().bottom ?? 0) <= 72); toc.classList.toggle('show', scrollY > 650); };
    window.addEventListener('scroll', scroll, { passive: true, signal });
    scroll();
    const rail = root.querySelector('#tourRail');
    for (const [id, dir] of [['tourPrev', -1], ['tourNext', 1]])
        root.querySelector('#' + id)?.addEventListener('click', () => { const card = rail?.querySelector('.tour-card'); rail?.scrollBy({ left: dir * ((card?.getBoundingClientRect().width ?? 330) + 14), behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth' }); }, { signal });
    const tocLinks = [...toc.querySelectorAll('a')];
    const observer = new IntersectionObserver(entries => { for (const e of entries)
        if (e.isIntersecting)
            tocLinks.forEach(a => { const active = a.hash === '#' + e.target.id; a.classList.toggle('active', active); if (active)
                a.setAttribute('aria-current', 'location');
            else
                a.removeAttribute('aria-current'); }); }, { rootMargin: '-30% 0px -55% 0px' });
    tocLinks.forEach(a => { const section = root.querySelector(a.hash); if (section)
        observer.observe(section); });
    root.dataset.cityReady = 'true';
    return () => { delete root.dataset.cityReady; clearTimeout(focusTimer); controller.abort(); observer.disconnect(); document.body.style.overflow = oldOverflow; };
})();

(() => {
    const root = document.querySelector('.enduro-tour');
    if (!root)
        return;
    const abort = new AbortController(), signal = abort.signal, drawer = root.querySelector('#drawer'), backdrop = root.querySelector('#backdrop'), trigger = root.querySelector('#openMenu'), header = root.querySelector('#siteHeader'), toc = root.querySelector('#sideToc');
    const previous = document.body.style.overflow;
    let timer;
    const menu = (open, restore = true) => { clearTimeout(timer); drawer.classList.toggle('open', open); backdrop.classList.toggle('open', open); drawer.inert = !open; drawer.setAttribute('aria-hidden', String(!open)); trigger.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : previous; if (open)
        timer = setTimeout(() => drawer.querySelector('#closeMenu')?.focus({ preventScroll: true }), Math.max(...getComputedStyle(drawer).transitionDuration.split(',').map(v => parseFloat(v) * 1000)) + 50);
    else if (restore)
        trigger.focus({ preventScroll: true }); };
    trigger.addEventListener('click', () => menu(true), { signal });
    root.querySelector('#closeMenu').addEventListener('click', () => menu(false), { signal });
    backdrop.addEventListener('click', () => menu(false), { signal });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu(false, false), { signal }));
    document.addEventListener('keydown', e => { if (!drawer.classList.contains('open'))
        return; if (e.key === 'Escape') {
        e.preventDefault();
        menu(false);
    } if (e.key === 'Tab') {
        const nodes = [...drawer.querySelectorAll('a[href],button')], first = nodes[0], last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    } }, { signal });
    const scroll = () => { header.classList.toggle('scrolled', scrollY > 50); header.classList.toggle('over-content', (root.querySelector('.hero')?.getBoundingClientRect().bottom ?? 0) < 74); toc.classList.toggle('show', scrollY > 650); };
    window.addEventListener('scroll', scroll, { passive: true, signal });
    scroll();
    const links = [...toc.querySelectorAll('a')], observer = new IntersectionObserver(entries => { for (const e of entries)
        if (e.isIntersecting)
            links.forEach(a => { const active = a.hash === '#' + e.target.id; a.classList.toggle('active', active); if (active)
                a.setAttribute('aria-current', 'location');
            else
                a.removeAttribute('aria-current'); }); }, { rootMargin: '-35% 0px -55% 0px' });
    links.forEach(a => { const section = root.querySelector(a.hash); if (section)
        observer.observe(section); });
    root.dataset.tourReady = 'true';
    return () => { clearTimeout(timer); abort.abort(); observer.disconnect(); document.body.style.overflow = previous; delete root.dataset.tourReady; };
})();

(() => {
    const root = document.querySelector('.rental-page');
    if (!root)
        return;
    const controller = new AbortController(), signal = controller.signal, drawer = root.querySelector('#drawer'), backdrop = root.querySelector('#drawerBackdrop'), trigger = root.querySelector('#menuOpen'), header = root.querySelector('.site-header'), previous = document.body.style.overflow;
    let timer;
    function menu(open, restore = true) { clearTimeout(timer); drawer.classList.toggle('open', open); backdrop.classList.toggle('open', open); drawer.inert = !open; drawer.setAttribute('aria-hidden', String(!open)); trigger.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : previous; if (open) {
        const ms = Math.max(...getComputedStyle(drawer).transitionDuration.split(',').map(t => parseFloat(t) * 1000));
        timer = setTimeout(() => drawer.querySelector('#menuClose')?.focus({ preventScroll: true }), ms + 50);
    }
    else if (restore)
        trigger.focus({ preventScroll: true }); }
    trigger.addEventListener('click', () => menu(true), { signal });
    root.querySelector('#menuClose').addEventListener('click', () => menu(false), { signal });
    backdrop.addEventListener('click', () => menu(false), { signal });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu(false, false), { signal }));
    document.addEventListener('keydown', event => { if (!drawer.classList.contains('open'))
        return; if (event.key === 'Escape') {
        event.preventDefault();
        menu(false);
    } if (event.key === 'Tab') {
        const nodes = [...drawer.querySelectorAll('button,a[href]')], first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    } }, { signal });
    const scroll = () => header.classList.toggle('scrolled', scrollY > 50);
    window.addEventListener('scroll', scroll, { passive: true, signal });
    scroll();
    root.addEventListener('click', e => { const a = e.target.closest('[data-select-rental]'); if (!a || !root.querySelector('.rental-inquiry'))
        return; e.preventDefault(); window.dispatchEvent(new CustomEvent('rental-select', { detail: a.dataset.selectRental })); root.querySelector('#contacts')?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth' }); }, { signal });
    root.dataset.rentalReady = 'true';
    return () => { clearTimeout(timer); controller.abort(); document.body.style.overflow = previous; delete root.dataset.rentalReady; };
})();

(() => {
    const root = document.querySelector('.public-page');
    if (!root)
        return;
    const drawer = root.querySelector('#publicDrawer'), backdrop = root.querySelector('#publicBackdrop'), trigger = root.querySelector('#publicMenuOpen'), close = root.querySelector('#publicMenuClose'), controller = new AbortController(), signal = controller.signal, previous = document.body.style.overflow;
    let timer;
    function menu(open, restore = true) { clearTimeout(timer); drawer.classList.toggle('open', open); backdrop.classList.toggle('open', open); drawer.inert = !open; drawer.setAttribute('aria-hidden', String(!open)); trigger.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : previous; if (open)
        timer = setTimeout(() => close.focus(), 250);
    else if (restore)
        trigger.focus(); }
    trigger.addEventListener('click', () => menu(true), { signal });
    close.addEventListener('click', () => menu(false), { signal });
    backdrop.addEventListener('click', () => menu(false), { signal });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu(false, false), { signal }));
    document.addEventListener('keydown', e => { if (drawer.inert)
        return; if (e.key === 'Escape') {
        e.preventDefault();
        menu(false);
    } if (e.key === 'Tab') {
        const nodes = [...drawer.querySelectorAll('a[href],button')], first = nodes[0], last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    } }, { signal });
    const scroll = () => root.querySelector('.public-header')?.classList.toggle('scrolled', scrollY > 40);
    window.addEventListener('scroll', scroll, { signal, passive: true });
    scroll();
    root.dataset.publicReady = 'true';
    return () => { clearTimeout(timer); controller.abort(); document.body.style.overflow = previous; delete root.dataset.publicReady; };
})();

(()=>{
const root=document.querySelector('.ru-aggregator');if(!root)return;
document.dispatchEvent(new Event('ru-home-destroy'));
const abort=new AbortController(),opts={signal:abort.signal},on=(el,event,fn)=>el?.addEventListener(event,fn,opts),q=s=>root.querySelector(s),all=s=>root.querySelectorAll(s);
let frame=0,previousFocus=null,previousOverflow=document.body.style.overflow;
const menu=q('#menuDrawer'),backdrop=q('#menuBackdrop'),modal=q('#bookingModal'),button=q('#menuButton');
function overlay(el,open){el.classList.toggle('open',open);el.inert=!open;el.setAttribute('aria-hidden',String(!open));document.body.style.overflow=menu.classList.contains('open')||modal.classList.contains('open')?'hidden':previousOverflow;if(open){previousFocus=document.activeElement;el.querySelector('button,input,a')?.focus();}else previousFocus?.focus();}
function closeMenu(){overlay(menu,false);backdrop.classList.remove('open');button.setAttribute('aria-expanded','false');}
function openModal(interest=''){closeMenu();overlay(modal,true);if(interest)q('#modalForm textarea').value=interest;}
on(button,'click',()=>{overlay(menu,true);backdrop.classList.add('open');button.setAttribute('aria-expanded','true');});on(q('#drawerClose'),'click',closeMenu);on(backdrop,'click',closeMenu);on(q('#modalClose'),'click',()=>overlay(modal,false));on(modal,'click',e=>{if(e.target===modal)overlay(modal,false);});
all('.js-open-booking').forEach(b=>on(b,'click',()=>openModal()));
all('a').forEach(a=>on(a,'click',e=>{if(a.closest('.menu-drawer'))closeMenu();if(a.classList.contains('social-url-needed')||a.getAttribute('href')==='#contacts'&&(a.classList.contains('tour-card')||a.classList.contains('format-card')||a.classList.contains('guide')||a.classList.contains('city-chip')||a.classList.contains('drawer-city')||a.classList.contains('price-interest'))){e.preventDefault();openModal(a.dataset.interest??a.textContent.trim());}}));
on(document,'keydown',e=>{const active=modal.classList.contains('open')?modal:menu.classList.contains('open')?menu:null;if(e.key==='Escape'){closeMenu();overlay(modal,false);all('.autocomplete-field').forEach(f=>f.classList.remove('open'));}if(e.key==='Tab'&&active){const focusable=[...active.querySelectorAll('a,button,input,select,textarea')].filter(el=>!el.disabled&&el.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
const scroll=()=>q('#siteHeader').classList.toggle('scrolled',scrollY>36);on(window,'scroll',scroll);scroll();
const cities=['Далат','Нячанг','Дананг','Хошимин','Ханой','Хойан','Хюэ','Фукуок','Муйне','Хазянг','Сапа','Ниньбинь','Буонметхуот','Фанранг','Фантхьет','Кантхо','Куинён','Катба','Халонг','Понгня','Кондао','Вунгтау','Плейку','Донгхой','Каобанг','Мокчау'];
const activities=['Эндуро','Мототуры','Хайкинг','Треккинг','Морские приключения','Дайвинг','Снорклинг','Сёрфинг','SUP и каяки','Параплан','Парасейлинг','Экскурсии','Аренда мото','Аренда скутеров','Аренда авто'];
for(const [id,values]of [['city',cities],['activity',activities]]){const input=q('#'+id+'Input'),panel=q('#'+id+'Autocomplete'),field=input.closest('.field');input.setAttribute('aria-label',id==='city'?'Куда едем?':'Что хочется?');const hide=()=>{field.classList.remove('open');input.setAttribute('aria-expanded','false');};const render=()=>{panel.replaceChildren();for(const value of values.filter(v=>v.toLowerCase().includes(input.value.trim().toLowerCase())).slice(0,10)){const b=document.createElement('button');b.type='button';b.textContent=value;b.dataset.value=value;panel.append(b);}field.classList.add('open');input.setAttribute('aria-expanded','true');};on(input,'focus',render);on(input,'click',render);on(input,'input',render);on(panel,'click',e=>{const b=e.target.closest('[data-value]');if(b){input.value=b.dataset.value;hide();}});on(input,'keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();panel.querySelector('button')?.focus();}if(e.key==='Enter'){e.preventDefault();q('#heroSearch').click();}if(e.key==='Escape')hide();});on(document,'click',e=>{if(!field.contains(e.target))hide();});}
on(q('#heroSearch'),'click',e=>{e.preventDefault();const city=q('#cityInput').value.trim(),activity=q('#activityInput').value.trim(),ids={'Далат':'dalat','Нячанг':'nhatrang','Дананг':'danang','Хошимин':'saigon','Ханой':'north-vietnam','Муйне':'muine'},rental=/аренд/i.test(activity),supported=!activity||/эндуро|мототур|аренд/i.test(activity);if((city&&!ids[city])||!supported){openModal([city,activity].filter(Boolean).join(' · '));return;}const params=new URLSearchParams();if(ids[city])params.set('city',ids[city]);location.href=(rental?(/авто/i.test(activity)?'/enduro-vietnam-showcase/ru/rentals/cars':'/enduro-vietnam-showcase/ru/rentals/motorbikes'):'/enduro-vietnam-showcase/ru/all-tours')+(params.size?'?'+params:'');});
all('.rental-filter-row .tab').forEach(tab=>on(tab,'click',()=>{all('.rental-filter-row .tab').forEach(t=>t.classList.toggle('active',t===tab));const choice=tab.textContent.trim();const target=choice==='Авто'?'/enduro-vietnam-showcase/ru/rentals/cars':choice==='Электро'?'/enduro-vietnam-showcase/ru/rentals/motorbikes?q=YADEA':'/enduro-vietnam-showcase/ru/rentals/motorbikes';all('.rental-actions .btn,.rental-hero-copy .btn').forEach(a=>a.href=target);const examples=q('.rental-examples');examples.hidden=choice==='Авто';examples.querySelectorAll('a').forEach(a=>a.hidden=choice==='Электро'&&!a.textContent.includes('YADEA')||choice==='Скутеры'&&a.textContent.includes('YADEA'));if(choice==='Авто')openModal('Аренда автомобиля');}));
all('form[data-home-inquiry]').forEach(form=>{let key=null;on(form,'submit',async e=>{e.preventDefault();const status=form.querySelector('.form-status'),submit=form.querySelector('button[type=submit],button:not([type])');if(submit.disabled)return;key??=crypto.randomUUID();submit.disabled=true;status.textContent='Сохраняем запрос…';try{const data=Object.fromEntries(new FormData(form));const r=await fetch('/api/home-inquiries',{method:'POST',headers:{'content-type':'application/json','idempotency-key':key},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error||'Не удалось сохранить запрос. Повторите позже.');status.textContent='Запрос № '+result.id+' сохранён. Доступность и условия подтверждаются отдельно.';form.querySelectorAll('input,textarea,select').forEach(el=>el.disabled=true);submit.textContent='Запрос сохранён';}catch(error){status.textContent=error.message;submit.disabled=false;}});});
const viewport=q('#tourMarquee');let direction=1,last=performance.now(),pausedUntil=last+1300,drag=null,moved=false,hover=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)');on(viewport,'mouseenter',()=>hover=true);on(viewport,'mouseleave',()=>hover=false);on(viewport,'focusin',()=>hover=true);on(viewport,'focusout',()=>hover=false);on(viewport,'pointerdown',e=>{if(e.pointerType==='touch')return;drag={x:e.clientX,scroll:viewport.scrollLeft};moved=false;});on(window,'pointermove',e=>{if(drag){const delta=e.clientX-drag.x;if(Math.abs(delta)>6)moved=true;if(moved)viewport.scrollLeft=drag.scroll-delta;}});on(window,'pointerup',()=>{drag=null;pausedUntil=performance.now()+2300;});on(viewport,'click',e=>{if(moved){e.preventDefault();moved=false;}});on(viewport,'wheel',()=>pausedUntil=performance.now()+2300);on(viewport,'touchstart',()=>pausedUntil=performance.now()+2300);
function animate(now){if(!reduced.matches&&!hover&&!drag&&now>pausedUntil){const max=viewport.scrollWidth-viewport.clientWidth;if(max>2){viewport.scrollLeft+=direction*.020*Math.min(now-last,40);if(viewport.scrollLeft>=max-1||viewport.scrollLeft<=1){direction*=-1;pausedUntil=now+650;}}}last=now;frame=requestAnimationFrame(animate);}frame=requestAnimationFrame(animate);
on(document,'ru-home-destroy',()=>{abort.abort();cancelAnimationFrame(frame);document.body.style.overflow=previousOverflow;});
})();
