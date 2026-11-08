const {JSDOM}=require('jsdom');const fs=require('fs');const path=require('path');const R=path.join(__dirname,'..')+'/';
function boot(store){
 const html=fs.readFileSync(R+'index.html','utf8').replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/,'');
 const dom=new JSDOM(html,{url:'https://x.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window; const log=[];
 if(store) w.localStorage.setItem('__seed',''), Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,v));
 const st=w.setTimeout.bind(w); w.setTimeout=(f,ms,...a)=>st(f,Math.min(ms||0,5),...a);
 w.requestAnimationFrame=f=>st(()=>f(0),1);
 w.Audio=function(u){this.src=u;this.play=()=>{if(!this.muted)log.push('play:'+u);return Promise.resolve()};this.pause=()=>{};this.currentTime=0;};
 w.AudioContext=function(){return{currentTime:0,state:'running',resume(){return Promise.resolve()},createOscillator(){return{connect(){},start(){log.push('tone')},stop(){},frequency:{setValueAtTime(){},value:0},type:''}},createBuffer(){return{getChannelData(){return new Float32Array(10)}}},createBufferSource(){return{connect(){},start(){},stop(){},buffer:null}},createGain(){return{connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},value:0}}},destination:{}}};
 w.speechSynthesis={speaking:false,pending:false,cancel(){},speak(u){log.push('say:'+u.text)},getVoices(){return[]},addEventListener(){}};
 w.SpeechSynthesisUtterance=function(t){this.text=t};
 w.eval(fs.readFileSync(R+'script.js','utf8')+';window.__t={set(k,v){if(k==="questionCount")questionCount=v;if(k==="hearMax")hearMax=v;if(k==="hearChoices")hearChoices=v;},get s(){return {track,mode,quizAnswer,quizOptions,turnsLeft,hearMax,hearChoices,addChoices,coolingDown}}, showGameStart, goNumbersMenu, goLettersMenu, goHome, startHear, startSounds, startCounting, startAddition, startCompare, addDistractors, render, load};');
 return {w,log,d:w.document};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(c,m)=>{if(!c){console.log('FAIL',m);process.exitCode=1}};
const boxes=d=>{const s=d.querySelector('.round-progress');return s?[s.querySelectorAll('.round-box.done').length,s.querySelectorAll('.round-box').length,s.getAttribute('aria-valuetext')]:null};
async function play(name,start,correctOf,wrongOf){
 const {w,log,d}=boot();const T=w.__t;
 T.set("questionCount",5);
 T[start]();await sleep(30);
 assert(JSON.stringify(boxes(d))==JSON.stringify([0,5,'0 of 5 done']),name+' start '+JSON.stringify(boxes(d)));
 // wrong
 const btns=()=>[...d.querySelectorAll('.big-actions .big-btn')];
 const wb=btns().find(b=>wrongOf(b,T.s)); log.length=0; wb.click();
 assert(d.getElementById('wrong-overlay').className.indexOf('hidden')<0,name+' wrong overlay');
 assert(d.querySelector('#wrong-overlay svg'),name+' X icon');
 await sleep(200);
 assert(boxes(d)[0]===0,name+' wrong no fill');
 if(name==='hear') assert(log.some(l=>l==='play:./sounds/numbers/'+T.s.quizAnswer+'.m4a'),'hear replay after wrong '+log);
 for(let q=1;q<=5;q++){
  const cb=btns().find(b=>correctOf(b,T.s)); cb.click();
  if(q<5) assert(boxes(d)[0]===q,name+' fill '+q);
  else assert(boxes(d)[0]===5,name+' final fill');
  await sleep(60);
 }
 assert(T.s.mode==='DONE',name+' done'); assert(!d.querySelector('.round-progress'),name+' no strip on done');
 assert([...d.querySelectorAll('.home-link')].some(b=>b.textContent==='Back'),name+' done back link');
 [...d.querySelectorAll('button')].find(b=>b.textContent==='Again').click();await sleep(30);
 assert(boxes(d)&&boxes(d)[0]===0,name+' reset');
 console.log('ok',name);
 return {w,log,d,T};
}
(async()=>{
 const num=(b,s)=>+b.textContent===s.quizAnswer, nnum=(b,s)=>+b.textContent!==s.quizAnswer;
 await play('counting','startCounting',num,nnum);
 await play('addition','startAddition',num,nnum);
 await play('compare','startCompare',(b,s)=>b.textContent.toUpperCase()===s.quizAnswer,(b,s)=>b.textContent.toUpperCase()!==s.quizAnswer);
 await play('sounds','startSounds',(b,s)=>b.textContent.toUpperCase()===String(s.quizAnswer).toUpperCase(),(b,s)=>b.textContent.toUpperCase()!==String(s.quizAnswer).toUpperCase());
 const h=await play('hear','startHear',num,nnum);
 // hear: no written target in stage
 assert(!/\d/.test(h.d.querySelector('.letter-stage').textContent),'stage has no digits');
 // sampling
 const {w}=boot(); let bad=0;
 for(let max=10;max<=100;max+=10)for(let c=2;c<=4;c++){w.__t.set('hearMax',max);w.__t.set('hearChoices',c);
  for(let i=0;i<500;i++){w.__t.startHear();const s=w.__t.s;const o=s.quizOptions;
   if((o.length!==c||new Set(o).size!==c||o.filter(x=>x===s.quizAnswer).length!==1||o.some(x=>x<1||x>Math.max(max,c+1)||!Number.isInteger(x))||s.quizAnswer<1||s.quizAnswer>max)) {bad++; if(bad<3)console.log(max,c,JSON.stringify(s));}}}
 assert(bad===0,'sampling bad '+bad); console.log('sampling ok');
 // persistence
 const a=boot();a.w.__t.showGameStart('hear','Hear a number',a.w.__t.startHear,()=>{},false);
 const sel=a.d.querySelector('.hear-max-select'),ch=a.d.querySelector('.hear-choices-select');
 assert(sel&&ch&&sel.value==='10'&&ch.value==='2','defaults');
 sel.value='70';sel.onchange();ch.value='4';ch.onchange();
 const saved={};for(let i=0;i<a.w.localStorage.length;i++){const k=a.w.localStorage.key(i);saved[k]=a.w.localStorage.getItem(k)}
 const b=boot(saved); b.w.__t.load();
 assert(b.w.__t.s.hearMax===70&&b.w.__t.s.hearChoices===4,'reload '+JSON.stringify(b.w.__t.s));
 const c2=boot({[Object.keys(saved)[0]]:JSON.stringify({hearMax:55,hearChoices:9})});c2.w.__t.load();
 assert(c2.w.__t.s.hearMax===10&&c2.w.__t.s.hearChoices===2,'clamp');
 console.log('persist ok');
 // navigation cancels pending feedback in every game
 for(const st of ['startCounting','startAddition','startCompare','startSounds','startHear']){
  for(const kind of ['wrong','right']){
   const g=boot();const T=g.w.__t;T[st]();await sleep(20);
   const bs=[...g.d.querySelectorAll('.big-actions .big-btn')];
   const ans=String(T.s.quizAnswer).toUpperCase();
   const b=bs.find(x=>(x.textContent.toUpperCase()===ans)===(kind==='right'));
   b.click(); g.log.length=0; T.goNumbersMenu(); await sleep(80);
   assert(T.s.track==='numbers-menu'&&T.s.mode==='PLAY'&&!T.s.coolingDown,st+' '+kind+' stays on menu');
   assert(g.d.getElementById('wrong-overlay').classList.contains('hidden')&&g.d.getElementById('success-overlay').classList.contains('hidden'),st+' '+kind+' overlays hidden');
   assert(!g.log.some(l=>l.startsWith('play:')||l.startsWith('say:')),st+' '+kind+' no stale audio '+g.log);
  }
 }
 console.log('navigation ok');
 // menus: every game card has a styled class
 const css=fs.readFileSync(R+'style.css','utf8');const g=boot();
 for(const fn of ['goHome','goLettersMenu','goNumbersMenu']){g.w.__t[fn]();
  const bs=[...g.d.querySelectorAll('.home-choice')];
  const sty=bs.map(b=>[...b.classList].find(c=>new RegExp('\\.big-btn\\.'+c+'\\s*\\{').test(css)));
  assert(bs.length&&sty.every(Boolean),fn+' unstyled card');
  if(fn==='goNumbersMenu') assert(bs.length===4&&new Set(sty).size===1,'numbers cards same style '+sty);
  bs.forEach(b=>assert(b.tagName==='BUTTON'&&b.type==='button',fn+' button type'));
 }
 assert(!/class="[^"]*\bsecondary\b/.test(fs.readFileSync(R+'script.js','utf8'))&&!/'big-btn secondary/.test(fs.readFileSync(R+'script.js','utf8')),'no unstyled secondary class');
 console.log('menus ok');
 // other games' prompts preserved
 for(const n of [1,50,100]) assert(fs.statSync(R+'sounds/numbers/'+n+'.m4a').size>3000,'asset '+n);
 let miss=0;for(let n=1;n<=100;n++){if(!fs.existsSync(R+'sounds/numbers/'+n+'.m4a')||fs.statSync(R+'sounds/numbers/'+n+'.m4a').size<3000)miss++}
 assert(miss===0,'assets');console.log('assets ok');console.log(process.exitCode?'WITH FAILS':'ALL PASS');
})();
