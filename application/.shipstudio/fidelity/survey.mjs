import {launchChrome} from './headless-chrome.mjs';
import fs from 'node:fs';
const browser=await launchChrome({tool:'survey',basePort:9340});
try {
 const target=await (await fetch(`http://127.0.0.1:${browser.port}/json/new?about:blank`,{method:'PUT'})).json();
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}});
 const send=(method,params={})=>new Promise(r=>{const i=++id;pending.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
 await send('Page.enable');
 for(const width of [405,500,800]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await send('Page.navigate',{url:'https://enduro-vietnam.com/'});
 await new Promise(r=>setTimeout(r,16000));
 const result=await send('Runtime.evaluate',{expression:`(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,5000))]);return {width:innerWidth,screen:document.body.className,title:document.title,media:[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].filter(r=>r.type===4).map(r=>r.conditionText)}catch{return []}}),fonts:[...document.fonts].map(f=>({family:f.family,weight:f.weight,status:f.status})),elements:[...document.body.querySelectorAll('*')].filter(e=>{let r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'}).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,cls:e.className,id:e.id,text:[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim(),x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,color:s.color,bg:s.backgroundColor,image:s.backgroundImage,padding:s.padding,border:s.border,radius:s.borderRadius,display:s.display,gap:s.gap,src:e.currentSrc||e.src||null,html:['INPUT','BUTTON','IFRAME'].includes(e.tagName)?e.outerHTML:null}})}})()`,awaitPromise:true,returnByValue:true});
 fs.writeFileSync(`.shipstudio/source/computed-${width}.json`,JSON.stringify(result.result.result.value,null,2));
 if(width===1230){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.shipstudio/source/home-1230.png',Buffer.from(shot.result.data,'base64'))}
 console.log('Surveyed',width);
 }
 ws.close();
}finally{browser.close()}
