const $=selector=>document.querySelector(selector);
const icons={home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',events:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m3 0h2m-7 3h2"/>',garage:'<path d="m3 10 9-6 9 6v11H3V10Zm3 11v-9h12v9M7 15h10m-10 3h10"/>',photos:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-5 4 3 4-5 4 5"/>',pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>'};
icons.cruise='<path d="m7 21 3-18m7 18L14 3m-2 15v-3m0-4V8"/>';
icons.perks='<path d="M3 4h9l9 9-8 8-10-10z"/><circle cx="8" cy="8" r="1.2"/>';
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||''}</svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function nav(){const labels={home:'Home',events:'Events',cruise:'Cruise',perks:'Perks',garage:'Garage',photos:'Photos'};$('.tabbar').innerHTML=Object.entries(labels).map(([id,label])=>`<button class="tab" data-nav="${id}" ${view===id?'aria-current="page"':''}>${icon(id)}<span>${label}</span></button>`).join('')}
function toast(message){const node=$('#toast');node.textContent=message;node.classList.add('toast-show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('toast-show'),4500)}
function eventTicket(e,compact=false,index=0){
  const poster=!e.thumbnail ? '' : `<button class="ticket-flyer" data-flyer="${esc(e.id)}" aria-label="View flyer: ${esc(e.title)}"><img src="${esc(e.thumbnail)}" alt="${esc(e.title)} — official event flyer" ${compact&&index===0?'fetchpriority="high"':'loading="lazy"'}></button>`;
  return `<article class="event-ticket ${compact?'event-hero event-ticket-compact':'event-card'}" aria-label="${esc(e.title)}">${compact||!e.thumbnail?'':`<img class="card-flyer-background" src="${esc(e.thumbnail)}" alt="" loading="lazy">`}<div class="ticket-stub">${compact?poster:''}<time datetime="${e.isoDate}" class="ticket-date"><span>${e.weekday}</span><b>${e.day}</b><span>${e.month}</span><small>${e.year}</small></time></div><div class="ticket-body"><p class="ticket-type">${esc(e.short)}</p><${compact?'h2':'h3'}>${esc(e.title)}</${compact?'h2':'h3'}><p class="ticket-time">${esc(compact?e.startLabel:e.time)}</p><p class="ticket-venue">${esc(e.location)}</p><p class="ticket-address">${esc(e.address)}</p><div class="ticket-footer">${rsvps[e.id]?`<span class="saved-status">${esc(rsvps[e.id])} ${isMemberApp ? "· RSVP" : "· Preview RSVP"}</span>`:''}<button class="action" data-event="${esc(e.id)}">View event</button></div></div></article>`
}
function hero(e,index){return eventTicket(e,true,index)}
function buildTile(v){return `<button class="build-tile" data-member-garage="${esc(v.id)}">${v.image ? `<img class="build-photo" src="${esc(v.image)}" alt="${esc(v.title)}" loading="lazy">` : '<span class="build-photo build-placeholder">No Pictures Yet</span>'}<span class="build-caption"><b>${esc(v.owner)}’s Garage</b><small>${esc(v.title)}${isMemberApp ? "" : " · SAMPLE MEMBER"}</small></span></button>`}
function personalGarage() {
  const own = vehicles.filter(vehicle => vehicle.personal);
  const heading = '<div class="section-head garage-section-heading"><h2>My Garage</h2></div>';
  if (!own.length) return heading + '<button class="action" data-action="add-vehicle">Create Garage</button>';
  return heading + '<div class="personal-vehicles">' + own.map(vehicle =>
    `<button class="personal-vehicle" data-vehicle="${esc(vehicle.id)}">
      ${vehicle.image ? `<img src="${esc(vehicle.image)}" alt="" loading="lazy">` : icon('garage')}
      <span>${esc(vehicle.title)}</span></button>`).join('') + '</div>';
}
function home(){return `<section class="page">${previewLabel()}<p class="greeting">Welcome, ${esc(firstName())}</p><h2 class="events-glance">Events at a Glance</h2><div class="event-rail" role="region" aria-label="Upcoming events" aria-describedby="event-swipe-hint" tabindex="0">${events.map(hero).join('')}</div><p class="rail-hint event-rail-hint" id="event-swipe-hint">Swipe to explore upcoming events</p>${personalGarage()}<div class="section-head garage-section-heading"><h2>Member Garages</h2><button class="small-link" data-nav="garage">Explore</button></div><p class="rail-hint" id="garage-swipe-hint">Swipe to explore member garages</p><div class="build-row" role="region" aria-label="Member garages" aria-describedby="garage-swipe-hint" tabindex="0">${memberGarages.map(buildTile).join('')}</div></section>`}
function eventCard(e){return eventTicket(e)}
function eventPage(){const list=filter==='plans'?events.filter(e=>rsvps[e.id]==='Going'||rsvps[e.id]==='Interested'):events;return `<section class="page">${previewLabel()}<h1 class="page-title">Good Times Ahead</h1><div class="segmented" aria-label="Filter events"><button data-filter="all" aria-pressed="${filter==='all'}">Upcoming events</button><button data-filter="plans" aria-pressed="${filter==='plans'}">My plans</button></div>${list.length?list.map(e=>`<section class="event-day"><h2 class="event-day-heading"><span>${e.dayName}</span><time datetime="${e.isoDate}">${e.monthName} ${Number(e.day)}</time></h2>${eventCard(e)}</section>`).join(''):'<div class="empty-state">Your next plan starts here.<br>Open an event and choose Going or Interested.</div>'}</section>`}
function vehicleImage(vehicle) {
  return vehicle.image ? `<img src="${esc(vehicle.image)}" alt="${esc(vehicle.title)}">` : `<div class="garage-placeholder">${icon('garage')}</div>`;
}
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
function closeButton(){return '<button class="close" data-action="close-sheet">Close</button>'}
function sheet(content, centered = false) {
  const dialog = $('#sheet');
  dialog.classList.toggle('media-dialog', centered);
  $('#sheet-content').innerHTML = content;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  if (centered) dialog.querySelector('.close')?.focus({preventScroll:true});
}
