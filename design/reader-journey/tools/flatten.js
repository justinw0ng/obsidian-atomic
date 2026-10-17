function splitTop(s){const out=[];let d=0,cur='';for(const ch of s){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&d===0){out.push(cur.trim());cur='';}else cur+=ch;}if(cur.trim())out.push(cur.trim());return out;}
function parseStop(s){const m=s.match(/^(.*?\))\s*([\-\d.]+(?:px|%))?\s*([\-\d.]+(?:px|%))?$/)||s.match(/^(\S+)\s*([\-\d.]+(?:px|%))?$/);return {c:m[1],p:m[2]||null};}
function drawGradient(ctx,g,w,h){
  const m=g.match(/^(repeating-)?(linear|radial)-gradient\((.*)\)$/s); if(!m)return;
  const args=splitTop(m[3]); let first=args[0]; let grad,len;
  if(m[2]==='linear'){
    let ang=Math.PI; if(/deg|turn|rad|^to /.test(first)){args.shift();
      if(first.startsWith('to ')){const map={'to top':0,'to right':90,'to bottom':180,'to left':270,'to top right':45,'to right top':45,'to bottom right':135,'to right bottom':135,'to bottom left':225,'to left bottom':225,'to top left':315,'to left top':315};ang=(map[first]??180)*Math.PI/180;}
      else if(first.endsWith('deg'))ang=parseFloat(first)*Math.PI/180; else if(first.endsWith('turn'))ang=parseFloat(first)*2*Math.PI; else ang=parseFloat(first);}
    len=Math.abs(w*Math.sin(ang))+Math.abs(h*Math.cos(ang)); const cx=w/2,cy=h/2,dx=Math.sin(ang)*len/2,dy=-Math.cos(ang)*len/2;
    grad=ctx.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy); addStops(grad,args,len); ctx.fillStyle=grad; ctx.fillRect(0,0,w,h);
  } else {
    let cx=w/2,cy=h/2,shape='ellipse',rx,ry;
    if(!/^(rgba?|#|hsl|transparent|[a-z]+\s*$)/.test(first)||/ at |^at |circle|ellipse|closest|farthest/.test(first)){
      if(/circle|ellipse|at |closest|farthest|px|%/.test(first)&&!/^(rgba?\(|#)/.test(first)){args.shift();
        const at=first.split(/\bat\b/); const sz=at[0].trim(); if(/circle/.test(sz))shape='circle';
        if(at[1]){const [x,y]=at[1].trim().split(/\s+/);const pv=(v,t)=>v==null?t/2:v==='center'?t/2:v==='left'||v==='top'?0:v==='right'||v==='bottom'?t:v.endsWith('%')?parseFloat(v)/100*t:parseFloat(v);cx=pv(x,w);cy=pv(y??'center',h);}
        const nums=sz.match(/[\d.]+px/g); if(nums){rx=parseFloat(nums[0]);ry=nums[1]?parseFloat(nums[1]):rx; if(!nums[1]&&!/circle/.test(sz))shape='circle';}
        else if(/closest-side/.test(sz)){rx=Math.min(cx,w-cx);ry=Math.min(cy,h-cy);if(shape==='circle')rx=ry=Math.min(rx,ry);}
      }}
    if(rx==null){const fx=Math.max(cx,w-cx),fy=Math.max(cy,h-cy); if(shape==='circle'){rx=ry=Math.hypot(fx,fy);} else {rx=fx*Math.SQRT2;ry=fy*Math.SQRT2;}}
    ctx.save(); ctx.translate(cx,cy); ctx.scale(1,ry/rx); grad=ctx.createRadialGradient(0,0,0,0,0,rx); addStops(grad,args,rx); ctx.fillStyle=grad; ctx.fillRect(-cx,-cy*rx/ry,w,h*rx/ry); ctx.restore();
  }
}
function addStops(grad,args,len){const st=args.map(parseStop);st.forEach((s,i)=>{if(s.p)s.o=s.p.endsWith('%')?parseFloat(s.p)/100:parseFloat(s.p)/len;});
  if(st[0].o==null)st[0].o=0; if(st[st.length-1].o==null)st[st.length-1].o=1;
  for(let i=1;i<st.length;i++){if(st[i].o==null){let j=i;while(st[j].o==null)j++;for(let k=i;k<j;k++)st[k].o=st[i-1].o+(st[j].o-st[i-1].o)*(k-i+1)/(j-i+1);}}
  let last=0; st.forEach(s=>{let o=Math.min(1,Math.max(last,s.o));last=o;try{grad.addColorStop(o,s.c);}catch(e){}});}
function rasterGradients(){
  document.querySelectorAll('body *').forEach(e=>{const cs=getComputedStyle(e);const bi=cs.backgroundImage;if(!bi||!bi.includes('gradient'))return;
    const r=e.getBoundingClientRect();const w=Math.ceil(r.width),h=Math.ceil(r.height);if(!w||!h)return;
    const S=2;const c=document.createElement('canvas');c.width=w*S;c.height=h*S;const ctx=c.getContext('2d');ctx.scale(S,S);
    ctx.fillStyle=cs.backgroundColor;ctx.fillRect(0,0,w,h);
    splitTop(bi).reverse().forEach(g=>drawGradient(ctx,g,w,h));
    const img=document.createElement('img');img.src=c.toDataURL('image/png');img.dataset.grad='1';
    const bl=parseFloat(cs.borderLeftWidth),bt=parseFloat(cs.borderTopWidth);
    img.setAttribute('style',`position:absolute;left:${-bl}px;top:${-bt}px;width:${w}px;height:${h}px;border-radius:${cs.borderRadius};display:block;pointer-events:none`);
    e.style.backgroundImage='none'; if(cs.position==='static')e.style.position='relative';
    e.insertBefore(img,e.firstChild);});
}

(function(){
rasterGradients();
const body=document.body;
const isInline=e=>getComputedStyle(e).display==='inline'&&e.tagName!=='IMG'&&e.tagName!=='BR';
// phone selection bar: move just below the selected (hl-p) passage so it covers no words
document.querySelectorAll('.sel-bar').forEach(b=>{
  const pg=b.parentElement; const hl=pg.querySelector('.hl-p'); if(!hl)return;
  const rs=hl.getClientRects(); const last=rs[rs.length-1]; const pr=pg.getBoundingClientRect();
  b.style.top=(last.bottom-pr.top+10)+'px'; let L=rs[0].left-pr.left; const bw=b.getBoundingClientRect().width; if(L+bw>pr.width-12)L=pr.width-12-bw; b.style.left=Math.max(12,L)+'px';
});
const all=[...body.querySelectorAll('*')].filter(e=>!['SCRIPT','STYLE','BR'].includes(e.tagName));
const posParent=e=>{let p=e.parentElement;while(p&&p!==body&&isInline(p))p=p.parentElement;return p;};
const padBox=p=>{const r=p.getBoundingClientRect(),cs=getComputedStyle(p);return {x:r.left+parseFloat(cs.borderLeftWidth),y:r.top+parseFloat(cs.borderTopWidth)};};
const plan=[];const zs=all.filter(e=>{const z=getComputedStyle(e).zIndex;return z!=='auto'&&z!=='0';}).map(e=>[e,parseInt(getComputedStyle(e).zIndex)]);
all.forEach(e=>{ if(isInline(e))return; const r=e.getBoundingClientRect(); const p=posParent(e); const o=p===body?{x:0,y:0}:padBox(p); const cs=getComputedStyle(e);const VP=['background-color','color','opacity','box-shadow','border-top','border-right','border-bottom','border-left','overflow'];const vis={};VP.forEach(k=>vis[k]=cs.getPropertyValue(k));const rad=['top-left','top-right','bottom-right','bottom-left'].map(c=>{const v=cs.getPropertyValue('border-'+c+'-radius');const a=v.split(' ')[0];return a.endsWith('%')?(parseFloat(a)/100*Math.min(r.width,r.height))+'px':a;});vis['border-radius']=rad.join(' ');plan.push({e,p,l:r.left-o.x,t:r.top-o.y,w:r.width,h:r.height,vis}); });
// text fragments
const frags=[];
const tw=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);
let n;const texts=[];while(n=tw.nextNode()){ if(!n.textContent.trim())continue; const pe=n.parentElement; if(['SCRIPT','STYLE'].includes(pe.tagName))continue; texts.push(n);}
const FP=['font-family','font-size','font-weight','font-style','color','letter-spacing','text-transform','font-variant-numeric','text-decoration-line','font-feature-settings'];
texts.forEach(t=>{
  const owner=t.parentElement; let box=owner; while(box!==body&&isInline(box))box=box.parentElement;
  const cs=getComputedStyle(owner); const o=padBox(box);
  const s=t.textContent; const re=/\S+/g; let m; const segs=[]; let cur=null;
  while(m=re.exec(s)){ const rg=document.createRange(); rg.setStart(t,m.index); rg.setEnd(t,m.index+m[0].length); const rr=[...rg.getClientRects()].filter(r=>r.width>0); if(!rr.length)continue; const r=rr[0];
    if(cur&&Math.abs(r.top-cur.top)<2){cur.end=m.index+m[0].length;cur.right=rr[rr.length-1].right;cur.h=Math.max(cur.h,r.height);}
    else {cur={start:m.index,end:m.index+m[0].length,left:r.left,right:rr[rr.length-1].right,top:r.top,h:r.height};segs.push(cur);} }
  let lh=parseFloat(cs.lineHeight);
  const papEl=box.closest&&box.closest('.pap,.lc'); const clipB=papEl?papEl.getBoundingClientRect().bottom-parseFloat(getComputedStyle(box).paddingBottom||0):Infinity;
  segs.forEach(g=>{ if(g.top+g.h>clipB)return; const L=isNaN(lh)?Math.round(g.h):Math.round(lh); const style=FP.map(p=>p+':'+cs.getPropertyValue(p).replace(/["']/g,'')).join(';');
    const txt=s.slice(g.start,g.end); if(/\p{Extended_Pictographic}|[\u2700-\u27BF\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u25A0-\u25FF\u2600-\u26FF\u2B00-\u2BFF\uFF00-\uFFEF]/u.test(txt)&&!/^[↑↵→←]+$/.test(txt)&&!/[A-Za-z0-9]/.test(txt)){const S=3,W=Math.ceil(g.right-g.left+2),Hh=L;const c=document.createElement('canvas');c.width=W*S;c.height=Hh*S;const x=c.getContext('2d');x.scale(S,S);x.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;x.fillStyle=cs.color;x.textBaseline='middle';x.fillText(txt,1,Hh/2);frags.push({box,html:`<img data-glyph src="${c.toDataURL('image/png')}" style="position:absolute;left:${(g.left-o.x-1).toFixed(1)}px;top:${(g.top-o.y-(L-g.h)/2).toFixed(1)}px;width:${W}px;height:${Hh}px">`});return;}
    frags.push({box,html:`<div data-line style="position:absolute;left:${(g.left-o.x).toFixed(1)}px;top:${(g.top-o.y-(L-g.h)/2).toFixed(1)}px;width:${Math.ceil(g.right-g.left+2)}px;height:${L}px;line-height:${L}px;white-space:nowrap;${style}">${s.slice(g.start,g.end).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`});});
});
// inline backgrounds (highlights)
const bgs=[];
all.filter(isInline).forEach(e=>{const cs=getComputedStyle(e); if(cs.backgroundColor==='rgba(0, 0, 0, 0)'&&cs.backgroundImage==='none')return; let box=e.parentElement; while(box!==body&&isInline(box))box=box.parentElement; const o=padBox(box);
  [...e.getClientRects()].forEach(r=>bgs.push({box,html:`<div style="position:absolute;left:${(r.left-o.x).toFixed(1)}px;top:${(r.top-o.y).toFixed(1)}px;width:${r.width.toFixed(1)}px;height:${r.height.toFixed(1)}px;background:${cs.backgroundColor};border-radius:2px"></div>`}));});
// opacity of inline ancestors ignored (none expected)
// mutate: remove text nodes, unwrap inline elements
texts.forEach(t=>t.remove());
[...body.querySelectorAll('br')].forEach(b=>b.remove());
all.filter(e=>e.isConnected&&isInline(e)).reverse().forEach(e=>{e.replaceWith(...e.childNodes);});
plan.forEach(({e,p,l,t,w,h,vis})=>{ const st=e.style; Object.entries(vis).forEach(([k,v])=>{ if(k==='background-color'&&st.backgroundImage&&st.backgroundImage!=='none'){} st.setProperty(k,v);}); const keepPos=p===body;
  st.position=keepPos?'relative':'absolute'; if(!keepPos){st.left=l.toFixed(1)+'px';st.top=t.toFixed(1)+'px';st.right='auto';st.bottom='auto';}
  st.width=w.toFixed(1)+'px';st.height=h.toFixed(1)+'px';st.margin='0';st.padding='0';st.boxSizing='border-box';
  if(e.tagName!=='IMG'){st.display='block';} st.flex='none';st.gap='0';st.minHeight='0';st.maxWidth='none';st.whiteSpace='nowrap';});
const insert=(list,prepend)=>list.forEach(f=>{const tmp=document.createElement('div');tmp.innerHTML=f.html;const d=tmp.firstChild; prepend?f.box.insertBefore(d,f.box.firstChild):f.box.appendChild(d);});
insert(bgs.reverse(),true); insert(frags,false);
[...body.querySelectorAll('p,h1,h2,h3,h4,h5,h6,ul,ol,li,header,section,label,button,a')].reverse().forEach(e=>{const d=document.createElement('div');[...e.attributes].forEach(a=>d.setAttribute(a.name,a.value));d.dataset.tag=e.tagName.toLowerCase();d.append(...e.childNodes);e.replaceWith(d);});
zs.forEach(([e,z])=>{const p=e.parentElement; if(!p)return; e.dataset.z=z;});
[...new Set(zs.map(([e])=>e.parentElement).filter(Boolean))].forEach(p=>{const kids=[...p.children];kids.map((k,i)=>[k,parseInt(k.dataset.z||0),i]).sort((a,b)=>a[1]-b[1]||a[2]-b[2]).forEach(([k])=>p.appendChild(k));});
document.documentElement.setAttribute('data-flat','1');
})();
