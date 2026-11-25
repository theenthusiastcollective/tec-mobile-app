const $=selector=>document.querySelector(selector);
const icons={home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',events:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m3 0h2m-7 3h2"/>',garage:'<path d="m3 10 9-6 9 6v11H3V10Zm3 11v-9h12v9M7 15h10m-10 3h10"/>',photos:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-5 4 3 4-5 4 5"/>',pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>'};
icons.cruise='<path d="m7 21 3-18m7 18L14 3m-2 15v-3m0-4V8"/>';
icons.perks='<path d="M3 4h9l9 9-8 8-10-10z"/><circle cx="8" cy="8" r="1.2"/>';
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||''}</svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Event snapshot and original flyers from the live TEC hub, November 23, 2026.
const events=[{"id":"evt_5c354a10a219449a955f0926fd7295bd","title":"Cruise to Palm Beach Cars and Coffee","short":"Cruise & Show","isoDate":"2026-12-06","weekday":"SUN","dayName":"Sunday","month":"DEC","day":"06","year":"2026","monthName":"December","date":"Sunday, December 6, 2026","time":"6:45 AM meetup","startLabel":"6:45 AM meetup","image":"assets/palm-beach-december-2026.jpg","location":"Palm Beach Cars & Coffee","address":"5000 T-Rex Avenue, Boca Raton","venue":{"name":"Palm Beach Cars & Coffee","address":"5000 T-Rex Avenue, Boca Raton","time":"8:00AM to Noon","host":"Cars and Coffee Palm Beach","features":[]},"description":"Let's meet in Jupiter, cruise to pick up our friends in West Palm Beach, and take a drive to Boca for the Cars & Coffee event.","stops":[["6:45","AM","Jupiter - Casa Tequila","4177 W Indiantown Road · Arrive before 7:10.  We will depart at 7:15 to head south."],["7:30","AM","West Palm Beach Airport Hilton","150 Australian Avenue, West Palm Beach · Be here for 7:30.  We will give our friends a few minutes and head south to Boca from here."]],"thumbnail":"assets/palm-beach-december-2026-thumb.webp"},{"id":"elliott-museum-2026","title":"Cars & Coffee — Cruise to Stuart","short":"CRUISE + CARS & COFFEE","isoDate":"2026-12-12","weekday":"SAT","dayName":"Saturday","month":"DEC","day":"12","year":"2026","monthName":"December","date":"Saturday, December 12, 2026","time":"6:30 AM meetup · 7:10 AM departure","startLabel":"6:30 AM meetup","image":"assets/elliott-museum-2026.png","location":"Elliott Museum","address":"825 NE Ocean Blvd, Stuart, FL 34996","venue":{"name":"Elliott Museum","address":"825 NE Ocean Blvd, Stuart, FL 34996","time":"Cars & Coffee · 8:00–10:00 AM","host":"Elliott Museum","features":["Free event","Cars & coffee","25-mile US 1 cruise"]},"description":"Meet The Enthusiast Collective at Brooklyn Water Bagel in Jupiter at 6:30 AM. Grab a cup of coffee before our 7:10 AM departure for a casual 25-mile cruise north on US 1 to Elliott Museum in Stuart. Cars & Coffee runs from 8:00 to 10:00 AM. This is a free event.","stops":[["6:30","AM","Brooklyn Water Bagel","201 US 1, Jupiter, FL · Grab a cup of coffee and meet the collective before our 7:10 AM departure."],["7:10","AM","Cruise north to Stuart","Depart together for a casual 25-mile cruise up US 1 to Elliott Museum."],["8:00","AM","Elliott Museum","825 NE Ocean Blvd, Stuart, FL 34996 · Cars & Coffee runs from 8:00 to 10:00 AM. This is a free event."],["10:00","AM","Cars & Coffee concludes","The scheduled gathering ends at 10:00 AM."]],"thumbnail":"assets/elliott-museum-2026-thumb.webp"},{"id":"welcome-2027-new-year-meet","title":"Welcome 2027 — New Year Meet","short":"TEC MEET","isoDate":"2027-01-10","weekday":"SUN","dayName":"Sunday","month":"JAN","day":"10","year":"2027","monthName":"January","date":"Sunday, January 10, 2027","time":"10:00 AM · End time TBC","startLabel":"10:00 AM start","image":"assets/welcome-2027-new-year-meet.png","location":"Brooklyn Water Bagel Company","address":"201 US 1, Jupiter, FL","venue":{"name":"Brooklyn Water Bagel Company","address":"201 US 1, Jupiter, FL","time":"Starts at 10:00 AM · End time to be confirmed","host":"The Enthusiast Collective","features":["TEC-hosted meet","Welcome 2027"]},"description":"Join The Enthusiast Collective for our Welcome 2027 New Year Meet on Sunday, January 10, 2027, starting at 10:00 AM at Brooklyn Water Bagel Company, 201 US 1, Jupiter, Florida. Meet directly at the venue. The end time has not been announced.","stops":[["10:00","AM","Welcome 2027 — New Year Meet","201 US 1, Jupiter, FL · Join the collective directly at Brooklyn Water Bagel Company. No separate cruise departure or pickup stops are listed."]],"thumbnail":"assets/welcome-2027-new-year-meet-thumb.webp"},{"id":"saturday-social-2027","title":"Saturday Social","short":"TEC SOCIAL","isoDate":"2027-01-23","weekday":"SAT","dayName":"Saturday","month":"JAN","day":"23","year":"2027","monthName":"January","date":"Saturday, January 23, 2027","time":"10:00 AM–1:00 PM","startLabel":"10:00 AM start","image":"assets/saturday-social.webp","location":"Prestige Creations by JA","address":"15837 Mercantile Ct, Unit A, Jupiter, FL 33478","venue":{"name":"Prestige Creations by JA","address":"15837 Mercantile Ct, Unit A, Jupiter, FL 33478","time":"10:00 AM–1:00 PM","host":"Prestige Creations by JA","features":["All makes & models","Product demonstrations","Tour the shop","Salty Paws coffee","Host refreshments"]},"description":"Presented by The Enthusiast Collective and hosted by Prestige Creations by JA. All makes and models are welcome.","stops":[["10:00","AM","Saturday Social begins","15837 Mercantile Ct, Unit A, Jupiter, FL 33478 · Join directly at Prestige Creations by JA."],["During","EVENT","Coffee, cars & the shop","Product demonstrations, a shop tour, coffee from Salty Paws, and refreshments from your host. Individual activity times are not listed."],["1:00","PM","Saturday Social concludes","No separate cruise meetup or pickup stops have been announced."]],"thumbnail":"assets/saturday-social-thumb.webp"}];
const initialVehicles=[{id:'mach',title:'Mustang Mach 1',year:'2022 FORD',image:'assets/tec-splash-06.webp',description:'Eruption Green. A garage worth getting up early for.',tags:'SAMPLE VEHICLE'},{id:'supra',title:'GR Supra',year:'TOYOTA',image:'assets/tec-splash-05.webp',description:'A different build. The same shared passion.',tags:'SAMPLE VEHICLE'}];
const memberGarages=[{...initialVehicles[0],id:'sample-alex',owner:'Alex'},{...initialVehicles[1],id:'sample-morgan',owner:'Morgan'},{id:'sample-jordan',owner:'Jordan',title:'Mercedes-AMG',image:'assets/tec-splash-10.webp',description:'A sample member garage, with room for the build details and photo collection.'},{id:'sample-sam',owner:'Sam',title:'Mustang Cobra',image:'assets/tec-splash-01.webp',description:'A sample garage from the collective. Every build has a story.'}];
// The offline preview opens the same sample member as the approved design.
const previewMember = {firstName: 'Todd'};
let vehicles=[...initialVehicles],photos=['assets/tec-splash-10.webp','assets/tec-splash-01.webp','assets/tec-splash-05.webp','assets/tec-splash-06.webp','assets/collective-cars.webp'];
let view='home',filter='all',toastTimer;
let rsvps={};try{rsvps=JSON.parse(localStorage.getItem('tec-design-rsvp')||'{}')}catch{}
for(const [oldId,id] of Object.entries({pb:'evt_5c354a10a219449a955f0926fd7295bd',stuart:'elliott-museum-2026',social:'saturday-social-2027'})){if(rsvps[oldId]&&!rsvps[id])rsvps[id]=rsvps[oldId]}
function previewLabel(){return '<p class="preview-label">DESIGN PREVIEW · SAMPLE ACCOUNT</p>'}
function nav(){const labels={home:'Home',events:'Events',cruise:'Cruise',perks:'Perks',garage:'Garage',photos:'Photos'};$('.tabbar').innerHTML=Object.entries(labels).map(([id,label])=>`<button class="tab" data-nav="${id}" ${view===id?'aria-current="page"':''}>${icon(id)}<span>${label}</span></button>`).join('')}
function toast(message){const node=$('#toast');node.textContent=message;node.classList.add('toast-show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('toast-show'),4500)}
function eventTicket(e,compact=false,index=0){
  const poster=`<button class="ticket-flyer" data-flyer="${e.id}" aria-label="View flyer: ${esc(e.title)}"><img src="${e.thumbnail}" alt="${esc(e.title)} — official event flyer" ${compact&&index===0?'fetchpriority="high"':'loading="lazy"'}></button>`;
  return `<article class="event-ticket ${compact?'event-hero event-ticket-compact':'event-card'}" aria-label="${esc(e.title)}">${compact?'':`<img class="card-flyer-background" src="${esc(e.thumbnail)}" alt="" loading="lazy">`}<div class="ticket-stub">${compact?poster:''}<time datetime="${e.isoDate}" class="ticket-date"><span>${e.weekday}</span><b>${e.day}</b><span>${e.month}</span><small>${e.year}</small></time></div><div class="ticket-body"><p class="ticket-type">${esc(e.short)}</p><${compact?'h2':'h3'}>${esc(e.title)}</${compact?'h2':'h3'}><p class="ticket-time">${esc(compact?e.startLabel:e.time)}</p><p class="ticket-venue">${esc(e.location)}</p><p class="ticket-address">${esc(e.address)}</p><div class="ticket-footer">${rsvps[e.id]?`<span class="saved-status">${esc(rsvps[e.id])} · Preview RSVP</span>`:''}<button class="action" data-event="${e.id}">View event</button></div></div></article>`
}
function hero(e,index){return eventTicket(e,true,index)}
function buildTile(v){return `<button class="build-tile" data-member-garage="${v.id}"><img src="${v.image}" alt="${esc(v.title)}" loading="lazy"><span class="build-caption"><b>${esc(v.owner)}’s garage</b><small>${esc(v.title)} · SAMPLE MEMBER</small></span></button>`}
function personalGarage() {
  const own = vehicles.filter(vehicle => vehicle.personal);
  const heading = '<div class="section-head garage-section-heading"><h2>My Garage</h2></div>';
  if (!own.length) return heading + '<button class="action" data-action="add-vehicle">Create Garage</button>';
  return heading + '<div class="personal-vehicles">' + own.map(vehicle =>
    `<button class="personal-vehicle" data-vehicle="${esc(vehicle.id)}">
      ${vehicle.image ? `<img src="${esc(vehicle.image)}" alt="" loading="lazy">` : icon('garage')}
      <span>${esc(vehicle.title)}</span></button>`).join('') + '</div>';
}
function home(){return `<section class="page">${previewLabel()}<p class="greeting">Welcome, ${esc(previewMember.firstName)}</p><h2 class="events-glance">Events at a Glance</h2><div class="event-rail" role="region" aria-label="Upcoming events" aria-describedby="event-swipe-hint" tabindex="0">${events.map(hero).join('')}</div><p class="rail-hint event-rail-hint" id="event-swipe-hint">Swipe to explore upcoming events</p>${personalGarage()}<div class="section-head garage-section-heading"><h2>Member Garages</h2><button class="small-link" data-nav="garage">Explore</button></div><p class="rail-hint" id="garage-swipe-hint">Swipe to explore member garages</p><div class="build-row" role="region" aria-label="Member garages" aria-describedby="garage-swipe-hint" tabindex="0">${memberGarages.map(buildTile).join('')}</div><p class="app-motto"><span>MEET.</span> <span>CRUISE.</span> <span>CONNECT.</span></p></section>`}
function eventCard(e){return eventTicket(e)}
function eventPage(){const list=filter==='plans'?events.filter(e=>rsvps[e.id]==='Going'||rsvps[e.id]==='Interested'):events;return `<section class="page">${previewLabel()}<h1 class="page-title">Good days ahead.</h1><p class="page-subtitle">Find your next reason to get out.</p><div class="segmented" aria-label="Filter events"><button data-filter="all" aria-pressed="${filter==='all'}">Upcoming events</button><button data-filter="plans" aria-pressed="${filter==='plans'}">My plans</button></div>${list.length?list.map(e=>`<section class="event-day"><h2 class="event-day-heading"><span>${e.dayName}</span><time datetime="${e.isoDate}">${e.monthName} ${Number(e.day)}</time></h2>${eventCard(e)}</section>`).join(''):'<div class="empty-state">Your next plan starts here.<br>Open an event and choose Going or Interested.</div>'}</section>`}
function vehicleImage(vehicle) {
  return vehicle.image ? `<img src="${esc(vehicle.image)}" alt="${esc(vehicle.title)}">` : `<div class="garage-placeholder">${icon('garage')}</div>`;
}
function garage(){return `<section class="page">${previewLabel()}<h1 class="page-title">Your garage.</h1><p class="page-subtitle">Every build has a story.</p>${vehicles.map(v=>`<article class="vehicle-card"><div class="vehicle-cover">${vehicleImage(v)}<span class="vehicle-tag">${v.tags||'PREVIEW VEHICLE'}</span></div><div class="vehicle-copy"><p class="eyebrow">${esc(v.year)}</p><h2>${esc(v.title)}</h2><p>${esc(v.description)}</p><div class="vehicle-footer"><span>ONE SHARED PASSION</span><button class="action secondary" data-vehicle="${v.id}">View</button></div></div></article>`).join('')}<button class="action full" data-action="add-vehicle">Add vehicle</button><p class="page-subtitle" style="font-size:11px;margin-top:13px;text-align:center">Sample garage. Your real hub garage is unchanged.</p></section>`}
function photoPage(){return `<section class="page">${previewLabel()}<h1 class="page-title">Member &amp; Event Gallery</h1><p class="page-subtitle">The cars. The people. The moments.</p><div class="upload-row"><small>ALL PHOTOS · PREVIEW</small><button class="action secondary" data-action="upload-photos">Add photos</button></div><input type="file" id="photo-input" accept="image/*" multiple hidden><div class="gallery-grid">${photos.map((src,i)=>`<button class="gallery-button" data-photo="${i}" aria-label="Open club photo ${i+1}"><img src="${src}" alt="A TEC club car photo" loading="lazy"></button>`).join('')}</div></section>`}
function cruisePage() {
  return '<section class="page"><h1 class="page-title">Cruise</h1><p class="page-subtitle">Coming Soon</p></section>';
}
let publishedPerks = [];
let perksRequest = 0;

function perksPage() {
  return '<section class="page"><h1 class="page-title">Member Perks</h1><div class="perk-list" id="perk-list" aria-live="polite">Loading offers…</div></section>';
}
async function loadPerks() {
  const list = $('#perk-list');
  if (!list) return;
  const request = ++perksRequest;
  try {
    const response = await fetch('/api/perks', {cache:'no-store', credentials:'omit'});
    if (!response.ok) throw new Error('Offer feed unavailable');
    const data = await response.json();
    if (!Array.isArray(data.perks)) throw new Error('Invalid offer feed');
    if (request !== perksRequest || list !== $('#perk-list')) return;
    publishedPerks = data.perks.filter(p => p && p.active && typeof p.business === 'string' && typeof p.title === 'string');
    list.innerHTML = publishedPerks.length ? publishedPerks.map(p =>
      `<button class="event-venue-details perk-button" data-perk="${esc(p.id)}" aria-haspopup="dialog"><strong>${esc(p.business)}</strong><span>${esc(p.title)}</span></button>`
    ).join('') : 'No published offers at the moment.';
  } catch {
    if (request === perksRequest && list === $('#perk-list')) {
      list.innerHTML = '<p>Offers could not load. Check your connection and try again.</p><button class="action" data-action="retry-perks">Try again</button>';
    }
  }
}
function showPerk(id) {
  const p = publishedPerks.find(offer => offer.id === id);
  if (!p) return;
  const photo = /^\/api\/media\/[A-Za-z0-9_-]+$/.test(p.imageUrl || '') ?
    `<img class="perk-photo" src="${esc(p.imageUrl)}" alt="${esc(p.business)} offer">` : '';
  let website = '';
  try {
    const url = new URL(p.website);
    if (url.protocol === 'https:' && !url.username && !url.password) website = `<a class="action secondary" href="${esc(url.href)}">Visit website</a>`;
  } catch {}
  sheet(`<div class="media-dialog-tools">${closeButton()}</div><div class="sheet-body perk-details"><p class="eyebrow">${esc(p.business)}</p><h2 id="sheet-title">${esc(p.title)}</h2>${photo}<p class="perk-terms">${esc(p.description)}</p>${website}</div>`, true);
}
function render(){nav();$('#app-main').innerHTML=({home,events:eventPage,cruise:cruisePage,perks:perksPage,garage,photos:photoPage})[view]();$('#app-scroll').scrollTop=0;if(view==='perks')loadPerks()}
function go(next){if(!['home','events','cruise','perks','garage','photos'].includes(next))return;view=next;render()}
function closeButton(){return '<button class="close" data-action="close-sheet">Close</button>'}
let returnToEvent = null;
function sheet(content, centered = false) {
  const dialog = $('#sheet');
  dialog.classList.toggle('media-dialog', centered);
  $('#sheet-content').innerHTML = content;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  if (centered) dialog.querySelector('.close')?.focus({preventScroll:true});
}
$('#sheet').addEventListener('close', () => {
  if (!returnToEvent) return;
  const id = returnToEvent;
  returnToEvent = null;
  eventSheet(id);
});
function eventSheet(id){const e=events.find(e=>e.id===id);if(!e)return;sheet(`<div class="media-dialog-tools">${closeButton()}</div><button class="detail-flyer" data-enlarge-event="${e.id}" aria-label="Enlarge full flyer"><img src="${e.image}" alt="${esc(e.title)}"><span>Tap flyer to enlarge</span></button><div class="sheet-body"><p class="eyebrow">${e.short} · EVENT PREVIEW</p><h2 id="sheet-title">${e.title}</h2><div class="detail-meta">${icon('events')}<span><span class="detail-date">${e.date}</span><span class="detail-time">${e.time} · Eastern</span></span></div><p>${esc(e.description)}</p><div class="event-venue-details"><strong>${esc(e.location)}</strong><p>${esc(e.address)}</p><p>${esc(e.venue.time)}</p></div><h3>Your plan</h3><div class="rsvp-options" aria-label="Your preview RSVP">${['Going','Interested','Can’t make it'].map(s=>`<button data-rsvp="${esc(s)}" data-id="${e.id}" aria-pressed="${rsvps[e.id]===s}">${s}</button>`).join('')}</div><p style="font-size:11px">Preview RSVPs save only on this device.</p><h3>The day at a glance</h3><ol class="itinerary">${e.stops.map(s=>`<li><time>${s[0]}<small>${s[1]}</small></time><div><strong>${s[2]}</strong><p>${s[3]}</p></div></li>`).join('')}</ol><button class="action secondary full" data-action="close-sheet">Back to the collective</button></div>`,true)}
function flyerSheet(id){const e=events.find(e=>e.id===id);if(!e)return;sheet(`<div class="media-dialog-tools">${closeButton()}</div><div class="lightbox event-flyer-lightbox"><h2 id="sheet-title">${esc(e.title)}</h2><img src="${e.image}" alt="${esc(e.title)} — full event flyer"></div>`,true)}
function vehicleSheet(id,member=false){const v=(member?memberGarages:vehicles).find(v=>v.id===id);if(!v)return;sheet(`<div class="sheet-cover">${vehicleImage(v)}${closeButton()}</div><div class="sheet-body"><p class="eyebrow">${member?esc(v.owner)+' · SAMPLE MEMBER GARAGE':'GARAGE PREVIEW'}</p><h2 id="sheet-title">${esc(v.title)}</h2><p>${esc(v.description)}</p><h3>The build</h3><p>A space for the details, the story, and the photos that make every garage its own.</p><button class="action secondary full" data-action="close-sheet">Back to garage</button></div>`)}
function about(){sheet(`<div class="about-sheet">${closeButton()}<img src="assets/tec-logo.jpg" alt="The Enthusiast Collective"><p class="eyebrow">APP DESIGN PREVIEW</p><h2 id="sheet-title">About TEC.</h2><p>This is a private, interactive design study for the TEC member app. Explore Events, Garage, and Photos to try the layout.</p><p>Events and cars illustrate the design. RSVPs save only on this device. Added photos stay in this preview.</p><p>South Florida’s automotive enthusiast social network.</p></div>`)}
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button){
  const card=event.target.closest('.event-card');
  if(card)eventSheet(card.querySelector('[data-event]').dataset.event);
  return;
}if(button.dataset.nav)go(button.dataset.nav);else if(button.dataset.perk)showPerk(button.dataset.perk);else if(button.dataset.action==='retry-perks')loadPerks();else if(button.dataset.event)eventSheet(button.dataset.event);else if(button.dataset.enlargeEvent){returnToEvent=button.dataset.enlargeEvent;flyerSheet(returnToEvent)}else if(button.dataset.flyer)flyerSheet(button.dataset.flyer);else if(button.dataset.memberGarage)vehicleSheet(button.dataset.memberGarage,true);else if(button.dataset.vehicle)vehicleSheet(button.dataset.vehicle);else if(button.dataset.filter){filter=button.dataset.filter;render()}else if(button.dataset.rsvp){rsvps[button.dataset.id]=button.dataset.rsvp;try{localStorage.setItem('tec-design-rsvp',JSON.stringify(rsvps))}catch{}const id=button.dataset.id;document.querySelectorAll('[data-rsvp]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.rsvp===rsvps[id])));render();toast('Preview RSVP saved on this device.')}else if(button.dataset.photo!==undefined){const src=photos[Number(button.dataset.photo)];if(src)sheet(`<div class="media-dialog-tools">${closeButton()}</div><div class="lightbox"><h2 id="sheet-title" hidden>TEC club photo</h2><img src="${src}" alt="TEC club photo enlarged"><p>MEET. CRUISE. CONNECT.</p></div>`,true)}else{switch(button.dataset.action){case 'close-sheet':$('#sheet').close();break;case 'about':about();break;case 'updates':sheet(`<div class="about-sheet">${closeButton()}<p class="eyebrow">YOUR COLLECTIVE</p><h2 id="sheet-title">Stay in the loop.</h2><p>Event reminders and club updates would live here.</p><p>This screen is a design preview. Notifications aren’t enabled.</p><button class="action full" data-action="close-sheet">Got it</button></div>`);break;case 'upload-photos':$('#photo-input').click();break;case 'add-vehicle':sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">Add vehicle.</h2><form id="vehicle-form"><label>Year & make<input name="year" required maxlength="50" placeholder="2017 Ford"></label><label>Model<input name="model" required maxlength="60" placeholder="Mustang GT"></label><label>Vehicle photo<input name="picture" type="file" accept="image/*"></label><label>The story<input name="story" maxlength="180" placeholder="What makes it yours?"></label><p>This adds a sample card in this preview. Your hub account stays unchanged.</p><button class="action full" type="submit">Add vehicle</button></form></div>`);break}}});
// Keep the member's preview uploads on this device, including the original image files.
const storage = new Promise((resolve, reject) => {
  const request = indexedDB.open('tec-member-preview', 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore('vehicles', {autoIncrement:true});
    request.result.createObjectStore('photos', {autoIncrement:true});
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function readSaved(store) {
  const db = await storage;
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveLocal(store, items) {
  const db = await storage;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
    for (const item of items) tx.objectStore(store).add(item);
  });
}
function personalVehicle(record) {
  return {...record, personal:true, image:record.picture ? URL.createObjectURL(record.picture) : '', tags:'ADDED IN PREVIEW'};
}
const restored = Promise.all([readSaved('vehicles'), readSaved('photos')]).then(([builds, images]) => {
  vehicles.push(...builds.map(personalVehicle));
  photos.unshift(...images.reverse().map(file => URL.createObjectURL(file)));
  if ((builds.length || images.length) && !$('#member-app').hidden) render();
}).catch(() => {});
document.addEventListener('submit', async event => {
  if (event.target.id !== 'vehicle-form') return;
  event.preventDefault();
  const form = event.target;
  const submit = form.querySelector('[type=submit]');
  if (submit.disabled) return;
  submit.disabled = true;
  const record = {id:crypto.randomUUID(), year:form.elements.year.value.trim(), title:form.elements.model.value.trim(),
    description:form.elements.story.value.trim() || 'One shared passion.', picture:form.elements.picture.files[0] || null};
  await restored;
  let message = 'Vehicle added to your garage.';
  try { await saveLocal('vehicles', [record]); } catch { message = 'Vehicle added for this session. Device storage is unavailable.'; }
  vehicles.push(personalVehicle(record));
  $('#sheet').close();
  go('garage');
  toast(message);
});
document.addEventListener('change', async event => {
  if (event.target.id !== 'photo-input') return;
  const files = [...event.target.files].filter(file => file.type.startsWith('image/'));
  if (!files.length) return;
  await restored;
  let message = `${files.length} ${files.length === 1 ? 'photo' : 'photos'} saved on this device.`;
  try { await saveLocal('photos', [...files].reverse()); } catch { message = 'Photos added for this session. Device storage is unavailable.'; }
  photos.unshift(...files.map(file => URL.createObjectURL(file)));
  if (view === 'photos') render();
  toast(message);
});
$('#sheet').addEventListener('click',event=>{if(event.target===$('#sheet'))$('#sheet').close()});
function showLaunchScreen(focus=false){
  const entered=window.location.hash==='#app';
  $('#tec-splash').hidden=entered;
  $('#member-app').hidden=!entered;
  if(entered){go('home');if(focus)$('#app-main').focus({preventScroll:true})}
  else if(focus)$('#register-tec').focus({preventScroll:true});
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',()=>showLaunchScreen(true));
showLaunchScreen();
