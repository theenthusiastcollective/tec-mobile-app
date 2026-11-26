'use strict';
const isMemberApp = true;
const statusLabels = {going:'Going', interested:'Interested', declined:'Can’t make it'};
const previewLabel = () => '';
const firstName = () => member.name.trim().split(/\s+/)[0];
let member = null, vehicles = [], memberGarages = [], events = [], photos = [];
let rsvps = {}, view = 'home', filter = 'all', toastTimer, revision = 0, modalRequest = 0;
let dataError = '', loading = false;
const splash = $('#tec-splash'), shell = $('#member-app'), dialog = $('#sheet');
let announcementRequest = 0;
let announcementOpening = 0;
const bell = $('[data-action="updates"]');

function announcementKey(memberId) {
  return 'tec-announcements-read:' + memberId;
}

function readAnnouncements(memberId) {
  try {
    const ids = JSON.parse(localStorage.getItem(announcementKey(memberId)) || '[]');
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function setBellUnread(unread) {
  bell.setAttribute('aria-label', unread ? 'Notifications, unread updates' : 'Notifications');
  bell.style.color = unread ? '#fff' : '';
  bell.style.filter = unread ? 'drop-shadow(0 0 4px #ff3b46)' : '';
  bell.style.position = 'relative';
  bell.querySelector('.notification-dot')?.remove();
  if (!unread) return;
  const dot = document.createElement('span');
  dot.className = 'notification-dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.style.cssText = 'position:absolute;top:7px;right:7px;width:7px;height:7px;border-radius:50%;background:#ff3b46;box-shadow:0 0 5px #ff3b46;pointer-events:none';
  bell.append(dot);
}

async function refreshAnnouncements({open = false} = {}) {
  const memberId = member?.id;
  if (!memberId || (!open && announcementOpening)) return;
  const token = open ? ++modalRequest : modalRequest;
  const requestId = ++announcementRequest;
  if (open) announcementOpening = requestId;
  try {
    const {announcements} = await request('/api/announcements');
    if (requestId !== announcementRequest || member?.id !== memberId) return;
    const read = readAnnouncements(memberId);
    const unread = announcements.filter(item => !read.has(item.id));
    setBellUnread(unread.length > 0);
    if (!open || modalRequest !== token) return;
    const history = announcements.filter(item => read.has(item.id));
    const items = entries => entries.map(item =>
      `<article><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p></article>`).join('');
    sheet(`<div class="sheet-body">${closeButton()}<h2 id="sheet-title">Notifications</h2>
      ${unread.length ? items(unread) : '<p>No unread notifications.</p>'}
      <details><summary>View old notifications</summary>
        ${history.length ? items(history) : '<p>No older notifications.</p>'}
      </details></div>`, true);
    const seen = [...new Set([...announcements.map(item => item.id), ...read])].slice(0, 250);
    try { localStorage.setItem(announcementKey(memberId), JSON.stringify(seen)); }
    catch { return; }
    setBellUnread(false);
  } catch (error) {
    if (open && modalRequest === token && member?.id === memberId) toast(error.message);
  } finally {
    if (announcementOpening === requestId) announcementOpening = 0;
  }
}

const errorLine = '<p role="alert" class="form-error"></p>';
const clubImage = path => /^\/(?:assets\/[a-zA-Z0-9_.%/-]+|api\/media\/[A-Za-z0-9_-]+)$/.test(path || '') && !path.includes('..') ? path : '';
const pathFor = id => '/api/events/' + encodeURIComponent(id);
const selected = (a,b) => a === b ? ' selected' : '';
function asVehicle(row, owner, personal) {
  return {...row, owner, personal, title:[row.year,row.make,row.model].filter(Boolean).join(' '), image:clubImage(row.imageUrl)};
}
function asEvent(row) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return null;
  const date = new Date(row.date + 'T12:00:00Z');
  if (Number.isNaN(+date)) return null;
  const format = options => date.toLocaleDateString('en-US',{...options,timeZone:'UTC'});
  return {...row,isoDate:row.date,weekday:format({weekday:'short'}),dayName:format({weekday:'long'}),
    day:row.date.slice(8),month:format({month:'short'}),monthName:format({month:'long'}),year:row.date.slice(0,4),
    dateLabel:format({dateStyle:'full'}),thumbnail:clubImage(row.imageUrl),short:row.type,startLabel:row.time,
    location:row.venue?.name || row.city,address:row.venue?.address || '',stops:row.stops || []};
}
async function request(path, method='GET', body) {
  const options = {method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
  if (method !== 'GET') options.headers['x-tec-request']='1';
  if (body instanceof FormData) options.body=body;
  else if (body !== undefined) {
    options.headers['Content-Type']='application/json';
    options.body=JSON.stringify(body);
  }
  const response=await fetch(path,options);
  const data=await response.json().catch(()=>null);
  if (!response.ok || !data) {
    if (response.status===401 && member) resetSession('Please sign in again.');
    throw new Error(data?.error || 'TEC could not complete the request. Please try again.');
  }
  return data;
}
const chatBubble = document.createElement('button');
chatBubble.type = 'button';
chatBubble.className = 'chat-bubble';
chatBubble.setAttribute('aria-label', 'TEC member chat');
chatBubble.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h11a2 2 0 0 1 2 2v8"/><path d="M5 7h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5l-5 3v-3H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="7" cy="12.5" r=".8"/><circle cx="10.5" cy="12.5" r=".8"/><circle cx="14" cy="12.5" r=".8"/></svg><span class="chat-unread" hidden></span>';
shell.append(chatBubble);

let chatDrag = null, chatDragged = false, chatRequest = 0;
let chatPosition = {side:'right',offset:0};
try {
  const saved = JSON.parse(localStorage.getItem('tec-chat-position'));
  if (saved && ['left','right'].includes(saved.side) && Number.isFinite(saved.offset)) chatPosition = saved;
} catch {}

function chatBounds() {
  const nav = shell.querySelector('.tabbar');
  const navTop = nav?.getBoundingClientRect().top || innerHeight - 64;
  return {left:9,right:Math.max(9,innerWidth-chatBubble.offsetWidth-9),top:10,
    bottom:Math.max(10,navTop-chatBubble.offsetHeight-10)};
}
function moveChatBubble(x,y) {
  const b=chatBounds();
  chatBubble.style.left=Math.max(b.left,Math.min(x,b.right))+'px';
  chatBubble.style.top=Math.max(b.top,Math.min(y,b.bottom))+'px';
  chatBubble.style.right='auto';
  chatBubble.style.bottom='auto';
}
function placeChatBubble() {
  if (!member || shell.hidden) return;
  const b=chatBounds();
  moveChatBubble(chatPosition.side==='left'?b.left:b.right,b.bottom-chatPosition.offset);
}
window.addEventListener('resize',placeChatBubble);
chatBubble.addEventListener('pointerdown',event=>{
  if (!event.isPrimary || event.button!==0) return;
  chatDragged=false;
  const box=chatBubble.getBoundingClientRect();
  chatDrag={pointer:event.pointerId,x:event.clientX,y:event.clientY,left:box.left,top:box.top};
  chatBubble.setPointerCapture(event.pointerId);
});
chatBubble.addEventListener('pointermove',event=>{
  if (chatDrag?.pointer!==event.pointerId) return;
  const x=event.clientX-chatDrag.x,y=event.clientY-chatDrag.y;
  if (!chatDragged && Math.hypot(x,y)<6) return;
  chatDragged=true;
  moveChatBubble(chatDrag.left+x,chatDrag.top+y);
});
function finishChatDrag(event) {
  if (chatDrag?.pointer!==event.pointerId) return;
  chatDrag=null;
  if(!chatDragged)return;
  const box=chatBubble.getBoundingClientRect(), bounds=chatBounds();
  chatPosition={side:box.left+box.width/2<innerWidth/2?'left':'right',offset:Math.max(0,bounds.bottom-box.top)};
  try { localStorage.setItem('tec-chat-position',JSON.stringify(chatPosition)); } catch {}
  placeChatBubble();
}
chatBubble.addEventListener('pointerup',finishChatDrag);
chatBubble.addEventListener('pointercancel',finishChatDrag);
chatBubble.addEventListener('click',event=>{
  if (chatDragged && event.detail!==0){chatDragged=false;return;}
  if(!member)return;
  sheet(`<div class="form-sheet chat-sheet">${closeButton()}<h2 id="sheet-title">TEC member chat</h2>
    <div class="chat-thread" role="log" aria-label="Chat messages"></div>
    <p class="chat-status" role="status">Loading messages…</p>
    <form class="chat-composer" data-form="chat-message">
    <textarea aria-label="Message" placeholder="Write a message…" name="message" maxlength="1000" rows="1" required disabled></textarea>
    <button class="action" disabled>Send</button>${errorLine}</form></div>`,true);
  void refreshChat();
});
function chatRead(key) {
  try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
}
function chatUnread(show) {
  chatBubble.querySelector('.chat-unread').hidden=!show;
  chatBubble.setAttribute('aria-label',show?'TEC member chat, unread messages':'TEC member chat');
}
async function refreshChat() {
  if (!member || document.hidden) return;
  const owner=member.id, requestId=++chatRequest;
  try {
    const {messages,paused}=await request('/api/chat');
    if (requestId!==chatRequest || member?.id!==owner) return;
    const panel=dialog.open && dialog.querySelector('.chat-sheet');
    const key='tec-chat-read:'+owner, lastRead=chatRead(key);
    if(!panel){
      chatUnread(messages.some(message=>message.id>lastRead && message.memberId!==owner));
      return;
    }
    const thread=panel.querySelector('.chat-thread');
    const atBottom=thread.scrollHeight-thread.scrollTop-thread.clientHeight<24;
    const display=[...messages].reverse().map(message=>{
      const own=message.memberId===owner;
      const stamp=new Date(message.createdAt);
      const time=stamp.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
      return `<article class="chat-message ${own?'chat-message-own':'chat-message-other'}">
        ${own?'':`<strong class="chat-sender">${esc(message.name)}</strong>`}
        <div class="chat-text"><p>${esc(message.body)}</p>
          <time datetime="${esc(stamp.toISOString())}" title="${esc(stamp.toLocaleString())}">${esc(time)}</time></div>
      </article>`;
    }).join('');
    if(thread.innerHTML!==display){
      thread.innerHTML=display;
      if(atBottom)thread.scrollTop=thread.scrollHeight;
    }
    panel.querySelector('.chat-status').textContent=paused?'The organizer paused posting.':messages.length?'':'No messages yet.';
    panel.querySelector('textarea').disabled=paused;
    panel.querySelector('form button').disabled=paused || !!panel.querySelector('form').dataset.saving;
    if(atBottom){
      try { localStorage.setItem(key,String(Math.max(lastRead,messages[0]?.id||0))); } catch {}
      chatUnread(false);
    }else chatUnread(messages.some(message=>message.id>lastRead && message.memberId!==owner));
  }catch(error){
    const status=dialog.open && dialog.querySelector('.chat-status');
    if(requestId===chatRequest && member?.id===owner && status)status.textContent=error.message;
  }
}
setInterval(()=>{
  if(!member || document.hidden)return;
  if(!dialog.open || dialog.querySelector('.chat-sheet'))void refreshChat();
},5000);

function resetSession(message='') {
  revision++; modalRequest++; member=null; vehicles=[]; events=[]; photos=[]; memberGarages=[]; rsvps={};
  dataError=''; loading=false; view='home'; filter='all'; publishedPerks=[];
  announcementRequest++; setBellUnread(false);
  chatRequest++; chatUnread(false);
  dialog.close(); $('#sheet-content').replaceChildren(); $('#app-main').replaceChildren();
  shell.hidden=true; splash.hidden=false;
  showLogin(message);
}
function showLogin(message='') {
  sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">Member sign in</h2>
    <form data-form="login"><label>Email<input type="email" name="email" autocomplete="username" required></label>
    <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
    <p role="alert" class="form-error">${esc(message)}</p><button class="action full">Sign in</button></form>
    <button class="small-link" data-action="recover">Forgot password?</button> <button class="small-link" data-action="registration-code">I have a signup code</button></div>`, true);
}
function showRegistration() {
  sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">Create a TEC account</h2>
    <form data-form="register">
      <label>Display name<input name="displayName" autocomplete="nickname" maxlength="80" required></label>
      <label>Email<input type="email" name="email" autocomplete="email" required></label>
      <label>Password<input type="password" name="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
      <label>Confirm password<input type="password" name="confirm" autocomplete="new-password" minlength="12" maxlength="128" required></label>
      <label><input type="checkbox" name="localParticipationAgreement" required>
        I confirm that I live in the Palm Beaches, Martin County, St. Lucie County, or the surrounding area, and plan to participate in TEC group activities.
      </label>
      ${errorLine}<button class="action full">Create account</button>
    </form><p><a href="https://teccarclub.com/privacy.html">Privacy Policy</a></p></div>`, true);
}
function showRegistrationCode(email) {
  sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">Confirm your email</h2>
    <p>Enter the six-digit code from your TEC signup email.</p>
    <form data-form="confirm-registration"><label>Email<input type="email" name="email" value="${esc(email)}" required></label>
    <label>Verification code<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></label>
    ${errorLine}<button class="action full">Verify email</button></form></div>`, true);
}
const recoveryKey = 'tec-password-request';
function recoveryEmail() {
  try {
    const saved = JSON.parse(localStorage.getItem(recoveryKey));
    if (saved && saved.until > Date.now()) return saved.email;
  } catch {}
  localStorage.removeItem(recoveryKey);
  return '';
}
function showRecoveryCode() {
  const email = recoveryEmail();
  if (!email) throw new Error('Request a new reset email.');
  sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">Enter verification code</h2>
    <p>Enter the six-digit code sent to ${esc(email)}.</p>
    <form data-form="confirm-code"><label>Verification code
    <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></label>
    ${errorLine}<button class="action full">Verify code</button></form>
    <button class="small-link" data-action="recover">Request a new code</button></div>`, true);
}
function showRecoveryLink(token = '') {
  const email = recoveryEmail();
  const prompt = email ? `Continue to reset the password for ${esc(email)}.` : 'Continue only if you requested this TEC email.';
  sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">${email ? 'Reset password' : 'Confirm your email'}</h2>
    <p>${prompt}</p><form data-form="confirm-link">
    ${token ? '' : '<label>Link from your TEC email<input name="link" type="url" autocomplete="off" required></label><p>Open the link on this phone, or press and hold the link in your email, copy it, and paste it here.</p>'}
    ${errorLine}<button class="action full">Continue</button></form></div>`, true);
  dialog.querySelector('form').emailToken = token;
}
function showNewPassword(email) {
  sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">Choose a new password</h2>
    <p>${esc(email)}</p><form data-form="new-password">
    <label>New password<input type="password" name="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
    <label>Confirm password<input type="password" name="confirm" autocomplete="new-password" minlength="12" maxlength="128" required></label>
    <p>Use at least 12 characters.</p>${errorLine}<button class="action full">Save password</button></form></div>`, true);
  dialog.querySelector('form').recoveryEmail = email;
}
function tokenFromResetLink(value) {
  try {
    const url = new URL(value);
    if (url.origin === 'https://teccarclub.com' && !url.username && !url.password &&
        ['/', '/android/reset'].includes(url.pathname)) {
      return /^#email-confirm\/([A-Za-z0-9_-]{32,256})$/.exec(url.hash)?.[1] || '';
    }
  } catch {}
  return '';
}
window.tecReceiveEmailLink = token => {
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) return;
  revision++; modalRequest++;
  showRecoveryLink(token);
};
function setMember(profile) {
  member=profile.member;
  vehicles=profile.vehicles.map(row=>asVehicle(row,member.name,true));
  $('.account-mark').textContent=firstName().slice(0,1).toUpperCase();
  $('.avatar').setAttribute('aria-label','Member account');
  splash.hidden=true; shell.hidden=false;
}
async function startMember() {
  const token=++revision;
  const profile=await request('/api/me');
  if (token!==revision) return;
  if (!profile.member) {resetSession(profile.membershipRemoved?'This membership is no longer active.':'');return;}
  dialog.close(); setMember(profile); placeChatBubble(); void refreshChat(); void refreshAnnouncements(); await refresh();
}
async function refresh() {
  const token=++revision;
  loading=true; dataError=''; render();
  try {
    const [profile,listing,garages,gallery]=await Promise.all(['/api/me','/api/events','/api/garage','/api/gallery'].map(path=>request(path)));
    if (token!==revision) return;
    if (profile.member?.id!==member?.id) {resetSession('Please sign in to your account.');return;}
    setMember(profile);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    events=listing.events.map(asEvent).filter(e=>e && e.status!=='cancelled' && (e.end?Date.parse(e.end)>=Date.now():e.isoDate>=today)).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
    rsvps=Object.fromEntries(events.filter(e=>e.myRsvp).map(e=>[e.id,statusLabels[e.myRsvp.status]]));
    memberGarages = garages.members.filter(owner => owner.vehicles.length).map(owner => {
      const garageVehicles = owner.vehicles.map(row => asVehicle(row, owner.name, false));
      const cover = garageVehicles.find(vehicle => vehicle.image) || garageVehicles[0];
      return {...cover, id: owner.id, vehicles: garageVehicles};
    });
    photos=gallery.photos.filter(photo=>clubImage(photo.url));
  } catch(error) {
    if(token===revision) dataError=error.message;
  } finally {
    if(token===revision) {loading=false;render();}
  }
}
function garagePage() {
  return `<section class="page"><h1 class="page-title">Your Garage</h1>${vehicles.map(v=>`<article class="vehicle-card"><div class="vehicle-cover">${vehicleImage(v)}</div><div class="vehicle-copy"><h2>${esc(v.title)}</h2><p>${esc(v.mods)}</p><button class="action secondary" data-vehicle="${esc(v.id)}">View</button></div></article>`).join('')}
    <button class="action full" data-action="add-vehicle">${vehicles.length?'Add vehicle':'Create Garage'}</button>
    <div class="section-head garage-section-heading"><h2>Member Garages</h2></div><div class="build-row">${memberGarages.map(buildTile).join('')}</div></section>`;
}
function galleryPage() {
  return `<section class="page"><h1 class="page-title">Member &amp; Event Gallery</h1><div class="upload-row"><small>All photos</small><button class="action secondary" data-action="photo-upload">Add photos</button></div><div class="gallery-grid">${photos.map((p,i)=>`<button class="gallery-button" data-photo="${i}" aria-label="Open photo ${i+1}"><img src="${esc(p.url)}" alt="${esc(p.caption||'TEC member photo')}" loading="lazy"></button>`).join('')}</div></section>`;
}
const views={home,events:eventPage,garage:garagePage,photos:galleryPage,cruise:cruisePage,perks:perksPage};
function render() {
  if (!member) return;
  nav();
  const status=dataError?`<p class="empty-state" role="alert">${esc(dataError)} <button class="action" data-action="refresh">Retry</button></p>`:'';
  $('#app-main').innerHTML=status+(loading&&!events.length&&!vehicles.length?'<p class="empty-state" role="status">Loading your membership…</p>':views[view]());
  if(view==='perks')loadPerks();
}
function go(next) {
  if(!Object.hasOwn(views,next))return;
  view=next;render();$('#app-scroll').scrollTop=0;
}
function vehicleForm(v={}) {
  const field=(name,title,max)=>`<label>${title}<input name="${name}" maxlength="${max}" value="${esc(v[name])}" ${name==='color'?'':'required'}></label>`;
  sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">${v.id?'Edit vehicle':'Add vehicle'}</h2><form data-form="vehicle" data-id="${esc(v.id)}">
    <label>Year<input type="number" name="year" min="1900" max="${new Date().getFullYear()+2}" value="${esc(v.year)}" required></label>
    ${field('make','Make',60)}${field('model','Model',100)}${field('color','Color',50)}
    <label>What Makes It Special<textarea name="mods" maxlength="1800">${esc(v.mods)}</textarea></label>
    <label>Vehicle photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label>${errorLine}
    <button class="action full">Save vehicle</button></form></div>`);
}
function showMemberGarage(id) {
  const garage = memberGarages.find(entry => entry.id === id);
  if (!garage) return;
  const cards = garage.vehicles.map(vehicle => `
    <article class="vehicle-card">
      <div class="vehicle-cover">${vehicleImage(vehicle)}</div>
      <div class="vehicle-copy">
        <h3>${esc(vehicle.title)}</h3>
        ${vehicle.color ? `<p>${esc(vehicle.color)}</p>` : ''}
        ${vehicle.mods ? `<p>${esc(vehicle.mods)}</p>` : ''}
      </div>
    </article>`).join('');
  sheet(`<div class="media-dialog-tools">${closeButton()}</div>
    <div class="sheet-body member-garage-body">
      <h2 id="sheet-title">${esc(garage.owner)}’s Garage</h2>${cards}
    </div>`, true);
}
function vehicleDetails(v) {
  if(!v)return;
  sheet(`<div class="sheet-cover">${vehicleImage(v)}${closeButton()}</div><div class="sheet-body"><p class="eyebrow">${esc(v.owner)}’s Garage</p><h2 id="sheet-title">${esc(v.title)}</h2><p>${esc(v.color)}</p><p>${esc(v.mods)}</p>${v.personal?`<button class="action full" data-edit="${esc(v.id)}">Edit vehicle</button>`:''}</div>`,true);
}
function imageView(title,url) {
  if(!url)return;
  sheet(`<div class="media-dialog-tools">${closeButton()}</div><div class="lightbox event-flyer-lightbox"><h2 id="sheet-title">${esc(title)}</h2><img src="${esc(url)}" alt="${esc(title)}"></div>`,true);
}
function rsvpForm(e,mine) {
  const stops=e.stops.filter(s=>s.join);
  if(!stops.length||e.status==='cancelled')return '<p>RSVP is unavailable for this event.</p>';
  return `<form class="member-rsvp" data-form="rsvp" data-id="${esc(e.id)}"><h3>Your plan</h3>
    <label>RSVP<select name="status" required><option value="">Choose a response</option>${Object.entries(statusLabels).map(([k,v])=>`<option value="${k}"${selected(k,mine?.status)}>${v}</option>`).join('')}</select></label>
    <label>Join at<select name="joinStop" required>${stops.map(s=>`<option value="${esc(s.id)}"${selected(s.id,mine?.join_stop)}>${esc(s.name)}</option>`).join('')}</select></label>
    <label>Vehicle<select name="vehicleId"><option value="">No vehicle selected</option>${vehicles.map(v=>`<option value="${esc(v.id)}"${selected(v.id,mine?.vehicle_id)}>${esc(v.title)}</option>`).join('')}</select></label>
    <label>Guests<input type="number" min="0" max="10" name="guests" value="${esc(mine?.guests||0)}" required></label>
    <label><input type="checkbox" name="reminder" ${mine?.reminder?'checked':''}> Send me a reminder</label>${errorLine}
    <button class="action full">Save RSVP</button></form>`;
}
async function showEvent(id) {
  const token=++modalRequest;
  sheet(`<div class="sheet-body">${closeButton()}<h2 id="sheet-title">Event details</h2><p>Loading event…</p></div>`,true);
  try {
    const detail=await request(pathFor(id));
    if(token!==modalRequest||!dialog.open||!member)return;
    const e=asEvent(detail.event);
    const flyer=e.thumbnail?`<button class="detail-flyer" data-flyer="${esc(id)}"><img src="${esc(e.thumbnail)}" alt="${esc(e.title)}"><span>Tap flyer to enlarge</span></button>`:'';
    sheet(`<div class="media-dialog-tools">${closeButton()}</div>${flyer}<div class="sheet-body"><p class="eyebrow">${esc(e.type)}</p><h2 id="sheet-title">${esc(e.title)}</h2><p>${esc(e.dateLabel)} · ${esc(e.time)}</p><p>${esc(e.description)}</p><div class="event-venue-details"><strong>${esc(e.location)}</strong><p>${esc(e.address)}</p></div>
      ${rsvpForm(e,detail.myRsvp)}<h3>The day at a glance</h3><ol class="itinerary">${e.stops.map(s=>`<li><time>${esc(s.time)}<small>${esc(s.period)}</small></time><div><strong>${esc(s.name)}</strong><p>${esc(s.note)}</p></div></li>`).join('')}</ol></div>`,true);
  } catch(error) {
    if(token===modalRequest&&dialog.open&&member)sheet(`<div class="sheet-body">${closeButton()}<h2 id="sheet-title">Event details</h2><p>${esc(error.message)}</p><button class="action" data-event="${esc(id)}">Retry</button></div>`,true);
  }
}
async function upload(file,kind) {
  if(file.size>5*1024*1024)throw new Error('Choose a JPEG, PNG or WebP under 5 MB.');
  const body=new FormData();body.set('file',file);body.set('kind',kind);
  return request('/api/uploads','POST',body);
}
async function submitForm(form) {
  const data=new FormData(form), id=form.dataset.id, kind=form.dataset.form;
  if(kind==='register'){
    const email=String(data.get('email')).trim().toLowerCase(), password=data.get('password');
    if(password!==data.get('confirm'))throw new Error('Your passwords do not match.');
    const result=await request('/api/auth/signup','POST',{
      email,password,displayName:data.get('displayName'),localParticipationAgreement:data.has('localParticipationAgreement')
    });
    form.reset();
    if(result.signedIn){await startMember();return;}
    showRegistrationCode(email);return;
  }
  if(kind==='confirm-registration'){
    await request('/api/auth/recovery-code','POST',{email:data.get('email'),code:data.get('code')});
    form.reset();await startMember();return;
  }
  if(kind==='chat-message'){
    await request('/api/chat','POST',{message:data.get('message')});
    form.reset();await refreshChat();return;
  }
  if(kind==='login'){
    await request('/api/auth/password-signin','POST',{email:data.get('email'),password:data.get('password')});
    localStorage.removeItem(recoveryKey);form.elements.password.value='';await startMember();return;
  }
  if(kind==='recover'){
    await request('/api/auth/email','POST',{email:data.get('email'),recovery:true});
    localStorage.setItem(recoveryKey, JSON.stringify({email:String(data.get('email')).trim().toLowerCase(),until:Date.now()+60*60*1000}));
    showRecoveryCode();return;
  }
  if(kind==='confirm-code'){
    const email=recoveryEmail();
    if(!email)throw new Error('Request a new reset email.');
    await request('/api/auth/recovery-code','POST',{email,code:data.get('code')});
    form.reset();showNewPassword(email);return;
  }
  if(kind==='confirm-link'){
    const token=form.emailToken || tokenFromResetLink(data.get('link'));
    if(!token)throw new Error('Paste the complete link from your TEC email.');
    const email=recoveryEmail();
    await request('/api/auth/confirm','POST',email ? {token,recoveryEmail:email} : {token});
    form.emailToken=''; if(form.elements.link)form.elements.link.value='';
    if(email)showNewPassword(email);else await startMember();
    return;
  }
  if(kind==='new-password'){
    const password=data.get('password');
    if([...password].length<12 || password.length>128)throw new Error('Use 12 to 128 characters.');
    if(password!==data.get('confirm'))throw new Error('Your passwords do not match.');
    await request('/api/auth/password','POST',{password,recoveryEmail:form.recoveryEmail});
    localStorage.removeItem(recoveryKey);
    form.reset();await startMember();toast('Your new password is saved.');return;
  }
  if(kind==='logout'){await request('/api/auth/signout','POST',{});resetSession();return;}
  if(!member)return;
  if(kind==='vehicle'){
    const vehicle=vehicles.find(v=>v.id===id);
    let imageId=vehicle?.image_id||null;
    const photo=form.elements.photo.files[0];
    if(photo){
      if(form.uploadedFile!==photo){
        const saved=await upload(photo,'garage');
        form.uploadedFile=photo; form.uploadedId=saved.id;
      }
      imageId=form.uploadedId;
    }
    const {year,make,model,color,mods}=Object.fromEntries(data);
    await request('/api/vehicles'+(id?'/'+encodeURIComponent(id):''),id?'PUT':'POST',{year:Number(year),make,model,color,mods,imageId});
    dialog.close();toast('Vehicle saved to your TEC garage.');await refresh();
  }
  if(kind==='rsvp'){
    const {status,joinStop,vehicleId,guests}=Object.fromEntries(data);
    const result=await request(pathFor(id)+'/rsvp','PUT',{status,joinStop,vehicleId:vehicleId||null,guests:Number(guests),reminder:data.has('reminder')});
    rsvps[id]=statusLabels[result.myRsvp.status];dialog.close();render();toast('Your RSVP is saved.');
  }
  if(kind==='photos'){
    const files=[...form.elements.photos.files];
    for(const file of files){
      if(!form.sentFiles)form.sentFiles=new Set();
      if(form.sentFiles.has(file))continue;
      await upload(file,'gallery');form.sentFiles.add(file);
    }
    dialog.close();toast('Photos submitted to the club gallery.');await refresh();
  }
}
document.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.target;
  if(!form.dataset.form||form.dataset.saving)return;
  form.dataset.saving='1';const submit=form.querySelector('button');submit.disabled=true;
  try{await submitForm(form);}
  catch(error){form.querySelector('.form-error').textContent=error.message;}
  finally{delete form.dataset.saving;submit.disabled=form.dataset.form==='chat-message' && form.elements.message.disabled;}
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('button,a');
  if(!button){
    const ticket=event.target.closest('.event-ticket');
    const link=ticket?.querySelector('[data-event]');
    if(member && link)await showEvent(link.dataset.event);
    return;
  }
  if(button.id==='register-tec'){event.preventDefault();showRegistration();return;}
  if(button.id==='signin-tec'){event.preventDefault();showLogin();return;}
  const d=button.dataset;
  if(d.action==='close-sheet'){modalRequest++;dialog.close();return;}
  if(d.action==='registration-code'){showRegistrationCode('');return;}
  if(d.action==='have-code' && recoveryEmail()){showRecoveryCode();return;}
  if(d.action==='have-link'){showRecoveryLink();return;}
  if(d.action==='recover'){
    sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">Reset password</h2><form data-form="recover"><label>TEC account email<input type="email" name="email" required></label>${errorLine}<button class="action full">Send verification code</button></form>${recoveryEmail() ? '<button class="small-link" data-action="have-code">I have a verification code</button>' : ''}</div>`);return;
  }
  if(!member)return;
  if(d.nav)go(d.nav);
  else if(d.filter){filter=d.filter;render();}
  else if(d.event)await showEvent(d.event);
  else if(d.flyer){const e=events.find(e=>e.id===d.flyer);if(e)imageView(e.title,e.thumbnail);}
  else if(d.vehicle)vehicleDetails(vehicles.find(v=>v.id===d.vehicle));
  else if(d.memberGarage) showMemberGarage(d.memberGarage);
  else if(d.edit)vehicleForm(vehicles.find(v=>v.id===d.edit));
  else if(d.photo!==undefined){const p=photos[Number(d.photo)];if(p)imageView(p.caption||'Club photo',p.url);}
  else if(d.perk)showPerk(d.perk);
  else if(d.action==='retry-perks')await loadPerks();
  else if(d.action==='refresh')await refresh();
  else if(d.action==='add-vehicle')vehicleForm();
  else if(d.action==='photo-upload')sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">Add photos</h2><form data-form="photos"><label>Gallery photos<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required></label>${errorLine}<button class="action full">Upload photos</button></form></div>`);
  else if(d.action==='about')sheet(`<div class="form-sheet">${closeButton()}<h2 id="sheet-title">${esc(member.name)}</h2><form data-form="logout">${errorLine}<button class="action secondary full">Sign out</button></form><p><a href="https://teccarclub.com/privacy.html">Privacy Policy</a></p></div>`);
  else if(d.action==='updates')await refreshAnnouncements({open:true});
});
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
$('#preview-tec').href='https://appassets.androidplatform.net/index.html#app';
window.addEventListener('pageshow',event=>{if(event.persisted)startMember().catch(error=>resetSession(error.message));});
document.addEventListener('visibilitychange',()=>{
  if (document.hidden || !member || dialog.open) return;
  void refreshAnnouncements();
  void refreshChat();
  void refresh();
});
setInterval(()=>{
  if (!document.hidden && !dialog.open) void refreshAnnouncements();
},60000);
startMember().then(()=>{
  if (!member && new URLSearchParams(location.search).has('register')) showRegistration();
}).catch(error=>resetSession(error.message));
