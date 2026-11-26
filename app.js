import * as THREE from 'three';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const exportTemplate=document.documentElement.outerHTML;
const packagedExperiencePreview=document.body?.dataset?.localPreview==='true';
const defaults={to:'小满',from:'阿鹿',memory:'还记得那些一起笑得很开心的日子吗？',song:'',songNote:'',wish:'一起去海边看日出\n一起吃很多顿普通的晚饭\n再拍一张最喜欢的合照',secret:'谢谢你，一直都在。',letter:'新的一岁，愿你有大胆出发的勇气，也有随时回家的安心。\n\n生日快乐，慢慢长大，我们慢慢走。',photo:'',photos:[],albumCover:'',voice:'',voiceSeconds:0};
const fields=['to','from','memory','song','songNote','wish','secret','letter'];
const imageData=s=>typeof s==='string'&&s.length<=850000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)?s:'';
const voiceData=s=>typeof s==='string'&&s.length<=8400000&&/^data:audio\/(webm|ogg|mp4|mpeg|wav|x-wav|aac)(?:;codecs=[a-zA-Z0-9., -]+)?;base64,[A-Za-z0-9+/=]+$/.test(s)?s:'';
const songAudioData=s=>typeof s==='string'&&s.length<=22400000&&/^data:audio\/(webm|ogg|mp4|x-m4a|m4a|mpeg|wav|x-wav|aac)(?:;codecs=[a-zA-Z0-9., -]+)?;base64,[A-Za-z0-9+/=]+$/.test(s)?s:'';
function sanitize(o){const out={};for(const k of fields)out[k]=typeof o?.[k]==='string'?o[k].slice(0,k==='letter'?500:k==='memory'||k==='secret'?300:k==='wish'?200:k==='to'||k==='from'?18:k==='song'?60:120):defaults[k];out.photos=Array.isArray(o?.photos)?o.photos.slice(0,12).map(p=>({src:imageData(p?.src),caption:String(p?.caption||'').slice(0,160)})).filter(p=>p.src):[];const legacy=imageData(o?.photo);if(!out.photos.length&&legacy)out.photos=[{src:legacy,caption:''}];out.photo=out.photos[0]?.src||'';out.albumCover=imageData(o?.albumCover);out.voice=voiceData(o?.voice);out.voiceSeconds=Math.max(0,Math.min(90,Number(o?.voiceSeconds)||0));out.songAudio=songAudioData(o?.songAudio);out.songSeconds=Math.max(0,Math.min(300,Number(o?.songSeconds)||0));out.version=4;return out}
let card=sanitize(defaults),mode='home',previous='home',started=false,seen=new Set(),photoBusy=false,shared=false,localExperiencePreview=false,birthdayCaptureBusy=false;
let draftDB;try{draftDB=await new Promise((resolve,reject)=>{const req=indexedDB.open('little-room-card-v3',1);req.onupgradeneeded=()=>req.result.createObjectStore('drafts');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('blocked'))})}catch{}
try{const embedded=$('#gift-data');if(embedded){card=sanitize(JSON.parse(embedded.textContent));shared=true}else if(location.hash.startsWith('#card=')){card=sanitize(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(location.hash.slice(6)),c=>c.charCodeAt(0)))));shared=true}else{let saved=draftDB?await new Promise((resolve,reject)=>{const r=draftDB.transaction('drafts').objectStore('drafts').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}):null;if(!saved){try{saved=JSON.parse(localStorage.getItem('little-room-draft-v2')||'null')}catch{}}if(saved)card=sanitize(saved)}}catch{setTimeout(()=>toast('这份数据暂时无法读取，已打开示例小屋。'),100)}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('on');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('on'),3600)}
let saveTimer;function save(){clearTimeout(saveTimer);$('#save-status').textContent='正在保存…';saveTimer=setTimeout(()=>persistDraft(),280)}
async function persistDraft(){clearTimeout(saveTimer);if(shared){$('#save-status').textContent='修改保留在本次页面中，完成后请导出。';return}try{const data=sanitize(card);if(draftDB)await new Promise((resolve,reject)=>{const tx=draftDB.transaction('drafts','readwrite');tx.objectStore('drafts').put(data,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});else localStorage.setItem('little-room-draft-v2',JSON.stringify(data));$('#save-status').textContent='已保存到这台设备 · 照片和录音一起保存'}catch{$('#save-status').textContent='设备空间不足或不允许保存，请及时导出贺卡。'}}
const stepNames=['邀请','照相机','唱片机','电话','气球','蛋糕'];let makerStep=0;
$('#maker-steps').innerHTML=stepNames.map((s,i)=>`<button type="button" data-step-target="${i}">${s}</button>`).join('');
const makerPanel=$('.editor-panel'),makerScrollbar=$('#maker-scrollbar'),makerThumb=makerScrollbar?.firstElementChild;function syncMakerScrollbar(){if(!makerScrollbar||!makerThumb)return;const editorRect=$('#editor').getBoundingClientRect(),panelRect=makerPanel.getBoundingClientRect();makerScrollbar.style.left=Math.max(0,Math.round(panelRect.right-editorRect.left-15))+'px';const max=makerPanel.scrollHeight-makerPanel.clientHeight;if(max<=2||matchMedia('(max-width:760px)').matches){makerScrollbar.hidden=true;return}makerScrollbar.hidden=false;const track=makerScrollbar.clientHeight,thumb=Math.max(68,Math.round(track*makerPanel.clientHeight/makerPanel.scrollHeight)),travel=Math.max(0,track-thumb),offset=max?Math.round(travel*makerPanel.scrollTop/max):0;makerThumb.style.height=thumb+'px';makerThumb.style.transform=`translateY(${offset}px)`}makerPanel.addEventListener('scroll',syncMakerScrollbar,{passive:true});if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncMakerScrollbar).observe(makerPanel);if(typeof MutationObserver!=='undefined')new MutationObserver(()=>typeof requestAnimationFrame==='function'?requestAnimationFrame(syncMakerScrollbar):syncMakerScrollbar()).observe($('#card-form'),{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});if(typeof requestAnimationFrame==='function')requestAnimationFrame(syncMakerScrollbar);
function fill(){for(const k of fields){const el=$('#card-form').elements[k];if(el)el.value=card[k]}$('#preview-name').textContent=card.to||'你';renderPhotos();renderCover();renderVoice();renderSong();renderWishes()}
function renderStep(){document.querySelectorAll('.maker-page').forEach((e,i)=>e.hidden=i!==makerStep);document.querySelectorAll('[data-step-target]').forEach((e,i)=>{e.classList.toggle('selected',i===makerStep);e.setAttribute('aria-current',i===makerStep?'step':'false')});$('#step-back').hidden=makerStep===0;$('#step-next').hidden=makerStep===5;$('#preview-card').hidden=makerStep!==5;$('#export-card').hidden=makerStep!==5;$('#preview-object').hidden=makerStep===0;$('#preview-object').textContent=makerStep?`看看${stepNames[makerStep]}里的内容`:'看看这件小物';$('#step-room-caption').textContent=makerStep?`正在准备 · ${stepNames[makerStep]}`:'把想说的话，一件一件放进去。';$('#maker-summary').textContent=`已添加 ${card.photos.length} 张照片 · ${card.songAudio?'1 首送给 TA 的歌':'暂不放入歌曲'} · ${card.voice?'1 段录音':'文字留言'}`;$('.editor-panel').scrollTo({top:0,behavior:'smooth'});if(matchMedia('(max-width:760px)').matches)$('.editor-home-tab').scrollIntoView({block:'start',behavior:'smooth'})}
function positionPreviewBubble(){const bubble=$('#preview-object');if(mode!=='editor'||makerStep===0||bubble.hidden)return;const key=['','memory','song','secret','wish','cake'][makerStep],item=items.find(it=>it.key===key);if(!item)return;const viewport=$('#viewport').getBoundingClientRect(),stage=$('#editor-stage').getBoundingClientRect();projected.copy(item.pos).project(camera);const x=viewport.left-stage.left+(projected.x*.5+.5)*viewport.width,y=viewport.top-stage.top+(-projected.y*.5+.5)*viewport.height-18;bubble.style.left=Math.max(105,Math.min(stage.width-105,x))+'px';bubble.style.top=Math.max(76,Math.min(stage.height-24,y))+'px'}
function selectStep(i){if(recordingBusy()){toast('请先结束并保存录音');return}$('#voice-preview').pause();$('#song-preview').pause();makerStep=Math.max(0,Math.min(5,i));renderStep()}
$('#maker-steps').onclick=e=>{const b=e.target.closest('[data-step-target]');if(b)selectStep(Number(b.dataset.stepTarget))};
$('#step-back').onclick=()=>selectStep(makerStep-1);$('#step-next').onclick=()=>{if(makerStep===0&&!validNames())return;selectStep(makerStep+1)};
function validNames(){if(card.to.trim()&&card.from.trim())return true;selectStep(0);const el=$('#card-form').elements[card.to.trim()?'from':'to'];el.focus();toast('先写下收礼人和你的名字吧。');return false}
$('#card-form').addEventListener('input',e=>{if(fields.includes(e.target.name)){card[e.target.name]=e.target.value;$('#preview-name').textContent=card.to||'你';save()}});
const wishInputs=[...document.querySelectorAll('[data-wish-line]')];
function renderWishes(){const values=card.wish.split('\n').slice(0,3);while(values.length<3)values.push('');wishInputs.forEach((input,i)=>input.value=values[i]||'')}
$('.wish-fields').addEventListener('input',e=>{if(e.target.dataset.wishLine===undefined)return;card.wish=wishInputs.map(input=>input.value.trim()).join('\n');save()});
$('#card-form').onsubmit=e=>{e.preventDefault();if(validNames())visit()};
$('#preview-object').onclick=()=>{if(photoBusy||recordingBusy()){toast('请等素材处理完成');return}const key=['','memory','song','secret','wish','cake'][makerStep];openItem(items.find(i=>i.key===key),true)};
async function compressImage(file,square=false){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20e6)throw Error('请选择 20 MB 以内的 JPG、PNG 或 WebP 图片。');const bmp=await createImageBitmap(file);try{const c=document.createElement('canvas'),ratio=Math.min(1,1000/Math.max(bmp.width,bmp.height));c.width=square?720:Math.max(1,Math.round(bmp.width*ratio));c.height=square?720:Math.max(1,Math.round(bmp.height*ratio));const ctx=c.getContext('2d');ctx.fillStyle='#fff8ef';ctx.fillRect(0,0,c.width,c.height);if(square){const size=Math.min(bmp.width,bmp.height);ctx.drawImage(bmp,(bmp.width-size)/2,(bmp.height-size)/2,size,size,0,0,720,720)}else ctx.drawImage(bmp,0,0,c.width,c.height);let quality=.8,src=c.toDataURL('image/jpeg',quality);while(src.length>800000&&quality>.32){quality-=.12;src=c.toDataURL('image/jpeg',quality)}if(!imageData(src))throw Error('图片过于复杂，请换一张较小的图片。');return src}finally{bmp.close()}}
function renderPhotos(){const list=$('#photo-list');list.innerHTML=card.photos.map((p,i)=>`<article class="photo-edit"><img src="${p.src}" alt="回忆照片 ${i+1}"><div><label>照片 ${i+1} 的回忆<textarea data-caption="${i}" maxlength="160" placeholder="看到这张照片，你想起了什么？">${esc(p.caption)}</textarea></label><div class="photo-tools"><button type="button" data-photo-up="${i}" ${i===0?'disabled':''} aria-label="前移照片 ${i+1}">前移</button><button type="button" data-photo-down="${i}" ${i===card.photos.length-1?'disabled':''} aria-label="后移照片 ${i+1}">后移</button><button type="button" data-photo-remove="${i}" aria-label="移除照片 ${i+1}">移除</button></div></div></article>`).join('');$('#photo-status').textContent=`${card.photos.length} / 12 张 · 可调整顺序`}
$('#photo-list').oninput=e=>{if(e.target.dataset.caption!==undefined){card.photos[Number(e.target.dataset.caption)].caption=e.target.value;save()}};
$('#photo-list').onclick=e=>{const b=e.target.closest('button');if(!b||photoBusy)return;for(const [key,delta] of [['photoUp',-1],['photoDown',1],['photoRemove',0]])if(b.dataset[key]!==undefined){const i=Number(b.dataset[key]);if(delta){[card.photos[i],card.photos[i+delta]]=[card.photos[i+delta],card.photos[i]]}else card.photos.splice(i,1);card.photo=card.photos[0]?.src||'';renderPhotos();updatePhoto();save()}};
$('#photo').onchange=async e=>{const files=Array.from(e.target.files);if(photoBusy)return;photoBusy=true;e.target.disabled=true;let errors=0;$('#photo-status').textContent='正在整理照片…';try{if(files.length>12-card.photos.length)toast('相册最多放入 12 张，已按顺序选取。');for(const f of files.slice(0,12-card.photos.length)){try{card.photos.push({src:await compressImage(f),caption:''})}catch{errors++}}card.photo=card.photos[0]?.src||'';renderPhotos();updatePhoto();save();if(errors)toast(`${errors} 张照片未能读取，请换一个格式。`)}finally{photoBusy=false;e.target.disabled=false;e.target.value=''}};
function renderCover(){$('#cover-preview').innerHTML=card.albumCover?`<img src="${card.albumCover}" alt="已上传的专辑封面">`:'<span class="empty-record" aria-label="尚未上传封面"></span>';$('#remove-cover').hidden=!card.albumCover}
$('#album-cover').onchange=async e=>{if(!e.target.files[0]||photoBusy)return;photoBusy=true;e.target.disabled=true;try{card.albumCover=await compressImage(e.target.files[0],true);renderCover();updateAlbum();save()}catch(err){toast(err.message)}finally{photoBusy=false;e.target.disabled=false;e.target.value=''}};
$('#remove-cover').onclick=()=>{card.albumCover='';renderCover();updateAlbum();save()};
let recorder=null,recordStream=null,recordTimer=null,recordPending=false,recordSaving=false,recordStarted=0;
function recordingBusy(){return songBusy||recordPending||recordSaving||recorder?.state==='recording'}
const clockText=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function readData(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
function renderVoice(){const a=$('#voice-preview');a.hidden=!card.voice;if(card.voice)a.src=card.voice;else{a.removeAttribute('src');a.load()}$('#remove-voice').hidden=!card.voice;$('#record-start').textContent=card.voice?'重新录音':'开始录音';$('#record-clock').textContent=clockText(card.voiceSeconds)}
function stopRecording(){if(recorder?.state==='recording'){recordSaving=true;recorder.stop()}}
$('#record-start').onclick=async()=>{if(recordingBusy())return;if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){$('#record-state').textContent='当前浏览器不能录音，请换用支持录音的浏览器。';return}recordPending=true;$('#record-start').disabled=true;$('#record-state').textContent='正在等待麦克风…';try{stopMusic();$('#voice-preview').pause();const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(mode!=='editor'||makerStep!==3){stream.getTracks().forEach(t=>t.stop());return}recordStream=stream;const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,mime?{mimeType:mime,audioBitsPerSecond:64000}:undefined);const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=async()=>{recordSaving=true;clearInterval(recordTimer);stream.getTracks().forEach(t=>t.stop());recordStream=null;$('#record-stop').hidden=true;$('#record-start').disabled=true;$('#record-state').textContent='正在保存录音…';try{const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});if(!blob.size||blob.size>6*1024*1024)throw Error('录音没有声音数据或文件过大，请重新录制。');const src=await readData(blob);if(!voiceData(src))throw Error('这段录音的格式不受支持，请上传 MP3、M4A 或 WAV。');card.voice=src;card.voiceSeconds=Math.min(90,(performance.now()-recordStarted)/1000);renderVoice();await persistDraft();$('#record-state').textContent='录音已保存，可以先听一遍。'}catch(err){$('#record-state').textContent=err.message}finally{recordSaving=false;$('#record-start').disabled=false;$('#record-start').hidden=false;recorder=null}};recorder.onerror=()=>{toast('录音中断，请重试。');stopRecording()};recorder.start(250);recordStarted=performance.now();$('#record-start').hidden=true;$('#record-stop').hidden=false;$('#record-state').textContent='正在录音…';recordTimer=setInterval(()=>{const t=(performance.now()-recordStarted)/1000;$('#record-clock').textContent=clockText(t);if(t>=90)stopRecording()},200)}catch(err){recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;$('#record-state').textContent=err.name==='NotAllowedError'?'没有获得麦克风权限。可重新允许访问，再试一次。':'未能启动麦克风，请检查设备后重试。'}finally{recordPending=false;$('#record-start').disabled=false;if(!recorder||recorder.state!=='recording')$('#record-start').hidden=false}};
$('#record-stop').onclick=()=>{stopRecording();$('#record-start').hidden=false};
$('#remove-voice').onclick=()=>{if(recordingBusy())return;$('#voice-preview').pause();card.voice='';card.voiceSeconds=0;renderVoice();save();$('#record-state').textContent='录音已移除。'};
window.addEventListener('pagehide',()=>{stopRecording();recordStream?.getTracks().forEach(t=>t.stop())});document.addEventListener('visibilitychange',()=>{if(document.hidden)stopRecording()});

let songBusy=false,songRecorder=null,songStream=null,songTimer=null;
function renderSong(){const audio=$('#song-preview');audio.hidden=!card.songAudio;if(card.songAudio)audio.src=card.songAudio;else{audio.removeAttribute('src');audio.load()}$('#song-remove').hidden=!card.songAudio;$('#song-start').textContent=card.songAudio?'重新录歌':'录一段歌';$('#song-clock').textContent=clockText(card.songSeconds);$('#song-preview').onplay=()=>{stopMusic();$('#voice-preview').pause()};$('#voice-preview').onplay=()=>{stopMusic();$('#song-preview').pause()}}
function songControls(busy){songBusy=busy;$('#song-start').disabled=busy;$('#song-upload').disabled=busy;$('#song-remove').disabled=busy}
function stopSongRecording(){if(songRecorder?.state==='recording'){songRecorder.stop();$('#song-stop').disabled=true;$('#song-state').textContent='正在保存这段歌……'}}
$('#song-start').onclick=async()=>{
 if(recordingBusy())return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){$('#song-state').textContent='当前浏览器无法录音，可以上传提前录好的音频。';return}
 songControls(true);$('#song-state').textContent='正在等待麦克风……';
 try{
  stopMusic();$('#song-preview').pause();$('#voice-preview').pause();
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});songStream=stream;
  if(mode!=='editor'||makerStep!==2||document.hidden){stream.getTracks().forEach(t=>t.stop());songStream=null;songControls(false);return}
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
  const rec=new MediaRecorder(stream,mime?{mimeType:mime,audioBitsPerSecond:128000}:undefined);songRecorder=rec;const chunks=[],start=performance.now();
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  rec.onstop=async()=>{clearInterval(songTimer);stream.getTracks().forEach(t=>t.stop());songStream=null;$('#song-stop').hidden=true;
   try{const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});if(!blob.size||blob.size>16*1024*1024)throw Error('录音为空或过大，请再录一次。');const data=await readData(blob);if(!songAudioData(data))throw Error('这段录音格式暂不支持，请上传 MP3 或 M4A。');card.songAudio=data;card.songSeconds=Math.min(300,(performance.now()-start)/1000);renderSong();await persistDraft();$('#song-state').textContent='录好了，先听听看。'}catch(e){$('#song-state').textContent=e.message}finally{songRecorder=null;songControls(false)}
  };
  rec.onerror=()=>{stopSongRecording();toast('录音中断，请检查后重试。')};
  rec.start(250);$('#song-stop').hidden=false;$('#song-stop').disabled=false;$('#song-state').textContent='正在录歌，唱一小段也很好。';
  songTimer=setInterval(()=>{const elapsed=(performance.now()-start)/1000;$('#song-clock').textContent=clockText(elapsed);if(elapsed>=300)stopSongRecording()},200);
 }catch(e){songStream?.getTracks().forEach(t=>t.stop());songStream=null;songControls(false);$('#song-state').textContent=e.name==='NotAllowedError'?'没有获得麦克风权限。也可以上传提前录好的歌。':'未能开始录音，请检查麦克风后重试。'}
};
$('#song-stop').onclick=stopSongRecording;
$('#song-remove').onclick=()=>{if(recordingBusy())return;$('#song-preview').pause();card.songAudio='';card.songSeconds=0;renderSong();save();$('#song-state').textContent='已移除歌曲，收卡时会跳过唱片机。'};
async function inspectSongFile(file){
 if(!file||file.size>16*1024*1024)throw Error('请选择 16 MB 以内的音频。');
 const extension=file.name.split('.').pop().toLowerCase(),types={mp3:'audio/mpeg',m4a:'audio/mp4',mp4:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg',webm:'audio/webm',aac:'audio/aac'};
 const type=types[extension];if(!type)throw Error('支持 MP3、M4A、WAV、OGG、WebM 和 AAC。');
 const blob=new Blob([file],{type}),url=URL.createObjectURL(blob),audio=new Audio();
 try{const duration=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('音频读取超时，请换一个文件。')),12000);audio.onloadedmetadata=()=>{clearTimeout(timer);Number.isFinite(audio.duration)&&audio.duration>0?resolve(audio.duration):reject(Error('无法识别音频长度，请换成 MP3 或 M4A。'))};audio.onerror=()=>{clearTimeout(timer);reject(Error('无法播放这个文件，请换成 MP3 或 M4A。'))};audio.src=url;});if(duration>300)throw Error('这首歌超过 5 分钟，请截取一段再上传。');const data=await readData(blob);if(!songAudioData(data))throw Error('音频格式无法读取。');return{data,duration};}finally{audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url)}
}
$('#song-upload').onchange=async e=>{const file=e.target.files[0];if(!file||recordingBusy())return;songControls(true);$('#song-state').textContent='正在读取这段歌……';$('#song-preview').pause();try{const result=await inspectSongFile(file);card.songAudio=result.data;card.songSeconds=result.duration;renderSong();await persistDraft();$('#song-state').textContent='歌曲已放好，可以先听一遍。'}catch(err){$('#song-state').textContent=err.message}finally{songControls(false);e.target.value=''}};
window.addEventListener('pagehide',()=>{stopSongRecording();songStream?.getTracks().forEach(t=>t.stop())});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSongRecording()});

fill();

document.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a==='home')show('home');if(a==='make'){show('editor');fill()}if(a==='visit')visit();if(a==='about'){show('home');$('#story').scrollIntoView({behavior:'smooth'})}if(a==='back')show(previous);if(a==='share')share()});
function show(next){stopRecording();$('#voice-preview').pause();$('#song-preview').pause();stopSongRecording();closeObjectMedia();mode=next;started=false;keys.clear();moveStick.set(0,0);$('#home').hidden=next!=='home';$('#editor').hidden=next!=='editor';$('#experience').hidden=next!=='experience';$('header').hidden=next==='experience';document.body.classList.toggle('editing',next==='editor');const host=next==='home'?$('#home-stage'):next==='editor'?$('#editor-stage'):$('#experience');host.prepend($('#viewport'));$('#hotspots').hidden=next!=='experience';ceiling.visible=false;frontWalls.visible=false;chandelier.visible=false;camera=overview;orbitAngle=.73;setOverview();resize();if(next!=='experience')stopMusic();if(next==='editor')renderStep();if(next==='home')window.scrollTo({top:0,behavior:'smooth'})}
function visit(){if(recordingBusy()){toast('请先结束录音');return}if(photoBusy){toast('照片还在处理，请稍等');return}previous=mode==='editor'?'editor':'home';localExperiencePreview=!shared||packagedExperiencePreview;show('experience');$('#invite-to').textContent=card.to||'亲爱的你';$('#invite-from').textContent=`${card.from||'一个在乎你的人'} 准备了一些想对你说的话，还有几段属于你们的回忆。`;$('#room-dedication').textContent=`给 ${card.to||'你'} 的生日贺卡`;$('#invitation').hidden=false;$('#quest').hidden=true;$('#object-nav').hidden=true;$('#visit-help').hidden=true;$('#joystick').hidden=true;seen.clear();flames.forEach(f=>f.visible=true);candlelight.intensity=0;warm.intensity=75;updateProgress()}
$('#enter').onclick=()=>{started=true;camera=inside;ceiling.visible=true;frontWalls.visible=true;chandelier.visible=true;inside.position.set(0,1.65,3.3);yaw=0;pitch=-.05;look();$('#invitation').hidden=true;$('#quest').hidden=false;$('#object-nav').hidden=false;$('#visit-help').hidden=false;$('#joystick').hidden=!matchMedia('(pointer:coarse)').matches;startMusic();resize()};
const scene=new THREE.Scene();scene.background=null;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;$('#viewport').append(renderer.domElement);
const overview=new THREE.OrthographicCamera(-6,6,6,-6,.1,100),inside=new THREE.PerspectiveCamera(67,1,.08,100);let camera=overview,orbitAngle=.73,yaw=0,pitch=-.05;
// Procedural textures for the European birthday salon. No remote image assets.
// The parquet uses a periodic partition of the integer grid, not overlapping planks.
function createRoomTextures(THREE) {
  const makeCanvas = (w, h = w) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    return canvas;
  };
  const random = (seed) => {
    let state = seed >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let value = Math.imul(state ^ state >>> 15, 1 | state);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  };
  const mod = (n, m) => ((n % m) + m) % m;
  const texture = (canvas, color = true, repeating = false) => {
    const map = new THREE.CanvasTexture(canvas);
    if (color) map.colorSpace = THREE.SRGBColorSpace;
    if (repeating) map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 8;
    return map;
  };

  // Herringbone: a cell is horizontal iff (x+y) mod (2*length) < length.
  // Each horizontal run and vertical run is exactly `length` cells, so their
  // wrapped rectangles cover the tile once with neither holes nor overlaps.
  const size = 2048, cells = 32, length = 4, unit = size / cells;
  const parquetCanvas = makeCanvas(size), parquetBump = makeCanvas(size), parquetRough = makeCanvas(size);
  const pctx = parquetCanvas.getContext('2d');
  const bctx = parquetBump.getContext('2d');
  const rctx = parquetRough.getContext('2d');
  pctx.fillStyle = '#726b65'; pctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#4a4a4a'; bctx.fillRect(0, 0, size, size);
  rctx.fillStyle = '#ececec'; rctx.fillRect(0, 0, size, size);
  const boards = [];
  for (let y = 0; y < cells; y++) {
    for (let x = mod(-y, length * 2); x < cells; x += length * 2) boards.push({x, y, vertical: false});
  }
  for (let x = 0; x < cells; x++) {
    for (let y = mod(length - x, length * 2); y < cells; y += length * 2) boards.push({x, y, vertical: true});
  }
  const cover = new Uint8Array(cells * cells);
  for (const board of boards) for (let s = 0; s < length; s++) {
    const x = mod(board.x + (board.vertical ? 0 : s), cells);
    const y = mod(board.y + (board.vertical ? s : 0), cells);
    cover[y * cells + x]++;
  }
  if (cover.some(value => value !== 1)) throw new Error('Parquet tile partition is invalid.');

  function drawBoard(board, dx, dy) {
    const seed = (board.x * 92821 + board.y * 68917 + (board.vertical ? 84031 : 19789)) >>> 0;
    const rnd = random(seed), w = unit * length, h = unit;
    const tint = rnd(), lightness = 63.5 + tint * 8, hue = 28 + rnd() * 5;
    for (const ctx of [pctx, bctx, rctx]) {
      ctx.save();
      ctx.translate(board.x * unit + dx, board.y * unit + dy);
      if (board.vertical) { ctx.translate(unit, 0); ctx.rotate(Math.PI / 2); }
    }
    // Narrow grooves, softly bevelled lips, and satin brown-grey oak.
    pctx.fillStyle = `hsl(${hue} 14% ${lightness}%)`;
    pctx.fillRect(1.5, 1.5, w - 3, h - 3);
    const shade = pctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, '#fff9f12b'); shade.addColorStop(.2, '#ffffff08');
    shade.addColorStop(.78, '#463f3a05'); shade.addColorStop(1, '#463f3a1c');
    pctx.fillStyle = shade; pctx.fillRect(1.5, 1.5, w - 3, h - 3);
    bctx.fillStyle = '#bdbdbd'; bctx.fillRect(1.5, 1.5, w - 3, h - 3);
    bctx.fillStyle = '#d5d5d5'; bctx.fillRect(3, 3, w - 6, h - 6);
    rctx.fillStyle = `rgb(${205 + Math.floor(rnd() * 19)} ${205 + Math.floor(tint * 19)} ${205 + Math.floor(tint * 19)})`;
    rctx.fillRect(1.5, 1.5, w - 3, h - 3);
    const phase = rnd() * 6.28, wave = 1.2 + rnd() * 2.2;
    const knotX = w * (.2 + rnd() * .6), knotY = h * (.25 + rnd() * .5);
    for (let j = 0; j < 46; j++) {
      const yy = 3 + rnd() * (h - 6);
      const alpha = .035 + rnd() * .075;
      pctx.strokeStyle = `rgba(73,61,54,${alpha})`;
      pctx.lineWidth = .35 + rnd() * .6;
      bctx.strokeStyle = `rgba(80,80,80,${alpha * .6})`; bctx.lineWidth = .5;
      for (const ctx of [pctx, bctx]) {
        ctx.beginPath();
        for (let xx = 4; xx <= w - 4; xx += 4) {
          const curve = Math.sin(xx * .018 + phase + j * .13) * wave;
          const knot = Math.exp(-Math.pow((xx - knotX) / 27, 2)) * Math.exp(-Math.pow((yy - knotY) / 18, 2)) * (yy < knotY ? -3 : 3);
          if (xx === 4) ctx.moveTo(xx, yy + curve + knot); else ctx.lineTo(xx, yy + curve + knot);
        }
        ctx.stroke();
      }
    }
    for (let j = 0; j < 70; j++) {
      pctx.fillStyle = `rgba(251,244,237,${.04 + rnd() * .05})`;
      pctx.fillRect(3 + rnd() * (w - 30), 3 + rnd() * (h - 6), 3 + rnd() * 24, .4);
    }
    pctx.strokeStyle = '#fff8ec25'; pctx.lineWidth = .7;
    pctx.strokeRect(2.2, 2.2, w - 4.4, h - 4.4);
    for (const ctx of [pctx, bctx, rctx]) ctx.restore();
  }
  for (const board of boards) {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      const bw = board.vertical ? unit : unit * length, bh = board.vertical ? unit * length : unit;
      if (board.x * unit + dx + bw <= 0 || board.x * unit + dx >= size || board.y * unit + dy + bh <= 0 || board.y * unit + dy >= size) continue;
      drawBoard(board, dx, dy);
    }
  }
  const floor = {map: texture(parquetCanvas, true, true), bumpMap: texture(parquetBump, false, true), roughnessMap: texture(parquetRough, false, true)};
  for (const map of Object.values(floor)) { map.center.set(.5, .5); map.rotation = Math.PI / 4; }

  function neutralSurface(seed, woven = false) {
    const n = 512, canvas = makeCanvas(n), bump = makeCanvas(n);
    const ctx = canvas.getContext('2d'), bc = bump.getContext('2d'), rnd = random(seed);
    ctx.fillStyle = '#f9f8f7'; ctx.fillRect(0, 0, n, n);
    bc.fillStyle = '#808080'; bc.fillRect(0, 0, n, n);
    const image = ctx.getImageData(0, 0, n, n), relief = bc.getImageData(0, 0, n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      const noise = rnd() - .5;
      const weave = woven ? (Math.sin(x * Math.PI / 2) * 1.9 + Math.sin(y * Math.PI / 2) * 1.9) : 0;
      const value = 248 + noise * (woven ? 5 : 3) + weave;
      image.data[i] = value; image.data[i + 1] = value - .5; image.data[i + 2] = value - 1; image.data[i + 3] = 255;
      const height = 128 + noise * (woven ? 12 : 17) + weave * 5;
      relief.data[i] = relief.data[i + 1] = relief.data[i + 2] = height; relief.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0); bc.putImageData(relief, 0, 0);
    return {map: texture(canvas, true, true), bumpMap: texture(bump, false, true)};
  }
  const plaster = neutralSurface(76513), linen = neutralSurface(96411, true);

  const palettes = [
    {base:'#e7d3d6', stripe:'#c49da9', ink:'#738ba6', stitch:'#f8f0e7'},
    {base:'#d3ddea', stripe:'#acb9cc', ink:'#ac747e', stitch:'#f7efdf'},
    {base:'#e6e0d7', stripe:'#b7aaa2', ink:'#78828f', stitch:'#fff8ed'},
    {base:'#b496b4', stripe:'#8f769f', ink:'#f9f0e0', stitch:'#f6e9db'},
    {base:'#ede0d9', stripe:'#d0b1aa', ink:'#8a7895', stitch:'#faf1df'},
    {base:'#879aaf', stripe:'#637b96', ink:'#f7e9d5', stitch:'#e9d4d8'},
    {base:'#dfd6dd', stripe:'#a89aaa', ink:'#a86e7c', stitch:'#fff6eb'},
    {base:'#e5d5cf', stripe:'#c3a4a0', ink:'#687a91', stitch:'#f3e8db'}
  ];
  const bannerCache = new Map();
  function banner(char, index = 0) {
    const cacheKey = char + ':' + index;
    if (bannerCache.has(cacheKey)) return bannerCache.get(cacheKey);
    const canvas = makeCanvas(512, 640), ctx = canvas.getContext('2d');
    const pal = palettes[mod(index, palettes.length)], rnd = random(9763 + index * 701);
    ctx.fillStyle = pal.base; ctx.fillRect(0, 0, 512, 640);
    ctx.save(); ctx.globalAlpha = .5;
    if (index % 4 === 0) {
      ctx.fillStyle = pal.stripe;
      for (let x = 0; x < 512; x += 40) ctx.fillRect(x, 0, 18, 640);
      for (let y = 0; y < 640; y += 40) ctx.fillRect(0, y, 512, 18);
    } else if (index % 4 === 1) {
      ctx.strokeStyle = pal.stripe; ctx.lineWidth = 2;
      for (let x = 5; x < 512; x += 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 640); ctx.stroke(); }
    } else if (index % 4 === 2) {
      ctx.fillStyle = pal.stripe;
      for (let y = 12; y < 640; y += 28) for (let x = 12; x < 512; x += 28) {
        ctx.beginPath(); ctx.arc(x + (y % 56 ? 8 : 0), y, 2.4, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.strokeStyle = pal.stripe; ctx.lineWidth = 1.5;
      for (let k = -640; k < 512; k += 16) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + 640, 640); ctx.stroke(); }
    }
    ctx.restore();
    // Applied fabric letter: generous footprint, soft edge shadow and tiny stitches.
    ctx.save(); ctx.translate(256, 329); ctx.rotate((rnd() - .5) * .065);
    ctx.font = '900 590px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const glyph = ctx.measureText(char);
    const ascent = glyph.actualBoundingBoxAscent || 425, descent = glyph.actualBoundingBoxDescent || 0;
    const glyphBaseline = (ascent - descent) / 2;
    ctx.scale(Math.min(1, 424 / glyph.width), Math.min(1.25, 480 / (ascent + descent)));
    ctx.shadowColor = '#6e5b6840'; ctx.shadowBlur = 3; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 4;
    ctx.fillStyle = pal.ink; ctx.fillText(char, 0, glyphBaseline);
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = pal.stitch; ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 6]); ctx.globalAlpha = .6; ctx.strokeText(char, 0, glyphBaseline); ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'source-atop';
    // Fine drawn thread across the appliqué, kept faint for legibility.
    ctx.globalAlpha = .12; ctx.strokeStyle = '#fff8ef'; ctx.lineWidth = .65;
    for (let y = -260; y < 270; y += 5) { ctx.beginPath(); ctx.moveTo(-260, y); ctx.lineTo(260, y + .8); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = pal.stitch; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]);
    ctx.strokeRect(15, 15, 482, 610); ctx.setLineDash([]);
    ctx.strokeStyle = '#75667821'; ctx.lineWidth = 1; ctx.strokeRect(8, 8, 496, 624);
    // Linen weave and slightly irregular frayed hems.
    for (let y = 0; y < 640; y += 3) { ctx.strokeStyle = y % 2 ? '#fff9ef13' : '#665b6b0b'; ctx.lineWidth = .45; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
    ctx.strokeStyle = '#f5ebdf7a'; ctx.lineWidth = .7;
    for (let x = 3; x < 512; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + rnd() * 2, 4 + rnd() * 5); ctx.moveTo(x, 640); ctx.lineTo(x - rnd() * 2, 632 - rnd() * 5); ctx.stroke(); }
    const map = texture(canvas); bannerCache.set(cacheKey, map); return map;
  }

  const windowCanvas = makeCanvas(1024, 1280), wc = windowCanvas.getContext('2d'), wr = random(81043);
  const sky = wc.createLinearGradient(0, 0, 0, 1280);
  sky.addColorStop(0, '#cddce6'); sky.addColorStop(.46, '#f4ede7'); sky.addColorStop(.68, '#e8e9dc'); sky.addColorStop(1, '#b3bfaf');
  wc.fillStyle = sky; wc.fillRect(0, 0, 1024, 1280);
  wc.filter = 'blur(20px)';
  for (let i = 0; i < 32; i++) {
    wc.fillStyle = ['#d5ddc5b0','#bfcdbdb0','#dbe3d5c0','#acbdafb0','#e8e2d2b0'][i % 5];
    const x = wr() * 1150 - 60, y = 580 + wr() * 600, radius = 80 + wr() * 125;
    wc.beginPath(); wc.ellipse(x, y, radius * .7, radius, wr(), 0, 6.29); wc.fill();
  }
  wc.filter = 'none'; wc.globalAlpha = .24; wc.strokeStyle = '#829285'; wc.lineWidth = 8;
  for (let i = 0; i < 7; i++) { const x = -40 + i * 180; wc.beginPath(); wc.moveTo(x, 1280); wc.bezierCurveTo(x + 30, 1100, x - 25, 990, x + 18, 720); wc.stroke(); }
  wc.globalAlpha = .6;
  for (let i = 0; i < 170; i++) {
    const x = wr() * 1024, y = 680 + wr() * 590, radius = 4 + wr() * 19;
    wc.fillStyle = ['#f3eee6','#e3d8dc','#c7d7c3','#d9e2cf','#a5baa9'][i % 5];
    wc.beginPath(); wc.ellipse(x, y, radius, radius * .65, wr() * 3, 0, 6.29); wc.fill();
  }
  wc.globalAlpha = 1;
  const haze = wc.createLinearGradient(0, 0, 1024, 0); haze.addColorStop(0, '#fff5e700'); haze.addColorStop(.4, '#fff5e759'); haze.addColorStop(.7, '#fff5e710'); haze.addColorStop(1, '#fff5e700');
  wc.fillStyle = haze; wc.fillRect(0, 0, 1024, 1280);
  const windowArt = texture(windowCanvas);

  const photoCanvas = makeCanvas(640, 480), ph = photoCanvas.getContext('2d'), pr = random(39487);
  const glow = ph.createLinearGradient(0, 0, 0, 480); glow.addColorStop(0, '#c8cbdc'); glow.addColorStop(.5, '#e8c8cb'); glow.addColorStop(.65, '#d9c7c0'); glow.addColorStop(1, '#b6c9d1');
  ph.fillStyle = glow; ph.fillRect(0, 0, 640, 480);
  ph.fillStyle = '#f7e1ca'; ph.beginPath(); ph.arc(438, 188, 37, 0, 6.29); ph.fill();
  ph.fillStyle = '#aaa7b6'; ph.beginPath(); ph.moveTo(0, 290); ph.bezierCurveTo(100, 245, 153, 273, 230, 282); ph.bezierCurveTo(320, 296, 385, 275, 640, 300); ph.lineTo(640, 340); ph.lineTo(0, 340); ph.fill();
  ph.fillStyle = '#c0ced2'; ph.fillRect(0, 317, 640, 163);
  for (let i = 0; i < 95; i++) { ph.fillStyle = ['#f3ddd16b','#e3e0db6b','#a4bac75a'][i % 3]; ph.fillRect(pr() * 640, 325 + pr() * 150, 5 + pr() * 80, .6 + pr() * 1.3); }
  ph.fillStyle = '#d4c2bc'; ph.beginPath(); ph.moveTo(0, 455); ph.bezierCurveTo(130, 398, 160, 432, 300, 480); ph.lineTo(0, 480); ph.fill();
  const photoArt = texture(photoCanvas);

  return {floor, plaster, linen, banner, windowArt, photoArt};
}


// European birthday salon: warm sculpted plaster, sewn linen and drawn ironwork.
const roomTextures=createRoomTextures(THREE);
renderer.toneMappingExposure=1.23; renderer.shadowMap.type=THREE.PCFShadowMap;
// Indirect bounce plus two architectural light sources, identical in overview and inside.
scene.add(new THREE.HemisphereLight('#fff7eb','#ead8cd',2.25));
const warm=new THREE.SpotLight('#fff0df',75,14,1.36,1,2);warm.position.set(0,4.23,.8);warm.target.position.set(0,0,.8);warm.castShadow=true;warm.shadow.mapSize.set(2048,2048);warm.shadow.bias=-.00015;warm.shadow.normalBias=.025;warm.shadow.radius=6;scene.add(warm,warm.target);
const windowLight=new THREE.SpotLight('#fff5e9',44,13,1.02,1,2);windowLight.position.set(-4.18,3.05,-1.2);windowLight.target.position.set(1.1,.65,-1.2);windowLight.castShadow=true;windowLight.shadow.mapSize.set(2048,2048);windowLight.shadow.bias=-.00015;windowLight.shadow.normalBias=.025;windowLight.shadow.radius=8;scene.add(windowLight,windowLight.target);
// Low-level diffuse light across the window aperture approximates a broad luminous window.
for(const z of [-2.1,-.3]){const bounce=new THREE.PointLight('#fff4e7',3.5,9,2);bounce.position.set(-3.65,2.6,z);scene.add(bounce)}
const mats=new Map(),geos=new Map();
function mat(c,kind='paint'){const key=c+kind;if(!mats.has(key)){let options={color:c,roughness:.76,metalness:0};if(kind==='metal')options={color:c,roughness:.37,metalness:.55};if(kind==='cloth')options={color:c,roughness:1,map:roomTextures.linen.map,bumpMap:roomTextures.linen.bumpMap,bumpScale:.009};if(kind==='plaster')options={color:c,roughness:.94,map:roomTextures.plaster.map,bumpMap:roomTextures.plaster.bumpMap,bumpScale:.012};if(kind==='porcelain')options={color:c,roughness:.27,metalness:.05};mats.set(key,new THREE.MeshStandardMaterial(options))}return mats.get(key)}
const P={wall:'#f1e5df',trim:'#fbf1e8',shadow:'#d8c1c2',iron:'#78646d',ironLight:'#cfb6b2',blue:'#bfd1dd',rose:'#e3b9c2',lilac:'#d3c3d3',cream:'#f6dccd',gold:'#c29a78',wood:'#aa7f6e'};
function mesh(geo,c,x=0,y=0,z=0,parent=scene,kind='paint'){const m=new THREE.Mesh(geo,typeof c==='string'?mat(c,kind):c);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function box(w,h,d,c,x=0,y=0,z=0,p=scene,kind='paint'){return mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,p,kind)}
function sphereGeo(r){const k='sphere'+r;if(!geos.has(k))geos.set(k,new THREE.SphereGeometry(r,20,14));return geos.get(k)}
function ball(r,c,x=0,y=0,z=0,p=scene,kind='paint'){return mesh(sphereGeo(r),c,x,y,z,p,kind)}
function cylinder(rt,rb,h,c,x=0,y=0,z=0,p=scene,kind='paint'){return mesh(new THREE.CylinderGeometry(rt,rb,h,40),c,x,y,z,p,kind)}
function group(x=0,y=0,z=0,p=scene){const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g}
function rounded(w,h,d,r,c,x,y,z,p=scene,kind='paint'){r=Math.min(r,w/2-.001,h/2-.001,d/2-.001);const s=new THREE.Shape(),a=-w/2+r,b=-h/2+r,W=w-2*r,H=h-2*r;s.moveTo(a,b);s.lineTo(a+W,b);s.lineTo(a+W,b+H);s.lineTo(a,b+H);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,steps:1,curveSegments:8});geo.translate(0,0,-d/2+r);return mesh(geo,c,x,y,z,p,kind)}
function tube(points,r,c,p=scene,closed=false){const curve=new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a)),closed,'catmullrom',.4);return mesh(new THREE.TubeGeometry(curve,Math.max(24,points.length*6),r,6,closed),c,0,0,0,p)}
function ringDots(n,r,y,size,c,p,centerZ=0){const inst=new THREE.InstancedMesh(sphereGeo(size),mat(c,'porcelain'),n),dummy=new THREE.Object3D();for(let i=0;i<n;i++){const a=i/n*Math.PI*2;dummy.position.set(Math.cos(a)*r,y,centerZ+Math.sin(a)*r);dummy.scale.set(1,.78,1);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)}inst.castShadow=true;inst.receiveShadow=true;p.add(inst);return inst}
function rectTrim(w,h,c,x,y,z,p=scene,width=.035,depth=.028){box(w,width,depth,c,x,y-h/2,z,p);box(w,width,depth,c,x,y+h/2,z,p);box(width,h,depth,c,x-w/2,y,z,p);box(width,h,depth,c,x+w/2,y,z,p)}
// Ground contact gradients make feet and heavy furniture sit on the floor.
const aoCanvas=document.createElement('canvas');aoCanvas.width=aoCanvas.height=128;const ac=aoCanvas.getContext('2d'),ag=ac.createRadialGradient(64,64,5,64,64,64);ag.addColorStop(0,'rgba(92,58,55,.3)');ag.addColorStop(.45,'rgba(92,58,55,.13)');ag.addColorStop(1,'rgba(92,58,55,0)');ac.fillStyle=ag;ac.fillRect(0,0,128,128);const aoTexture=new THREE.CanvasTexture(aoCanvas);
function contact(x,z,w,d,opacity=.5,y=.025){const s=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:aoTexture,transparent:true,opacity,depthWrite:false}));s.rotation.x=-Math.PI/2;s.position.set(x,y,z);scene.add(s)}
rounded(8.24,.25,8.24,.06,'#c9aa9a',0,-.15,0);box(8.1,.055,8.1,'#ead6cc',0,-.015,0);
const floorMat=new THREE.MeshStandardMaterial({color:'#f4ddd0',map:roomTextures.floor.map,bumpMap:roomTextures.floor.bumpMap,bumpScale:.014,roughness:.64,roughnessMap:roomTextures.floor.roughnessMap});
const floor=mesh(new THREE.PlaneGeometry(8,8),floorMat,0,.018,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
// Moulded walls with a real window opening on the left side.
box(8.15,4.45,.18,P.wall,0,2.2,-4,scene,'plaster');
const leftWall=group(-4,0,0);leftWall.rotation.y=Math.PI/2;
box(8,1.2,.18,P.wall,0,.6,0,leftWall,'plaster');box(8,.5,.18,P.wall,0,4.2,0,leftWall,'plaster');box(3.7,2.75,.18,P.wall,-2.15,2.575,0,leftWall,'plaster');box(1.3,2.75,.18,P.wall,3.35,2.575,0,leftWall,'plaster');
function wallDetails(p,door=false){for(const [y,w,h,d] of [[.1,8,.16,.13],[.23,8,.04,.1],[1.14,8,.06,.1],[1.22,8,.07,.14],[4.12,8,.07,.14],[4.22,8,.09,.2],[4.34,8,.12,.26]]){if(door&&y<3){for(const x of [-2.46,2.46])box(3.08,h,d,P.trim,x,y,.13,p)}else box(w,h,d,P.trim,0,y,.13,p)}for(let x=-3.48;x<4;x+=1.16){if(door&&Math.abs(x)<1.5)continue;rectTrim(1,.7,P.shadow,x,.67,.109,p,.035,.018);rectTrim(.91,.61,P.trim,x,.67,.134,p,.027,.025)}}
const backDecor=group(0,0,-3.91);wallDetails(backDecor);wallDetails(leftWall);
for(const x of [-3.4,3.4]){rectTrim(.83,2.46,P.trim,x,2.7,.12,backDecor,.043,.04);rectTrim(.7,2.33,P.shadow,x,2.7,.095,backDecor,.018,.015)}
// Hidden return walls and ceiling for the first-person experience.
const frontWalls=group();let entryWall;for(const angle of [Math.PI,-Math.PI/2]){const isEntry=angle===Math.PI;const w=group(isEntry?0:4,0,isEntry?4:0,frontWalls);w.rotation.y=angle;const wall=box(8,4.45,.18,P.wall,0,2.2,0,w,'plaster');wall.castShadow=false;wallDetails(w,isEntry);for(let x=-2.8;x<4;x+=1.85){if(isEntry&&Math.abs(x)<1.7)continue;rectTrim(1.5,2.45,P.trim,x,2.68,.13,w,.04,.035)}if(isEntry)entryWall=w}frontWalls.visible=false;
// Closed decorative entry door, visible when the recipient turns around.
const entryDoor=group(0,0,.17,entryWall);entryDoor.name='paneled-entry-door';
rounded(1.76,3.25,.055,.018,'#b6a298',0,1.655,0,entryDoor);
rounded(1.62,3.12,.085,.028,'#e6d4c8',0,1.64,.043,entryDoor,'paint');
for(const x of [-.91,.91]){box(.16,3.4,.16,P.trim,x,1.7,.035,entryDoor);box(.044,3.3,.025,'#d8bba5',x,1.68,.129,entryDoor)}
rounded(2.02,.17,.23,.025,P.trim,0,3.4,.035,entryDoor);rounded(2.12,.065,.28,.018,P.trim,0,3.51,.04,entryDoor);
for(const [y,h] of [[.72,.9],[2.17,1.53]]){rounded(1.3,h,.028,.035,'#ddc6b8',0,y,.096,entryDoor);rectTrim(1.3,h,P.trim,0,y,.12,entryDoor,.04,.025);rectTrim(1.18,h-.12,'#cfb39f',0,y,.122,entryDoor,.012,.012)}
rounded(.1,.24,.025,.03,P.gold,.6,1.48,.12,entryDoor,'metal');ball(.035,P.gold,.6,1.51,.17,entryDoor,'metal');tube([[.6,1.51,.18],[.52,1.51,.2],[.42,1.49,.2]],.018,P.gold,entryDoor);box(1.74,.035,.23,'#c3a48a',0,.048,.045,entryDoor);
const ceiling=group(0,4.44,0);const ceilingSlab=box(8,.13,8,'#f8eee8',0,0,0,ceiling,'plaster');ceilingSlab.castShadow=false;for(const a of [0,Math.PI/2]){const g=group(0,-.1,0,ceiling);g.rotation.y=a;for(const z of [-3.75,3.75])box(7.55,.08,.12,P.trim,0,0,z,g)}cylinder(.42,.38,.06,P.trim,0,-.11,.8,ceiling);ceiling.visible=false;
// The large French window, a translucent garden view and gathered curtains.
const win=group(1.2,0,.15,leftWall);const outside=new THREE.Mesh(new THREE.PlaneGeometry(3,2.75),new THREE.MeshBasicMaterial({map:roomTextures.windowArt,color:'#fff1df'}));outside.position.set(0,2.575,-.24);win.add(outside);
for(const x of [-1.53,0,1.53])box(x===0?.055:.14,2.84,.15,P.trim,x,2.58,0,win);for(const y of [1.18,2.45,3.96])box(3.14,.1,.15,P.trim,0,y,0,win);box(3.34,.12,.38,P.trim,0,1.15,.12,win);rectTrim(3.24,2.93,'#c9bdce',0,2.57,-.035,win,.055,.035);
function curtainPanel(parent,cx,topY,width,height,color,side=1,z=.2){const geo=new THREE.PlaneGeometry(width,height,32,36),pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const u=pos.getX(i)/width+.5,v=.5-pos.getY(i)/height;const gathered=1-.46*Math.exp(-Math.pow((v-.62)*4,2));pos.setX(i,cx+(u-.5)*width*gathered+side*.13*Math.sin(v*Math.PI));pos.setY(i,topY-v*height-.025*Math.sin(u*19));pos.setZ(i,z+.075*Math.sin(u*Math.PI*10)+.025*Math.sin(u*Math.PI*24+v*2)+.06*v*v)}geo.computeVertexNormals();const material=mat(color,'cloth').clone();material.side=THREE.DoubleSide;const m=mesh(geo,material,0,0,0,parent);m.castShadow=true;return m}
function swag(parent,x,y,z,w,h,color){const g=new THREE.PlaneGeometry(w,h,48,16),p=g.attributes.position;for(let i=0;i<p.count;i++){const u=p.getX(i)/w+.5,v=.5-p.getY(i)/h;p.setX(i,x+(u-.5)*w);p.setY(i,y-Math.sin(u*Math.PI)*(h*.5+v*h*.5));p.setZ(i,z+.025*Math.sin(v*Math.PI*14)+.045*Math.sin(u*Math.PI))}g.computeVertexNormals();const m=mat(color,'cloth').clone();m.side=THREE.DoubleSide;return mesh(g,m,0,0,0,parent)}
for(const side of [-1,1]){
 curtainPanel(win,side*1.4,3.96,.65,3.78,P.blue,side,.25);
 // Wrap around the gathered fabric in the horizontal plane, clear of its folds.
 const cx=side*1.521,wrap=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2;wrap.push([cx+.215*Math.cos(a),1.62-.025*Math.sin(a),.30+.15*Math.sin(a)])}tube(wrap,.012,'#c6b4bc',win,true);
 ball(.025,'#ba9fab',cx,1.595,.455,win);tube([[cx,1.595,.455],[cx+side*.045,1.42,.46],[cx+side*.025,1.27,.47]],.011,'#ba9fab',win);
 cylinder(.018,.03,.09,'#c6b4bc',cx+side*.025,1.235,.47,win,'cloth');
}swag(win,0,3.96,.28,2.7,.55,'#c5ccdf');tube([[-1.8,4.02,.2],[0,4.04,.2],[1.8,4.02,.2]],.025,P.iron,win);
// A sculptural mantel: scalloped arch, mouldings, flutes and carved scrolls.
const hearth=group(0,0,-3.6);contact(0,-3.37,2.7,1,.75);
rounded(2.48,.12,.75,.035,'#ded3dd',0,.08,.12,hearth);box(1.54,1.24,.07,'#a799ac',0,.72,.17,hearth);const recess=new THREE.Mesh(new THREE.PlaneGeometry(1.48,1.2),new THREE.MeshStandardMaterial({color:'#c7bdcf',roughness:1}));recess.position.set(0,.73,.22);hearth.add(recess);
curtainPanel(hearth,0,1.42,1.5,1.25,'#c4c9df',1,.27);
for(const x of [-.96,.96]){rounded(.32,1.42,.46,.025,P.trim,x,.84,.1,hearth,'plaster');rounded(.43,.17,.55,.015,'#f0ded4',x,.22,.12,hearth);rounded(.41,.17,.53,.018,P.trim,x,1.48,.1,hearth);for(let k=-2;k<=2;k++)box(.013,1.04,.02,'#dec8c4',x+k*.043,.85,.34,hearth)}
const arch=new THREE.Shape();arch.moveTo(-1.12,1.64);arch.lineTo(1.12,1.64);arch.lineTo(1.12,1.24);arch.bezierCurveTo(.9,1.26,.9,1.3,.72,1.32);arch.bezierCurveTo(.42,1.31,.36,1.51,0,1.43);arch.bezierCurveTo(-.36,1.51,-.42,1.31,-.72,1.32);arch.bezierCurveTo(-.9,1.3,-.9,1.26,-1.12,1.24);arch.closePath();mesh(new THREE.ExtrudeGeometry(arch,{depth:.16,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:3,steps:1}),P.trim,0,0,.18,hearth,'plaster');
rounded(2.46,.13,.64,.025,P.trim,0,1.69,.14,hearth);rounded(2.35,.055,.58,.012,'#d8cddc',0,1.59,.12,hearth);
function flourish(p,x,y,z,scale=1,c=P.shadow){for(const sign of [-1,1]){const pts=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2.2,r=.22*(1-i/30);pts.push([x+sign*(.07+Math.cos(a)*r)*scale,y+Math.sin(a)*r*.48*scale,z])}tube(pts,.012*scale,c,p)}const drop=ball(.055*scale,c,x,y-.035*scale,z,p);drop.scale.set(.65,1.45,.4)}
flourish(hearth,0,1.51,.39,1.1,'#bfb0c8');flourish(backDecor,0,4.04,.2,1.4,'#c6b7cd');
// The birthday wall uses actual cloth meshes and textured appliqué letters.
const banner=group(0,0,-3.64);const clothRows=[['HAPPY',3.68,.64],['BIRTHDAY',2.91,.55]];
clothRows.forEach(([word,y,w],row)=>{const gap=.065,total=word.length*(w+gap)-gap;const linePts=[];for(let i=0;i<=24;i++){const t=i/24;linePts.push([(t-.5)*(total+.3),y+.25-.16*Math.sin(t*Math.PI),.02])}tube(linePts,.009,'#bcacb7',banner);[...word].forEach((ch,i)=>{const x=(i-(word.length-1)/2)*(w+gap),yy=y-.13*Math.cos(x/total*Math.PI),h=.68;const geo=new THREE.PlaneGeometry(w,h,14,18),a=geo.attributes.position;for(let k=0;k<a.count;k++){const u=a.getX(k)/w+.5,v=.5-a.getY(k)/h;a.setZ(k,.025*Math.sin(u*12+row)+.02*v*Math.sin(v*8+i));a.setY(k,a.getY(k)+.012*Math.sin(u*16+i)*v)}geo.computeVertexNormals();const fabric=new THREE.MeshStandardMaterial({map:roomTextures.banner(ch,i+row*5),roughness:1,side:THREE.DoubleSide,bumpMap:roomTextures.linen.bumpMap,bumpScale:.006});const m=mesh(geo,fabric,x,yy,.07,banner);m.rotation.z=Math.sin(i*2.4+row)*.07;for(const side of [-1,1])rounded(.025,.09,.032,.007,'#d1b6b5',x+side*w*.37,yy+h/2-.025,.1,banner)})});
// Small drapes frame the wall, leaving the letters and carving readable.
for(const side of [-1,1]){curtainPanel(backDecor,side*2.42,4.04,.62,2.14,side<0?'#d8bacb':'#bac5db',side,.18);tube([[side*2.1,4.03,.28],[side*2.4,3.93,.35],[side*2.72,4.02,.28]],.012,'#9c8b9f',backDecor)}
// Hand-drawn scroll candelabra, with fine asymmetric metal curves.
const fireplaceLights=[];
function candelabra(x,y,z,scale=1,parent=scene){const g=group(x,y,z,parent);g.scale.setScalar(scale);cylinder(.12,.17,.045,P.ironLight,0,.03,0,g,'metal');tube([[0,.03,0],[.025,.25,0],[-.018,.55,0],[0,.85,0]],.018,P.iron,g);for(const side of [-1,1])tube([[0,.35,0],[side*.14,.24,0],[side*.33,.34,0],[side*.3,.6,0],[side*.22,.65,0]],.015,P.iron,g);for(const [xx,yy] of [[0,.85],[-.22,.65],[.22,.65]]){cylinder(.065,.04,.035,P.ironLight,xx,yy,0,g,'metal');cylinder(.019,.023,.25,'#f2e7df',xx,yy+.14,0,g);const flameMat=new THREE.MeshStandardMaterial({color:'#fff0c8',emissive:'#ff9c4b',emissiveIntensity:2.8,roughness:.22});const f=ball(.024,flameMat,xx,yy+.28,0,g);f.scale.y=1.75}const glow=new THREE.PointLight('#ffbf79',2.6,2.35,2);glow.position.set(0,1.06,.24);g.add(glow);fireplaceLights.push(glow);return g}
candelabra(-.83,1.77,-3.42,.65);candelabra(.82,1.77,-3.42,.65);
// Tailored upholstery: planar cushion faces, rounded corners and sewn piping.
function cushion(w,h,d,c,x,y,z,parent){const geo=new THREE.SphereGeometry(1,32,24),p=geo.attributes.position;const curve=v=>Math.sign(v)*Math.pow(Math.abs(v),.38);for(let i=0;i<p.count;i++)p.setXYZ(i,curve(p.getX(i))*w/2,curve(p.getY(i))*h/2,curve(p.getZ(i))*d/2);geo.computeVertexNormals();return mesh(geo,c,x,y,z,parent,'cloth')}
function cushionSeam(w,d,y,x,z,parent,c='#b68f99'){const points=[];for(let i=0;i<64;i++){const a=i/64*Math.PI*2;points.push([x+Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.32)*w/2,y,z+Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.32)*d/2])}return tube(points,.007,c,parent,true)}
const sofa=group(-3.03,0,.68);
// Carved cabriole legs and a bowed lower rail keep the seat visually light.
for(const z of [-1.05,1.05])for(const x of [-.3,.3])tube([[x,.42,z],[x*1.08,.27,z*1.03],[x*1.18,.08,z*1.08],[x*1.32,.055,z*1.09]],.035,P.wood,sofa);
tube([[-.38,.35,-1.1],[-.34,.28,0],[-.38,.35,1.1]],.03,P.wood,sofa);
function plush(x,y,z,sx,sy,sz,c,p=scene){const m=mesh(new THREE.SphereGeometry(1,28,20),c,x,y,z,p,'cloth');m.scale.set(sx,sy,sz);return m}
function capsule(radius,length,c,x,y,z,p=scene,rotationX=0){const m=mesh(new THREE.CapsuleGeometry(radius,length,8,20),c,x,y,z,p,'cloth');m.rotation.x=rotationX;return m}
const seat=capsule(.31,2.02,'#d9bdc5',.02,.57,0,sofa,Math.PI/2);seat.scale.x=1.42;seat.scale.y=.88;
const backShell=capsule(.3,1.94,'#cdaeb9',-.48,1.04,0,sofa,Math.PI/2);backShell.scale.x=.78;backShell.scale.z=1.3;
for(const [z,tilt] of [[-.56,-.04],[.56,.04]]){const back=plush(-.32,1.1,z,.34,.48,.55,'#d9bdc5',sofa);back.rotation.x=tilt;back.rotation.z=-.06}
for(const [z,c] of [[-.57,'#edd5d2'],[.57,'#e4c7cc']]){const pad=plush(.13,.72,z,.4,.14,.59,c,sofa);pad.rotation.z=-.03}
for(const z of [-1.24,1.24]){const arm=plush(.04,.84,z,.5,.29,.23,'#e0c4ca',sofa);arm.rotation.z=-.08;const roll=capsule(.16,.39,'#e8cfd2',.07,.94,z,sofa,Math.PI/2);roll.scale.x=1.4}
tube([[-.52,.64,-1.2],[-.58,1.35,-1.03],[-.61,1.53,0],[-.58,1.35,1.03],[-.52,.64,1.2]],.019,'#a88691',sofa);
for(const z of [-.58,.58]){ball(.025,'#a98291',-.7,1.12,z,sofa);ball(.018,'#f1d8d8',-.68,.94,z,sofa)}
for(const [z,c] of [[-.78,'#bed0db'],[.78,'#efc7c7']]){const pillow=plush(-.1,1.04,z,.2,.34,.38,c,sofa);pillow.rotation.z=-.18}
rounded(.86,.1,2.33,.035,'#cba88c',-.02,.39,0,sofa,'paint');
contact(-3.03,.68,1.7,3,.52);
// Restore the previous slender painted consoles for the camera and record player.
function table(x,z,w=1.25,d=.7,h=.9,c='#e1c9c8'){const g=group(x,0,z);rounded(w,.09,d,.035,c,0,h,0,g);rounded(w*.94,.19,d*.87,.025,'#ead5d0',0,h-.13,0,g);for(const xx of [-w*.39,w*.39])for(const zz of [-d*.3,d*.3])tube([[xx,h-.2,zz],[xx*1.04,h*.54,zz],[xx*1.16,.18,zz*1.18],[xx*1.22,.07,zz*1.22]],.032,P.iron,g);for(const zz of [-d*.46,d*.46])tube([[-w*.45,h-.07,zz],[0,h-.1,zz],[w*.45,h-.07,zz]],.008,'#9b7880',g);flourish(g,0,h-.16,d*.45,.42,'#a87d88');contact(x,z,w*1.2,d*1.5,.4);return g}
const cameraTable=table(-2.5,-2.5,1.2,.7,1.05),recordTable=table(2.7,-2.3,1.45,.82,.95);
// Telephone: round ivory pedestal table with a turned stem and three swept feet.
const phoneTable=group(2.8,0,1.55);phoneTable.name='telephone-pedestal';
cylinder(.49,.47,.07,'#f7ebdb',0,.89,0,phoneTable,'porcelain');cylinder(.45,.45,.045,'#d9baa4',0,.834,0,phoneTable);
mesh(new THREE.LatheGeometry([new THREE.Vector2(.13,.13),new THREE.Vector2(.16,.2),new THREE.Vector2(.09,.3),new THREE.Vector2(.065,.57),new THREE.Vector2(.13,.72),new THREE.Vector2(.15,.82)],32),'#dfcbb9',0,0,0,phoneTable);
for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const c=Math.cos(a),s=Math.sin(a);tube([[0,.22,0],[c*.19,.12,s*.19],[c*.38,.07,s*.38]],.041,'#d4b69e',phoneTable)}contact(2.8,1.55,1.12,1.12,.4);
const cam=group(-2.5,1.265,-2.5);rounded(.52,.31,.24,.035,'#cbb9ce',0,0,0,cam);rounded(.49,.08,.25,.02,'#eee2e8',0,.15,0,cam);const lens=cylinder(.12,.12,.14,'#716476',.04,0,.18,cam);lens.rotation.x=Math.PI/2;const lensGlass=cylinder(.08,.08,.15,'#858ba2',.04,0,.18,cam,'porcelain');lensGlass.rotation.x=Math.PI/2;rounded(.1,.05,.065,.012,P.gold,.16,.22,0,cam);box(.08,.045,.012,'#ddd2e0',-.16,.07,.135,cam);tube([[-.26,0,0],[-.34,-.12,.22],[-.22,-.15,.32],[.16,-.15,.32],[.3,-.1,.2],[.26,0,0]],.012,'#9f8fa6',cam);
const record=group(2.7,1.06,-2.3);rounded(.96,.14,.65,.035,'#bd9eaf',0,0,0,record);rounded(.93,.45,.06,.02,'#d4b9c9',0,.27,-.3,record).rotation.x=-.1;cylinder(.235,.235,.024,'#514756',-.12,.09,.015,record);for(let r=.1;r<.23;r+=.025){const t=mesh(new THREE.TorusGeometry(r,.002,4,48),'#76677c',-.12,.106,.015,record);t.rotation.x=Math.PI/2}cylinder(.063,.063,.03,'#d6bccd',-.12,.1,.015,record);tube([[.33,.1,-.22],[.34,.2,-.12],[.12,.2,.15]],.013,P.gold,record);box(.08,.035,.05,P.iron,.12,.18,.15,record);
const recordArtwork=new THREE.Mesh(new THREE.CircleGeometry(.218,64),new THREE.MeshStandardMaterial({color:'#e7cbd3',roughness:.65}));recordArtwork.position.set(-.12,.126,.015);recordArtwork.rotation.x=-Math.PI/2;record.add(recordArtwork);const spindle=cylinder(.011,.011,.025,P.gold,-.12,.142,.015,record);
let albumGeneration=0;function updateAlbum(){const generation=++albumGeneration;if(!card.albumCover){recordArtwork.material.map?.dispose();recordArtwork.material.map=null;recordArtwork.material.color.set('#e7cbd3');recordArtwork.material.needsUpdate=true;return}new THREE.TextureLoader().load(card.albumCover,tx=>{if(generation!==albumGeneration){tx.dispose();return}tx.colorSpace=THREE.SRGBColorSpace;recordArtwork.material.map?.dispose();recordArtwork.material.map=tx;recordArtwork.material.color.set('#ffffff');recordArtwork.material.needsUpdate=true})}
// A seated rotary telephone: layered shell, supported handset and recessed dial.
const phone=group(2.8,.928,1.55);phone.name='rotary-telephone';
const phoneBody='#b9c3d9',phoneHandle='#a1abc4';
function phoneOval(rx,ry,rz,c,x,y,z){const m=mesh(new THREE.SphereGeometry(1,48,32),c,x,y,z,phone,'porcelain');m.scale.set(rx,ry,rz);return m}
phoneOval(.315,.035,.235,'#8994ad',0,.036,0);
phoneOval(.322,.09,.238,phoneBody,0,.092,0);
// The rear cradle joins the body and physically supports both earpieces.
rounded(.43,.10,.12,.025,phoneBody,0,.175,-.105,phone,'porcelain');
for(const x of [-.206,.206]){
 rounded(.062,.115,.08,.014,phoneHandle,x,.216,-.105,phone,'porcelain');
 cylinder(.068,.056,.038,phoneHandle,x,.278,-.105,phone,'porcelain');
 cylinder(.073,.07,.018,P.gold,x,.3,-.105,phone,'metal');
 phoneOval(.075,.052,.073,phoneHandle,x,.337,-.105);
}
const handsetCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.206,.343,-.105),new THREE.Vector3(-.16,.383,-.105),new THREE.Vector3(0,.397,-.105),new THREE.Vector3(.16,.383,-.105),new THREE.Vector3(.206,.343,-.105)]);
mesh(new THREE.TubeGeometry(handsetCurve,64,.036,16,false),phoneHandle,0,0,0,phone,'porcelain');
cylinder(.119,.13,.025,P.gold,0,.187,.07,phone,'metal');
cylinder(.108,.108,.008,'#f1e4d9',0,.204,.07,phone,'porcelain');
for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const x=Math.cos(a)*.084,z=.07+Math.sin(a)*.084;cylinder(.016,.016,.003,'#776a76',x,.21,z,phone);const rim=mesh(new THREE.TorusGeometry(.016,.003,8,20),P.gold,x,.212,z,phone,'metal');rim.rotation.x=-Math.PI/2;}
cylinder(.047,.047,.012,P.gold,0,.216,.07,phone,'metal');cylinder(.039,.039,.014,'#f5e9de',0,.218,.07,phone,'porcelain');
rounded(.047,.009,.019,.003,P.gold,.12,.219,.091,phone,'metal');
const cord=[];for(let i=0;i<=160;i++){const t=i/160;cord.push([.27+.023*Math.cos(t*Math.PI*22),.31-.24*t,-.09+.023*Math.sin(t*Math.PI*22)])}tube([[.235,.335,-.105],[.27,.34,-.09],cord[0]],.007,P.iron,phone);tube(cord,.006,P.iron,phone);tube([cord[160],[.28,.042,-.025],[.24,.056,.015]],.007,P.iron,phone);
contact(2.8,1.55,.72,.57,.65,.926);
// Floating pearl balloons and delicate ribbons in warmer sugared pastels.
const balloons=group(2.65,0,0),balloonMeshes=[],balloonPalette=['#ead5a8','#b9d2df','#e6b9c8'];for(let i=0;i<3;i++){const x=[-.34,0,.34][i],y=[2.15,2.48,2.2][i],z=[.12,-.08,.14][i];const b=ball(.27,new THREE.MeshPhysicalMaterial({color:balloonPalette[i],roughness:.28,metalness:.06,clearcoat:.72,clearcoatRoughness:.3}),x,y,z,balloons);b.scale.y=1.2;b.userData.baseY=y;balloonMeshes.push(b);tube([[x,y-.32,z],[x*.4,1.3,z*.5],[0,.22,0]],.004,'#c3a5aa',balloons);cylinder(.026,0,.038,'#d3b4bc',x,y-.33,z,balloons)}rounded(.33,.24,.33,.025,'#e0c0c7',0,.14,0,balloons);contact(2.65,0,.8,.8,.3);
// A lace rug, gathered tablecloth and a finely piped birthday cake.
const rug=cylinder(1.95,1.95,.018,'#eadbd8',0,.034,.35);rug.scale.z=.84;ringDots(64,1.91,.047,.048,'#faf0ea',scene,.35).scale.z=.84;
contact(0,.35,2.9,2.9,.5,.06);const cakeTable=group(0,0,.35);cylinder(.91,.91,.08,'#dfc4c5',0,.9,0,cakeTable);cylinder(.13,.2,.85,P.ironLight,0,.44,0,cakeTable);
const clothGeo=new THREE.CylinderGeometry(.92,1.02,.77,112,26,true);const cp=clothGeo.attributes.position;for(let i=0;i<cp.count;i++){const y=cp.getY(i),v=(.385-y)/.77,theta=Math.atan2(cp.getZ(i),cp.getX(i));const r=.925+.09*v+.027*Math.sin(theta*30)*v+.018*Math.sin(theta*17)*v;cp.setX(i,Math.cos(theta)*r);cp.setZ(i,Math.sin(theta)*r);cp.setY(i,y+.016*Math.sin(theta*18)*v*v)}clothGeo.computeVertexNormals();const skirt=mat('#d8c8d2','cloth').clone();skirt.side=THREE.DoubleSide;mesh(clothGeo,skirt,0,.52,0,cakeTable);cylinder(.925,.925,.025,'#eadbdc',0,.92,0,cakeTable,'cloth');
const hem=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*2;hem.push([Math.cos(a)*(1.015+.027*Math.sin(a*30)),.14+.015*Math.sin(a*18),Math.sin(a)*(1.015+.027*Math.sin(a*30))])}tube(hem,.013,'#e8dfe9',cakeTable);
const topper=cylinder(.77,.77,.014,'#f3e7eb',0,.941,0,cakeTable,'cloth');ringDots(60,.77,.95,.025,'#efe4eb',cakeTable);
cylinder(.48,.5,.055,'#eee4ec',0,.99,0,cakeTable,'porcelain');cylinder(.14,.22,.14,'#e6dae8',0,1.08,0,cakeTable,'porcelain');cylinder(.55,.55,.048,'#f4eaf0',0,1.17,0,cakeTable,'porcelain');ringDots(50,.53,1.195,.026,'#e3d5e6',cakeTable);
// Rounded buttercream tiers, ridged shell borders and fine double-swag piping.
function cakeTier(r,h,bottom,color){const pts=[[0,0],[r-.025,0],[r-.005,.012],[r,.035],[r,h-.035],[r-.008,h-.01],[r-.028,h],[0,h]].map(([x,y])=>new THREE.Vector2(x,y));return mesh(new THREE.LatheGeometry(pts,80),color,0,bottom,0,cakeTable,'paint')}
cakeTier(.44,.31,1.205,'#e8bdc7');cakeTier(.3,.25,1.515,'#fff0dc');
function shellBorder(n,r,y,color){const geo=new THREE.SphereGeometry(1,16,12),a=geo.attributes.position;for(let i=0;i<a.count;i++){const angle=Math.atan2(a.getZ(i),a.getX(i)),ridge=1+.09*Math.cos(angle*8);a.setXYZ(i,a.getX(i)*ridge,a.getY(i),a.getZ(i)*ridge)}geo.computeVertexNormals();const inst=new THREE.InstancedMesh(geo,mat(color),n),d=new THREE.Object3D();for(let i=0;i<n;i++){const angle=i/n*Math.PI*2;d.position.set(Math.cos(angle)*r,y,Math.sin(angle)*r);d.rotation.set(0,-angle,0);d.scale.set(.027,.023,.04);d.updateMatrix();inst.setMatrixAt(i,d.matrix)}inst.castShadow=true;inst.receiveShadow=true;cakeTable.add(inst)}
shellBorder(42,.432,1.225,'#fff1df');shellBorder(42,.424,1.513,'#fff2e3');shellBorder(30,.298,1.534,'#edc6cd');shellBorder(30,.284,1.768,'#fff3df');
for(const [r,y,n,drop] of [[.445,1.45,12,.1],[.304,1.704,9,.075]])for(let i=0;i<n;i++){for(const dy of [0,-.026]){const points=[];for(let j=0;j<=16;j++){const t=j/16,a=(i+t)/n*Math.PI*2;points.push([Math.cos(a)*r,y+dy-drop*Math.sin(t*Math.PI),Math.sin(a)*r])}tube(points,.006,'#fff3e3',cakeTable)}const a=i/n*Math.PI*2;ball(.014,'#fff4e6',Math.cos(a)*r,y+.008,Math.sin(a)*r,cakeTable)}
// Six piped rosettes with hand-shaped strawberry halves and fine seed details.
for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*.22,z=Math.sin(a)*.22;const spiral=[];for(let j=0;j<=48;j++){const t=j/48,b=t*Math.PI*5,r=.047*(1-t)+.006;spiral.push([x+Math.cos(b)*r,1.782+t*.05,z+Math.sin(b)*r])}tube(spiral,.012,'#fff0de',cakeTable);const berry=ball(.032,'#c9797f',x,1.843,z,cakeTable);berry.scale.set(.85,1.25,.9);for(let k=0;k<5;k++){const b=k*Math.PI*2/5;const seed=ball(.0035,'#f4d29a',x+Math.cos(b)*.026,1.841+(k%2)*.014,z+Math.sin(b)*.026,cakeTable);seed.scale.y=1.6}for(let k=0;k<3;k++){const b=k*Math.PI*2/3,leaf=ball(.014,'#a5b08d',x+Math.cos(b)*.014,1.879,z+Math.sin(b)*.014,cakeTable);leaf.scale.set(1,.2,.5)}}
const flames=[];for(let i=-1;i<=1;i++){const x=i*.09;cylinder(.012,.013,.18,i===0?'#e1afa9':'#bbcbd0',x,1.865,0,cakeTable);const stripe=[];for(let j=0;j<=36;j++){const t=j/36,a=t*Math.PI*7;stripe.push([x+Math.cos(a)*.0135,1.78+t*.17,Math.sin(a)*.0135])}tube(stripe,.0025,'#fff4e4',cakeTable);cylinder(.002,.002,.022,'#655052',x,1.964,0,cakeTable);const f=ball(.018,new THREE.MeshBasicMaterial({color:'#ffe2af'}),x,1.994,0,cakeTable);f.scale.y=1.8;flames.push(f)}
// Candle flames are emissive accents; architectural illumination comes from the ceiling and window.
const candlelight=new THREE.PointLight('#ffe3c5',0,3);candlelight.position.set(0,2.02,.35);scene.add(candlelight);
// Wrapped presents with looped ribbons, and a framed memory on the side wall.
for(let i=0;i<3;i++){const x=-1.7+i*.43,z=2.4+(i%2)*.4,h=.3+i*.13;const gift=group(x,0,z);rounded(.46,h,.43,.018,['#c7b6d1','#bcc7df','#e0bdcf'][i],0,h/2,0,gift);box(.055,h+.02,.44,'#eee2e9',0,h/2,0,gift);box(.47,.012,.055,'#eee2e9',0,h+.012,0,gift);for(const side of [-1,1])tube([[0,h+.03,0],[side*.12,h+.13,.025],[side*.18,h+.09,0],[0,h+.03,0]],.018,'#d4a9c1',gift);contact(x,z,.65,.62,.4)}
for(let i=0;i<3;i++)rounded(.28,.052,.26,.008,['#c2b7d0','#dbc3d0','#c4cde0'][i],-2.96,1.132+i*.054,-2.63);
const frame=group(-3.86,2.65,1.8);frame.rotation.y=Math.PI/2;rounded(1.22,.98,.07,.025,'#c3b0c8',0,0,0,frame);rectTrim(1.1,.86,'#e8dce8',0,0,.055,frame,.04,.025);const photoPlane=new THREE.Mesh(new THREE.PlaneGeometry(.96,.72),new THREE.MeshBasicMaterial({map:roomTextures.photoArt,color:'#f4eaf4'}));photoPlane.position.z=.07;frame.add(photoPlane);flourish(frame,0,.56,.04,.8,'#aa91b2');
let photoGeneration=0;function updatePhoto(){const generation=++photoGeneration;if(!card.photo){if(photoPlane.material.map!==roomTextures.photoArt)photoPlane.material.map?.dispose();photoPlane.material.map=roomTextures.photoArt;photoPlane.material.color.set('#f4eaf4');photoPlane.material.needsUpdate=true;return}new THREE.TextureLoader().load(card.photo,tx=>{if(generation!==photoGeneration){tx.dispose();return}tx.colorSpace=THREE.SRGBColorSpace;if(photoPlane.material.map!==roomTextures.photoArt)photoPlane.material.map?.dispose();photoPlane.material.map=tx;photoPlane.material.color.set('#ffffff');photoPlane.material.needsUpdate=true})}updatePhoto();
// A light, sketch-like candle chandelier; thin curls rather than a heavy ring.
const chandelier=group(0,3.44,.8);tube([[0,.93,0],[.015,.62,0],[0,.24,0],[0,-.15,0]],.016,P.iron,chandelier);ball(.08,P.ironLight,0,.17,0,chandelier,'metal');for(let i=0;i<5;i++){const a=i*Math.PI*2/5,c=Math.cos(a),s=Math.sin(a);tube([[0,-.1,0],[c*.25,-.28,s*.25],[c*.54,-.18,s*.54],[c*.58,.04,s*.58],[c*.5,.18,s*.5]],.016,P.iron,chandelier);cylinder(.075,.04,.035,P.ironLight,c*.5,.18,s*.5,chandelier,'metal');cylinder(.019,.021,.2,'#f4e7e9',c*.5,.3,s*.5,chandelier);const flame=ball(.022,new THREE.MeshBasicMaterial({color:'#ffe8c8'}),c*.5,.42,s*.5,chandelier);flame.scale.y=1.65;const crystal=ball(.035,'#e1deee',c*.45,-.27,s*.45,chandelier,'porcelain');crystal.scale.y=1.9}
chandelier.traverse(o=>{if(o.isMesh)o.castShadow=false});chandelier.visible=false;
// A few star ornaments, kept sparse to preserve the room's calm silhouette.
function star(x,y,z,r,parent=scene){const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.43:r;i?shape.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):shape.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}shape.closePath();return mesh(new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false}),P.gold,x,y,z,parent,'metal')}
for(const [x,y,r] of [[-3.2,3.4,.1],[3.35,3.7,.12],[2.94,2.85,.07],[-2.95,2.3,.075]])star(x,y,-3.74,r);


const items=[{key:'memory',name:'照相机',pos:new THREE.Vector3(-2.5,1.48,-2.5),view:[-1.2,1.65,-.8]},{key:'song',name:'唱片机',pos:new THREE.Vector3(2.7,1.4,-2.3),view:[1.15,1.65,-.7]},{key:'wish',name:'气球',pos:new THREE.Vector3(2.65,2.8,0),view:[1.35,1.65,.5]},{key:'secret',name:'电话',pos:new THREE.Vector3(2.8,1.4,1.55),view:[1.3,1.65,2.6]},{key:'cake',name:'生日蛋糕',pos:new THREE.Vector3(0,2.05,.35),view:[0,1.65,2.3]}];
for(const it of items){const b=document.createElement('button');b.className='hotspot';b.textContent=it.name;b.onclick=()=>focusItem(it);$('#hotspots').append(b);it.button=b;const n=document.createElement('button');n.textContent=it.name;n.onclick=()=>focusItem(it);$('#object-nav').append(n);it.nav=n}
function songIsAvailable(){return !!card.songAudio||localExperiencePreview}
function requiredItems(){return items.filter(it=>it.key!=='cake'&&(it.key!=='song'||songIsAvailable()))}
function updateProgress(){const required=requiredItems();for(const it of items){it.button?.classList.toggle('done',seen.has(it.key));it.nav?.classList.toggle('done',seen.has(it.key));if(it.nav)it.nav.hidden=it.key==='song'&&!songIsAvailable();if(it.key==='song'&&!songIsAvailable()&&it.button)it.button.hidden=true}$('#progress').textContent='已经看过 '+required.filter(it=>seen.has(it.key)).length+' / '+required.length;const next=required.find(it=>!seen.has(it.key));const prompts={memory:'先去看看相机吧，里面放了几张照片。',song:'唱片机里，有一首唱给你的歌。',secret:'电话里还有一段话，记得听完。',wish:'气球上写了三件以后想和你一起做的事。'};$('#quest-text').textContent=next?prompts[next.key]:'最后，到蛋糕前许个愿吧。'}
let travel=null;function focusItem(it){if(!started)return;travel={start:inside.position.clone(),end:new THREE.Vector3(...it.view),target:it.pos.clone(),t:0,item:it};}
let objectCleanup=()=>{},recordSpinning=false,objectPreview=false;
function closeObjectMedia(){objectCleanup();objectCleanup=()=>{};recordSpinning=false;document.querySelectorAll('#modal audio').forEach(a=>a.pause())}
function modal(html){closeObjectMedia();$('#modal-body').innerHTML=html;if(!$('#modal').open)$('#modal').showModal()}
$('#close-modal').onclick=()=>$('#modal').close();$('#modal').addEventListener('close',closeObjectMedia);$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close()}});
function keepControl(){const b=document.createElement('button');b.id='keep';b.className='pill dark';b.textContent=objectPreview?'结束预览':'继续去看看别的';b.onclick=()=>$('#modal').close();$('#modal-body').append(b)}
function openItem(it,preview=false){if(!it||(!started&&!preview))return;if(it.key==='song'&&!card.songAudio&&!preview&&!localExperiencePreview)return;objectPreview=preview;if(it.key==='cake'){if(!preview&&requiredItems().some(item=>!seen.has(item.key))){toast('先看看其他小物，再到蛋糕前许愿吧。');return}cakeFinale(preview);return}if(!preview){seen.add(it.key);updateProgress()}
 if(it.key==='memory'){
  modal(`<div class="eyebrow">OUR LITTLE MOMENTS</div><h2>这些照片，还是一看就会笑。</h2><div class="memory-projector"><div id="memory-image"></div><p id="memory-caption"></p></div><div class="gallery-controls"><button class="pill" id="photo-prev" aria-label="上一张照片">上一张</button><span id="photo-counter" aria-live="polite"></span><button class="pill" id="photo-next" aria-label="下一张照片">下一张</button></div><button class="text-btn" id="slideshow">慢慢看一遍</button><p class="memory-opening">${esc(card.memory)}</p>`);
  let index=0,timer=null;const photos=card.photos;const render=()=>{$('#memory-image').innerHTML=photos.length?`<img class="memory-photo" src="${photos[index].src}" alt="回忆照片 ${index+1}">`:'<div class="empty-memory">有些回忆，不一定需要照片。</div>';$('#memory-caption').textContent=photos[index]?.caption||'';$('#photo-counter').textContent=photos.length?`${index+1} / ${photos.length}`:'暂无照片';$('#photo-prev').disabled=$('#photo-next').disabled=photos.length<2;$('#slideshow').hidden=photos.length<2};const turn=delta=>{if(photos.length){index=(index+delta+photos.length)%photos.length;render()}};$('#photo-prev').onclick=()=>turn(-1);$('#photo-next').onclick=()=>turn(1);$('#slideshow').onclick=()=>{if(timer){clearInterval(timer);timer=null;$('#slideshow').textContent='慢慢看一遍'}else{timer=setInterval(()=>{if(!document.hidden)turn(1)},3500);$('#slideshow').textContent='暂停一下'}};objectCleanup=()=>clearInterval(timer);render();keepControl(it.key);
 }else if(it.key==='song'){
  modal(`<div class="eyebrow">A SONG FOR YOU</div><h2>${esc(card.from||'TA')}唱给你的一首歌。</h2><p>${esc(card.song||'这首歌，唱给你听')}</p><div class="record-player-ui"><div class="record-arm"></div><button id="spin-record" class="album-disc" aria-label="播放这首歌" aria-pressed="false">${card.albumCover?`<img src="${card.albumCover}" alt="唱片封面">`:'<span class="record-label">♫</span>'}<i></i></button></div>${card.songAudio?`<audio id="received-song" controls preload="metadata" src="${card.songAudio}"></audio><p id="song-play-state" role="status">点一下播放，听听这首为你唱的歌。</p>`:'<p>还没有放入歌曲。录一段或上传音频后，就可以在这里听到。</p>'}`);
  const audio=$('#received-song'),disc=$('#spin-record');
  const sync=playing=>{recordSpinning=playing;disc.classList.toggle('spinning',playing);disc.setAttribute('aria-pressed',String(playing));disc.setAttribute('aria-label',playing?'暂停歌曲':'播放这首歌')};
  if(audio){disc.onclick=async()=>{if(audio.paused){try{await audio.play()}catch{$('#song-play-state').textContent='暂时无法播放，请点击下方播放键重试。'}}else audio.pause()};audio.onplay=()=>{stopMusic();sync(true);$('#song-play-state').textContent='正在播放……'};audio.onpause=()=>sync(false);audio.onwaiting=()=>sync(false);audio.onplaying=()=>sync(true);audio.onended=()=>{sync(false);$('#song-play-state').textContent='想听的话，可以再放一遍。'};audio.onerror=()=>{sync(false);$('#song-play-state').textContent='当前浏览器无法播放这段歌，请换一个浏览器试试。'};objectCleanup=()=>{audio.pause();sync(false)}}else disc.disabled=true;keepControl();
 }else if(it.key==='secret'){
  modal(`<div class="eyebrow">SOMETHING I WANT TO TELL YOU</div><h2>有几句话，想让你亲耳听到。</h2><button id="pick-up" class="telephone-answer" aria-label="拿起听筒">☎</button><p id="call-status">轻触听筒，接起这通电话。</p><div id="voice-message" hidden>${card.voice?`<audio id="received-voice" controls preload="metadata" src="${card.voice}"></audio>`:`<p>${esc(card.secret||'有些话，还是想认真告诉你。')}</p>`}</div>`);
  $('#pick-up').onclick=async()=>{$('#voice-message').hidden=false;$('#pick-up').classList.toggle('answered');const a=$('#received-voice');if(a){stopMusic();if(a.paused){try{await a.play();$('#call-status').textContent='正在播放……'}catch{$('#call-status').textContent='点击下方播放键，听听这段声音。'}}else{a.pause();$('#call-status').textContent='已暂停，再轻触听筒继续。'}}else $('#call-status').textContent='这是 TA 想认真告诉你的话。'};const a=$('#received-voice');if(a){a.onplay=()=>stopMusic();a.onended=()=>{$('#call-status').textContent='听完了，也可以再听一次。';$('#pick-up').classList.remove('answered')};a.onerror=()=>$('#call-status').textContent='当前浏览器无法播放这段录音，请换一个浏览器试试。'}keepControl(it.key);
 }else if(it.key==='wish'){
  const wishDefaults=['下一次，一起去看看更大的世界。','一起吃很多顿普通的晚饭。','再拍一张最喜欢的合照。'];const wishes=card.wish.split('\n').slice(0,3).map((s,i)=>s.trim()||wishDefaults[i]);while(wishes.length<3)wishes.push(wishDefaults[wishes.length]);modal(`<div class="eyebrow">THREE THINGS FOR OUR TOMORROWS</div><h2>以后，还有很多事想和你一起做。</h2><div class="wish-balloons">${wishes.map((w,i)=>`<button class="wish-balloon" data-wish="${i}" aria-label="打开第 ${i+1} 件事"><span>♡</span></button>`).join('')}</div><div id="wish-revealed" aria-live="polite"></div>`);const opened=new Set();$('#wish-revealed').textContent='点开三个气球，看看以后要一起做什么。';document.querySelectorAll('[data-wish]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.wish);if(opened.has(i))return;opened.add(i);b.classList.add('popped');b.disabled=true;$('#wish-revealed').innerHTML=[...opened].map(j=>`<p class="wish-slip">${esc(wishes[j])}</p>`).join('')+(opened.size===3?'<p>说好了，到时候一个也不能忘。</p>':'')});keepControl(it.key);
 }
}
function cakeFinale(preview=false){objectPreview=preview;modal(`<div class="eyebrow">MAKE A BIRTHDAY WISH</div><h2>最后，认真许一个生日愿望吧。</h2><p>愿望不用告诉任何人。<br>长按下面的按钮，一口气吹灭三支蜡烛。</p><div class="wish-candles">${[0,1,2].map(()=>`<i class="wish-candle" aria-hidden="true"><i class="candle-flame"></i><span></span></i>`).join('')}</div><p id="candle-count" aria-live="polite">准备好了，就深吸一口气。</p><button id="blow" class="pill hold-to-blow"><span>按住吹蜡烛</span></button>`);let finished=false,holdTimer=null,letterTimer=null;const blow=$('#blow'),label=blow.querySelector('span');const showLetter=()=>{modal(`<div class="eyebrow">HAPPY BIRTHDAY, ${esc(card.to)}</div><div class="final-mark">✧</div><h2>新的一岁，也请继续开心地做自己。</h2><div class="birthday-letter"><p>${esc(card.letter||'想说的话其实有很多，最后还是想先认真地祝你一句：生日快乐。')}</p><p class="signature">—— ${esc(card.from||'一个在乎你的人')}</p></div><button id="again" class="pill dark">${preview?'结束预览':'记录一下'}</button>`);$('#again').onclick=()=>preview?$('#modal').close():recordBirthdayMoment();if(!preview)$('#quest-text').textContent='生日快乐。想再看哪一段，都可以重新打开。'};const finish=()=>{if(finished)return;finished=true;holdTimer=null;blow.classList.remove('holding');blow.classList.add('blown');label.textContent='呼——';document.querySelectorAll('.wish-candle').forEach(c=>c.classList.add('unlit'));$('#candle-count').textContent='蜡烛熄灭了，生日快乐。';if(!preview){warm.intensity=60;flames.forEach(f=>f.visible=false)}letterTimer=setTimeout(showLetter,520)};const cancelHold=()=>{if(finished)return;clearTimeout(holdTimer);holdTimer=null;blow.classList.remove('holding');label.textContent='按住吹蜡烛';$('#candle-count').textContent='再多按一会儿，就能吹灭。'};const startHold=e=>{if(finished||holdTimer)return;if(e.type==='keydown'&&![' ','Enter'].includes(e.key))return;e.preventDefault();blow.classList.add('holding');label.textContent='继续按住……';$('#candle-count').textContent='正在吹——';holdTimer=setTimeout(finish,1250)};blow.onpointerdown=startHold;blow.onpointerup=cancelHold;blow.onpointercancel=cancelHold;blow.onpointerleave=cancelHold;blow.onkeydown=startHold;blow.onkeyup=e=>{if([' ','Enter'].includes(e.key))cancelHold()};objectCleanup=()=>{clearTimeout(holdTimer);clearTimeout(letterTimer)}}

const captureWait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function captureImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('图片读取失败'));image.src=src})}
function roundedPath(ctx,x,y,w,h,r){const radius=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath()}
function drawCover(ctx,image,x,y,w,h){const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),sw=w/scale,sh=h/scale,sx=(image.naturalWidth-sw)/2,sy=(image.naturalHeight-sh)/2;ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h)}
function drawWrappedText(ctx,text,x,y,maxWidth,lineHeight,maxLines){const chars=String(text||'').replace(/\s+/g,' ').trim().split('');let line='',lines=[];for(const char of chars){const test=line+char;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=char;if(lines.length===maxLines)break}else line=test}if(lines.length<maxLines&&line)lines.push(line);lines.slice(0,maxLines).forEach((value,index)=>ctx.fillText(value,x,y+index*lineHeight));return lines.length}
function collageLayouts(count){if(count===1)return[{x:180,y:760,w:840,h:585,r:-.035}];if(count===2)return[{x:70,y:790,w:590,h:455,r:-.065},{x:545,y:925,w:590,h:455,r:.055}];if(count===3)return[{x:65,y:770,w:520,h:405,r:-.07},{x:615,y:770,w:520,h:405,r:.065},{x:340,y:1090,w:520,h:405,r:-.025}];return[{x:55,y:755,w:520,h:375,r:-.055},{x:620,y:760,w:520,h:375,r:.06},{x:70,y:1110,w:520,h:375,r:.045},{x:615,y:1110,w:520,h:375,r:-.045}]}
function drawPolaroid(ctx,image,caption,layout){const {x,y,w,h,r}=layout,pad=22,captionHeight=caption?64:34;ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(r);ctx.shadowColor='rgba(68,45,58,.28)';ctx.shadowBlur=28;ctx.shadowOffsetY=16;roundedPath(ctx,-w/2,-h/2,w,h,10);ctx.fillStyle='#fffaf7';ctx.fill();ctx.shadowColor='transparent';ctx.save();roundedPath(ctx,-w/2+pad,-h/2+pad,w-pad*2,h-pad-captionHeight,5);ctx.clip();drawCover(ctx,image,-w/2+pad,-h/2+pad,w-pad*2,h-pad-captionHeight);ctx.restore();if(caption){ctx.fillStyle='#776879';ctx.font='28px "Noto Serif SC","Songti SC",serif';ctx.textAlign='center';const short=caption.length>24?caption.slice(0,23)+'…':caption;ctx.fillText(short,0,h/2-20)}ctx.restore()}
async function composeBirthdayCard(roomSource){const output=document.createElement('canvas');output.width=1200;output.height=1600;const ctx=output.getContext('2d'),room=await captureImage(roomSource);ctx.fillStyle='#f4e8e6';ctx.fillRect(0,0,1200,1600);drawCover(ctx,room,0,0,1200,1600);const wash=ctx.createLinearGradient(0,0,0,1600);wash.addColorStop(0,'rgba(255,249,247,.18)');wash.addColorStop(.48,'rgba(247,232,231,.06)');wash.addColorStop(1,'rgba(91,63,79,.48)');ctx.fillStyle=wash;ctx.fillRect(0,0,1200,1600);ctx.strokeStyle='rgba(255,252,250,.82)';ctx.lineWidth=8;roundedPath(ctx,34,34,1132,1532,34);ctx.stroke();ctx.textAlign='center';ctx.fillStyle='#fffaf8';ctx.shadowColor='rgba(80,55,70,.32)';ctx.shadowBlur=14;ctx.font='500 25px Georgia,serif';ctx.fillText('A LITTLE ROOM CARD',600,102);ctx.font='500 62px "Noto Serif SC","Songti SC",serif';ctx.fillText(`${card.to||'你'}，生日快乐。`,600,185);ctx.font='28px "Noto Serif SC","Songti SC",serif';ctx.fillText('这一刻，和我们的回忆一起留下来。',600,238);ctx.shadowColor='transparent';const loaded=[];for(const photo of card.photos.slice(0,4)){try{loaded.push({image:await captureImage(photo.src),caption:photo.caption})}catch{}}if(loaded.length){const layouts=collageLayouts(loaded.length);loaded.forEach((photo,index)=>drawPolaroid(ctx,photo.image,photo.caption,layouts[index]))}else{ctx.fillStyle='rgba(255,250,248,.88)';roundedPath(ctx,155,970,890,300,24);ctx.fill();ctx.fillStyle='#6d6071';ctx.textAlign='center';ctx.font='36px "Noto Serif SC","Songti SC",serif';drawWrappedText(ctx,card.letter||'生日快乐。愿你新的一岁，每一天都有值得开心的小事。',600,1060,760,58,3)}ctx.textAlign='center';ctx.fillStyle='#fffaf8';ctx.shadowColor='rgba(70,46,60,.36)';ctx.shadowBlur=12;ctx.font='27px "Noto Serif SC","Songti SC",serif';ctx.fillText(`—— ${card.from||'一个在乎你的人'}`,600,1530);ctx.shadowColor='transparent';return output.toDataURL('image/png')}
function captureOverlay(){let overlay=$('#birthday-capture');if(overlay)return overlay;overlay=document.createElement('div');overlay.id='birthday-capture';overlay.hidden=true;overlay.setAttribute('aria-live','polite');overlay.innerHTML='<div class="capture-viewfinder"><i></i><i></i><i></i><i></i><span></span></div><p>把这一刻记录下来</p><div class="capture-flash"></div>';$('#experience').append(overlay);return overlay}
function restoreBirthdayRoom(){birthdayCaptureBusy=false;const overlay=$('#birthday-capture');if(overlay){overlay.hidden=true;overlay.classList.remove('ready','flashing')}$('#experience').classList.remove('capturing');$('#modal').classList.remove('birthday-result-modal');$('#quest').hidden=false;$('#object-nav').hidden=false;$('#visit-help').hidden=false;$('#joystick').hidden=!matchMedia('(pointer:coarse)').matches}
function showBirthdayCardResult(source){modal(`<div class="birthday-result"><div class="eyebrow">A BIRTHDAY MOMENT, SAVED</div><h2>这一刻，已经记录好了。</h2><img class="birthday-card-result" src="${source}" alt="给 ${esc(card.to||'你')} 的生日拼贴卡"><p>可以把这张卡保存下来，也可以再回房间里看一看。</p><div class="birthday-result-actions"><button id="save-birthday-card" class="pill dark">保存这张卡片</button><button id="return-to-room" class="pill">再看一看房间</button></div></div>`);$('#modal').classList.add('birthday-result-modal');$('#save-birthday-card').onclick=()=>{const download=document.createElement('a'),name=String(card.to||'TA').replace(/[\\/:*?"<>|]/g,'').slice(0,18)||'TA';download.href=source;download.download=`心意小屋-给${name}的生日卡.png`;download.click()};$('#return-to-room').onclick=()=>$('#modal').close();objectCleanup=restoreBirthdayRoom}
async function recordBirthdayMoment(){const button=$('#again');if(button)button.disabled=true;birthdayCaptureBusy=true;keys.clear();moveStick.set(0,0);dragging=false;$('#joystick>div').style.transform='';$('#modal').close();const overlay=captureOverlay();$('#experience').classList.add('capturing');overlay.hidden=false;travel=null;camera=inside;resize();const startPosition=inside.position.clone(),startRotation=inside.quaternion.clone(),endPosition=new THREE.Vector3(0,1.68,3.35),endCamera=inside.clone();endCamera.position.copy(endPosition);endCamera.lookAt(new THREE.Vector3(0,1.72,-1.45));const endRotation=endCamera.quaternion.clone(),begin=performance.now();await new Promise(resolve=>{const move=now=>{const progress=Math.min(1,(now-begin)/1250),eased=progress*progress*(3-2*progress);inside.position.lerpVectors(startPosition,endPosition,eased);inside.quaternion.slerpQuaternions(startRotation,endRotation,eased);renderer.render(scene,inside);if(progress<1)requestAnimationFrame(move);else resolve()};requestAnimationFrame(move)});inside.rotation.order='YXZ';yaw=inside.rotation.y;pitch=inside.rotation.x;overlay.classList.add('ready');await captureWait(260);overlay.classList.add('flashing');renderer.render(scene,inside);let roomSource;try{roomSource=renderer.domElement.toDataURL('image/png')}catch{roomSource=''}await captureWait(300);overlay.hidden=true;overlay.classList.remove('ready','flashing');try{if(!roomSource)throw Error('无法读取房间画面');showBirthdayCardResult(await composeBirthdayCard(roomSource))}catch{restoreBirthdayRoom();toast('这次没有拍下来，请再试一次。')}}
function safeJSON(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')}
async function buildGiftHTML(){let html=exportTemplate;const module=document.querySelector('script[type="module"][src]');if(module){const text=async p=>{const r=await fetch(new URL(p,location.href));if(!r.ok)throw Error('素材加载失败');return r.text()},music=async()=>{const r=await fetch(new URL('birthday-music.m4a',location.href));if(!r.ok)throw Error('背景音乐加载失败');return readData(await r.blob())};const [css,js,musicData]=await Promise.all([text('style.css'),text('app.js'),music()]);html=html.replace('<link rel="stylesheet" href="style.css">',()=>`<style>${css}</style>`).replace('src="birthday-music.m4a"',()=>`src="${musicData}"`).replace('<script type="module" src="app.js"></script>',()=>`<script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`)}const doc=new DOMParser().parseFromString(html,'text/html');doc.querySelectorAll('#gift-data').forEach(n=>n.remove());doc.querySelectorAll('script:not([type])').forEach(n=>{if(n.textContent.startsWith("location.hash='card="))n.remove()});const data=doc.createElement('script');data.id='gift-data';data.type='application/json';data.textContent=safeJSON(sanitize(card));doc.body.prepend(data);return '<!doctype html>\n'+doc.documentElement.outerHTML}
async function share(){if(photoBusy||recordingBusy()){toast('请先完成素材处理和录音');return}if(!validNames()){show('editor');return}await persistDraft();const size=(new Blob([JSON.stringify(card)]).size/1024/1024).toFixed(1);modal(`<div class="eyebrow">READY TO SEND</div><h2>生日贺卡做好了。</h2><p>${card.photos.length} 张照片 · ${card.songAudio?'一首为 TA 唱的歌':'未放入歌曲'} · ${card.voice?'声音留言':'文字留言'}</p><p class="small muted">下载后，把贺卡文件发给 ${esc(card.to)}。照片、封面和录音都在里面，约 ${size} MB。<br>用浏览器打开；首次显示房间需要联网。</p><button class="pill dark" id="download">下载完整贺卡</button><p id="download-state" role="status"></p>`);$('#download').onclick=async()=>{const button=$('#download');button.disabled=true;$('#download-state').textContent='正在生成贺卡文件…';try{const out=await buildGiftHTML();const u=URL.createObjectURL(new Blob([out],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='心意小屋-生日贺卡.html';a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);$('#download-state').textContent='贺卡已下载，照片和声音都包含在文件中。'}catch{$('#download-state').textContent='导出未成功，请保持联网后重试。'}finally{button.disabled=false}}}

let musicPlaying=false;const backgroundMusic=$('#background-music');backgroundMusic.volume=.34;async function startMusic(){if(musicPlaying&&!backgroundMusic.paused)return;try{await backgroundMusic.play();musicPlaying=true;$('#music').textContent='♫ 音乐开'}catch{musicPlaying=false;$('#music').textContent='♫ 音乐关';toast('当前浏览器无法播放背景音乐')}}function stopMusic(){backgroundMusic.pause();musicPlaying=false;$('#music').textContent='♫ 音乐关'}$('#music').onclick=()=>musicPlaying?stopMusic():startMusic();backgroundMusic.addEventListener('error',()=>{musicPlaying=false;$('#music').textContent='♫ 音乐关'});document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic()});
function setOverview(){overview.position.set(Math.sin(orbitAngle)*11,8,Math.cos(orbitAngle)*11);overview.lookAt(0,1.55,0)}
function resize(){const r=$('#viewport').getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);const a=r.width/r.height,half=a<1?6.3/a:6.3;overview.left=-half*a;overview.right=half*a;overview.top=half;overview.bottom=-half;overview.updateProjectionMatrix();inside.aspect=a;inside.updateProjectionMatrix()}new ResizeObserver(resize).observe($('#viewport'));
function look(){inside.rotation.order='YXZ';inside.rotation.y=yaw;inside.rotation.x=pitch}
const keys=new Set(),moveStick=new THREE.Vector2();window.addEventListener('keydown',e=>{if(mode==='experience'&&started&&!$('#modal').open&&['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){keys.add(e.key);e.preventDefault()}});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();moveStick.set(0,0)});
let dragging=false,px=0,py=0;renderer.domElement.onpointerdown=e=>{dragging=true;px=e.clientX;py=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)};renderer.domElement.onpointermove=e=>{if(!dragging)return;const dx=e.clientX-px,dy=e.clientY-py;px=e.clientX;py=e.clientY;if(started){travel=null;yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-1.1,.7);look()}else{orbitAngle=THREE.MathUtils.clamp(orbitAngle+dx*.004,.15,1.35);setOverview()}};renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>dragging=false;
const joy=$('#joystick');joy.onpointerdown=e=>{joy.setPointerCapture(e.pointerId);joyMove(e)};function joyMove(e){if(!joy.hasPointerCapture(e.pointerId))return;const r=joy.getBoundingClientRect();moveStick.set((e.clientX-r.left-r.width/2)/30,(e.clientY-r.top-r.height/2)/30);if(moveStick.length()>1)moveStick.normalize();joy.firstElementChild.style.transform=`translate(${moveStick.x*25}px,${moveStick.y*25}px)`}joy.onpointermove=joyMove;joy.onpointerup=joy.onpointercancel=()=>{moveStick.set(0,0);joy.firstElementChild.style.transform=''};
const obstacles=[[-3,.35,.75,1.65],[-2.5,-2.5,.8,.55],[2.7,-2.3,.9,.6],[2.8,1.55,.65,.55],[0,.35,1.1,1.1],[0,-3.5,1.2,.7]];function allowed(x,z){return Math.abs(x)<3.55&&Math.abs(z)<3.5&&!obstacles.some(([ox,oz,rx,rz])=>Math.abs(x-ox)<rx&&Math.abs(z-oz)<rz)}
let last=performance.now();const projected=new THREE.Vector3();function animate(now){const dt=Math.min((now-last)/1000,.04);last=now;if(started&&!birthdayCaptureBusy&&!$('#modal').open){if(travel){travel.t=Math.min(1,travel.t+dt*.72);const t=travel.t*travel.t*(3-2*travel.t);inside.position.lerpVectors(travel.start,travel.end,t);inside.lookAt(travel.target);inside.rotation.order='YXZ';yaw=inside.rotation.y;pitch=inside.rotation.x;if(travel.t===1){const it=travel.item;travel=null;openItem(it)}}else{const mx=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0)+moveStick.x,mz=(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0)+moveStick.y;const dx=(Math.cos(yaw)*mx+Math.sin(yaw)*mz)*dt*1.9,dz=(-Math.sin(yaw)*mx+Math.cos(yaw)*mz)*dt*1.9;if(allowed(inside.position.x+dx,inside.position.z))inside.position.x+=dx;if(allowed(inside.position.x,inside.position.z+dz))inside.position.z+=dz}const rect=$('#viewport').getBoundingClientRect();for(const it of items){projected.copy(it.pos).project(inside);const visible=(it.key!=='song'||!!card.songAudio||localExperiencePreview)&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.85;it.button.hidden=!visible;it.button.style.left=(projected.x*.5+.5)*rect.width+'px';it.button.style.top=(-projected.y*.5+.5)*rect.height+'px'}}else items.forEach(it=>it.button.hidden=true);balloonMeshes.forEach((b,i)=>b.position.y=b.userData.baseY);flames.forEach((f,i)=>f.scale.y=1.7+Math.sin(now*.009+i)*.2);if(recordSpinning)recordArtwork.rotation.z-=dt*.85;fireplaceLights.forEach((light,i)=>light.intensity=2.6+Math.sin(now*.007+i*1.7)*.2);positionPreviewBubble();renderer.render(scene,camera);requestAnimationFrame(animate)}
updateAlbum();$('#loading').hidden=true;show('home');updateProgress();requestAnimationFrame(animate);if(shared)visit();


