/* Super Animateur : jeu de plateforme original, niveau 1 « La ruche » */
(function(){
"use strict";
const T=32,ROWS=14,W=800,H=448,COLS=204,DT=1/60;
const cv=document.getElementById("pf");
if(!cv)return;
const ctx=cv.getContext("2d");
const img=new Image();img.src="visage.webp";
const JAUNE="#ffcc00",MIEL="#a88600",BLANC="#fff",NOIR="#000";
const son=(f,t,d,ty,v)=>{if(typeof note==="function")note(f,t,d,ty,v)};
const fr=n=>n.toLocaleString("fr-FR");

let g,ennemis,P,cam,etat="attente",vies,cagnotte,temps,horloge=0,effets,reprise,actif=false,raf=0,dernier=0,acc=0;
const touches={g:false,d:false,s:false};let sautTampon=0;
const REPRISES=[2,44,80,116,155];

function niveau(){
  g=[];for(let r=0;r<ROWS;r++)g.push(new Array(COLS).fill(" "));
  const set=(c,r,ch)=>{if(r>=0&&r<ROWS&&c>=0&&c<COLS)g[r][c]=ch};
  const sol=(a,b)=>{for(let c=a;c<=b;c++){set(c,12,"#");set(c,13,"#")}};
  const plat=(c,r,n)=>{for(let i=0;i<n;i++)set(c+i,r,"K")};
  const pot=(c,h)=>{for(let i=0;i<h;i++){const ch=i===h-1?"p":"P";set(c,11-i,ch);set(c+1,11-i,ch)}};
  const pieces=(c,r,n)=>{for(let i=0;i<n;i++)set(c+i,r,"o")};
  sol(0,38);sol(42,75);sol(79,110);sol(115,150);sol(154,COLS-1);
  pieces(6,11,3);set(10,8,"B");plat(13,8,5);set(15,8,"B");set(15,4,"B");
  pot(22,2);pot(30,3);pieces(39,8,3);
  plat(46,8,5);pieces(46,7,5);plat(53,5,4);set(54,5,"B");pieces(53,4,4);
  pot(64,2);pot(70,3);pieces(76,8,3);
  plat(84,8,5);set(86,8,"B");plat(92,6,4);pieces(92,5,4);pot(100,2);pieces(104,11,3);
  plat(112,9,2);pieces(112,8,2);
  plat(120,8,5);set(122,8,"B");set(123,4,"B");plat(128,8,4);pieces(128,7,4);
  pot(138,3);pot(144,2);pieces(151,8,3);
  plat(158,8,3);set(159,8,"B");pieces(164,11,4);
  for(let i=0;i<5;i++)for(let j=0;j<=i;j++)set(176+i,11-j,"K");
  for(let j=0;j<5;j++)set(181,11-j,"K");
  ennemis=[];
  [18,27,34,49,58,61,87,96,106,122,134,141,160,167,172].forEach(c=>ennemis.push({t:"m",x:c*T,y:12*T-24,w:28,h:24,vx:-55,vy:0,mort:0}));
  [[44,6],[82,6],[113,6],[148,7],[170,6]].forEach(([c,r])=>ennemis.push({t:"v",x:c*T,y:r*T,w:28,h:22,x0:c*T,y0:r*T,ph:Math.random()*6,mort:0}));
  /* les marcheurs posés sur une plateforme partent de la bonne hauteur */
  ennemis.forEach(e=>{if(e.t==="m"){const c=Math.floor((e.x+14)/T);for(let r=0;r<ROWS;r++)if(solide(c,r)){e.y=r*T-e.h;break}}});
}
const DRAPEAU=188;
function solide(c,r){if(c<0||c>=COLS)return true;if(r<0||r>=ROWS)return false;return "#KBbPp".includes(g[r][c])}

function nouvellePartie(){niveau();vies=3;cagnotte=0;temps=200;effets=[];reprise=0;placer();etat="jeu"}
function placer(){P={x:REPRISES[reprise]*T,y:12*T-46,w:22,h:46,vx:0,vy:0,dir:1,sol:false,coyote:0,inv:1.5};cam=Math.max(0,P.x-200)}

function bougerX(e,dx){
  e.x+=dx;const r0=Math.floor(e.y/T),r1=Math.floor((e.y+e.h-1)/T);
  if(dx>0){const c=Math.floor((e.x+e.w)/T);for(let r=r0;r<=r1;r++)if(solide(c,r)){e.x=c*T-e.w-.01;return true}}
  else if(dx<0){const c=Math.floor(e.x/T);for(let r=r0;r<=r1;r++)if(solide(c,r)){e.x=(c+1)*T+.01;return true}}
  return false;
}
function bougerY(e,dy){
  e.y+=dy;const c0=Math.floor(e.x/T),c1=Math.floor((e.x+e.w-1)/T);
  if(dy>0){const r=Math.floor((e.y+e.h)/T);for(let c=c0;c<=c1;c++)if(solide(c,r)){e.y=r*T-e.h;return{c,r,bas:true}}}
  else if(dy<0){
    const r=Math.floor(e.y/T),cm=Math.floor((e.x+e.w/2)/T);let hit=null;
    for(let c=c0;c<=c1;c++)if(solide(c,r)&&(!hit||c===cm))hit={c,r,haut:true};
    if(hit){e.y=(r+1)*T;return hit}
  }
  return null;
}
function toucher(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function gain(n,x,y){cagnotte+=n;effets.push({x,y,txt:"+"+fr(n)+" €",t:0})}

function perdreVie(){
  if(etat!=="jeu")return;
  vies--;[392,311,233,156].forEach((f,i)=>son(f,i*.12,.2,"square",.06));
  if(vies<=0){etat="perdu";return}
  temps=Math.max(temps,60);placer();
}

function pas(){
  horloge+=DT;
  if(etat!=="jeu")return;
  temps-=DT;if(temps<=0){temps=0;perdreVie();if(etat==="jeu")temps=200;return}
  const p=P,dir=(touches.d?1:0)-(touches.g?1:0);
  if(dir){p.vx+=dir*1800*DT;p.dir=dir}else{const f=1600*DT;p.vx=Math.abs(p.vx)<=f?0:p.vx-Math.sign(p.vx)*f}
  p.vx=Math.max(-250,Math.min(250,p.vx));
  sautTampon-=DT;p.coyote-=DT;if(p.inv>0)p.inv-=DT;
  if(sautTampon>0&&(p.sol||p.coyote>0)){p.vy=-760;p.sol=false;p.coyote=0;sautTampon=0;son(420,0,.08,"square",.05);son(640,.06,.12,"square",.05)}
  if(!touches.s&&p.vy<-300)p.vy=-300;
  p.vy=Math.min(900,p.vy+2200*DT);
  if(bougerX(p,p.vx*DT))p.vx=0;
  const h=bougerY(p,p.vy*DT);
  if(h&&h.bas){p.vy=0;p.sol=true;p.coyote=.09}
  else{
    p.sol=false;
    if(h&&h.haut){
      p.vy=60;
      if(g[h.r][h.c]==="B"){g[h.r][h.c]="b";gain(500,h.c*T+16,h.r*T-6);son(988,0,.07,"square",.06);son(1319,.07,.2,"square",.06)}
      else son(140,0,.06,"square",.05);
    }
  }
  /* pièces */
  for(let r=Math.floor(p.y/T);r<=Math.floor((p.y+p.h-1)/T);r++)for(let c=Math.floor(p.x/T);c<=Math.floor((p.x+p.w-1)/T);c++)
    if(r>=0&&r<ROWS&&c>=0&&c<COLS&&g[r][c]==="o"){g[r][c]=" ";gain(100,c*T+16,r*T);son(1319,0,.06,"square",.05);son(1760,.06,.12,"square",.05)}
  /* ennemis */
  for(const e of ennemis){
    if(e.mort){e.mort+=DT;continue}
    if(Math.abs(e.x-p.x)>900)continue;
    if(e.t==="m"){
      const devant=Math.floor((e.vx>0?e.x+e.w+2:e.x-2)/T),pied=Math.floor((e.y+e.h+2)/T);
      if(bougerX(e,e.vx*DT)||!solide(devant,pied))e.vx=-e.vx;
    }else{e.x=e.x0+Math.sin(horloge*1.1+e.ph)*90;e.y=e.y0+Math.sin(horloge*2.3+e.ph)*26}
    if(toucher(p,e)){
      if(p.vy>0&&p.y+p.h-e.y<16){e.mort=.001;p.vy=touches.s?-640:-420;gain(200,e.x+14,e.y);son(180,0,.12,"square",.08);son(90,.05,.12,"square",.08)}
      else if(p.inv<=0){perdreVie();return}
    }
  }
  for(const f of effets)f.t+=DT;
  effets=effets.filter(f=>f.t<.9);
  for(let i=REPRISES.length-1;i>reprise;i--)if(p.x>REPRISES[i]*T){reprise=i;break}
  if(p.y>H+80){perdreVie();return}
  if(p.x+p.w>DRAPEAU*T+10){
    const bonus=Math.floor(temps)*50;gain(5000+bonus,p.x,p.y-20);etat="gagne";
    if(typeof sfx==="function")sfx("million");
  }
  cam+=(Math.max(0,Math.min(COLS*T-W,p.x-300))-cam)*.15;
}

/* ---------- Dessin ---------- */
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function hexa(x,y,r){ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i+Math.PI/6;ctx[i?"lineTo":"moveTo"](x+r*Math.cos(a),y+r*Math.sin(a))}ctx.closePath()}
function fond(){
  ctx.fillStyle=NOIR;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="#211d05";ctx.lineWidth=2;
  const r=44,dx=r*Math.sqrt(3),dy=r*1.5,off=(cam*.3)%dx;
  for(let j=-1;j<H/dy+1;j++)for(let i=-1;i<W/dx+2;i++){hexa(i*dx+(j%2?dx/2:0)-off,j*dy,r);ctx.stroke()}
  ctx.fillStyle="#3a3410";
  for(let i=0;i<5;i++){const x=((i*370-cam*.5)%1850+1850)%1850-200;hexa(x,330-i%2*40,70);ctx.fill()}
}
function tuile(ch,x,y,c,r){
  if(ch==="#"){
    ctx.fillStyle=JAUNE;ctx.fillRect(x,y,T,T);
    if(r===12){ctx.fillStyle=NOIR;for(let i=0;i<2;i++)ctx.fillRect(x+i*16+4,y+6,8,5);ctx.fillStyle=BLANC;ctx.fillRect(x,y,T,4)}
    else{ctx.fillStyle=MIEL;ctx.fillRect(x+((c%2)*16),y+8,12,6)}
  }else if(ch==="K"){
    ctx.fillStyle=MIEL;ctx.fillRect(x,y,T,T);ctx.strokeStyle=NOIR;ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,T-2,T-2);
    ctx.beginPath();ctx.moveTo(x,y+16);ctx.lineTo(x+T,y+16);ctx.moveTo(x+16,y);ctx.lineTo(x+16,y+16);ctx.moveTo(x+8,y+16);ctx.lineTo(x+8,y+T);ctx.moveTo(x+24,y+16);ctx.lineTo(x+24,y+T);ctx.stroke();
  }else if(ch==="B"||ch==="b"){
    ctx.fillStyle=ch==="B"?BLANC:"#3d3d3d";ctx.fillRect(x,y,T,T);ctx.strokeStyle=ch==="B"?JAUNE:"#666";ctx.lineWidth=3;ctx.strokeRect(x+1.5,y+1.5,T-3,T-3);
    if(ch==="B"){ctx.fillStyle=NOIR;ctx.font="900 20px Archivo,system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("€",x+16,y+17+Math.sin(horloge*5)*1.5)}
  }else if(ch==="P"||ch==="p"){
    const gauche=c>0&&g[r][c-1]!==ch;
    ctx.fillStyle=JAUNE;ctx.fillRect(x,y,T,T);
    ctx.fillStyle="#ffe680";if(gauche)ctx.fillRect(x+6,y,5,T);
    ctx.fillStyle=MIEL;if(!gauche)ctx.fillRect(x+T-6,y,6,T);
    if(ch==="p"){ctx.fillStyle=BLANC;ctx.fillRect(x-(gauche?3:0),y,T+3,9);ctx.fillStyle=NOIR;ctx.fillRect(x-(gauche?3:0),y+9,T+3,2)}
  }else if(ch==="o"){
    const b=Math.sin(horloge*4+c)*2,sx=Math.abs(Math.cos(horloge*3+c));
    ctx.fillStyle=JAUNE;ctx.beginPath();ctx.ellipse(x+16,y+16+b,3+sx*7,10,0,0,7);ctx.fill();
    ctx.strokeStyle=BLANC;ctx.lineWidth=1.5;ctx.stroke();
    if(sx>.6){ctx.fillStyle=NOIR;ctx.font="900 12px Archivo,system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("€",x+16,y+17+b)}
  }
}
function frelon(e,x,y){
  ctx.save();ctx.translate(x+e.w/2,y+e.h/2);
  if(e.mort){ctx.scale(1,Math.max(.15,1-e.mort*6));ctx.translate(0,8);ctx.globalAlpha=Math.max(0,1-e.mort*2)}
  const sens=e.t==="m"?(e.vx>0?1:-1):1;ctx.scale(sens,1);
  if(e.t==="v"){ctx.fillStyle="rgba(255,255,255,.75)";const a=Math.sin(horloge*40)*.5;
    ctx.beginPath();ctx.ellipse(-3,-12,5,11,-.5+a,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(5,-12,5,11,.5-a,0,7);ctx.fill()}
  ctx.fillStyle=JAUNE;ctx.beginPath();ctx.ellipse(0,0,14,10,0,0,7);ctx.fill();
  ctx.save();ctx.clip();ctx.fillStyle=NOIR;ctx.fillRect(-7,-12,4,24);ctx.fillRect(1,-12,4,24);ctx.restore();
  ctx.strokeStyle=BLANC;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,14,10,0,0,7);ctx.stroke();
  ctx.fillStyle=BLANC;ctx.beginPath();ctx.arc(9,-3,4,0,7);ctx.fill();ctx.fillStyle=NOIR;ctx.beginPath();ctx.arc(10,-3,2,0,7);ctx.fill();
  ctx.strokeStyle=BLANC;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(5,-6);ctx.lineTo(13,-8);ctx.stroke();
  if(e.t==="m"&&!e.mort){const k=Math.sin(horloge*14)*3;ctx.beginPath();ctx.moveTo(-6,9);ctx.lineTo(-6-k,13);ctx.moveTo(6,9);ctx.lineTo(6+k,13);ctx.stroke()}
  ctx.restore();
}
function heros(x,y){
  const p=P;ctx.save();ctx.translate(x+p.w/2,y);ctx.scale(p.dir,1);
  if(p.inv>0&&Math.floor(p.inv*12)%2)ctx.globalAlpha=.35;
  const air=!p.sol,cours=p.sol&&Math.abs(p.vx)>20?Math.sin(horloge*18):0;
  ctx.lineCap="round";ctx.strokeStyle=BLANC;ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(-4,36);ctx.lineTo(-4+cours*7,air?41:45);ctx.moveTo(4,36);ctx.lineTo(4-cours*7,air?43:45);ctx.stroke();
  ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-9,27);ctx.lineTo(-15,air?16:33+cours*3);ctx.moveTo(9,27);ctx.lineTo(15,air?16:33-cours*3);ctx.stroke();
  ctx.fillStyle="#1a1a1a";ctx.lineWidth=2;rr(-10,22,20,17,5);ctx.fill();ctx.stroke();
  ctx.fillStyle=JAUNE;ctx.fillRect(2,29,6,3);
  const bob=cours*1.2;
  if(img.complete&&img.naturalWidth)ctx.drawImage(img,-22,-32+bob,44,61);
  else{ctx.fillStyle="#d9a07c";ctx.beginPath();ctx.ellipse(0,4,14,19,0,0,7);ctx.fill()}
  ctx.restore();
}
function decorFin(){
  const x=DRAPEAU*T-cam+16;
  ctx.fillStyle=BLANC;ctx.fillRect(x-2,3*T,4,9*T);
  ctx.fillStyle=JAUNE;hexa(x+26,3*T+24+Math.sin(horloge*3)*2,22);ctx.fill();ctx.strokeStyle=BLANC;ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle=NOIR;ctx.font="900 18px Archivo,system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("€",x+26,3*T+26+Math.sin(horloge*3)*2);
  const rx=195*T-cam;
  for(let i=0;i<5;i++){ctx.fillStyle=i%2?MIEL:JAUNE;rr(rx+i*9,12*T-(5-i)*26-26+0,150-i*18,28,12);ctx.fill()}
  ctx.fillStyle=NOIR;ctx.beginPath();ctx.ellipse(rx+75,12*T-16,14,16,0,0,7);ctx.fill();
}
function texteCentre(l1,l2,l3){
  ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(0,0,W,H);
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillStyle=BLANC;ctx.font="900 44px Archivo,system-ui,sans-serif";ctx.fillText(l1,W/2,170);
  if(l2){ctx.fillStyle=JAUNE;ctx.font="900 34px Archivo,system-ui,sans-serif";ctx.fillText(l2,W/2,230)}
  ctx.fillStyle=BLANC;ctx.font="600 18px Archivo,system-ui,sans-serif";ctx.fillText(l3,W/2,290);
}
function dessiner(){
  const s=cv.width/W;ctx.setTransform(s,0,0,s,0,0);
  fond();
  const c0=Math.floor(cam/T);
  for(let r=0;r<ROWS;r++)for(let c=c0;c<=c0+25&&c<COLS;c++){const ch=g[r][c];if(ch!==" ")tuile(ch,c*T-cam,r*T,c,r)}
  decorFin();
  for(const e of ennemis)if(e.mort<.5&&e.x>cam-40&&e.x<cam+W+40)frelon(e,e.x-cam,e.y);
  heros(P.x-cam,P.y);
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="800 15px Archivo,system-ui,sans-serif";
  for(const f of effets){ctx.fillStyle=f.t<.6?JAUNE:"rgba(255,204,0,.5)";ctx.fillText(f.txt,f.x-cam,f.y-f.t*50)}
  ctx.textBaseline="top";ctx.font="800 18px Archivo,system-ui,sans-serif";
  ctx.textAlign="left";ctx.fillStyle=BLANC;ctx.fillText("Cagnotte",16,12);ctx.fillStyle=JAUNE;ctx.fillText(fr(cagnotte)+" €",104,12);
  ctx.textAlign="center";ctx.fillStyle=BLANC;ctx.fillText("Vies "+vies,W/2,12);
  ctx.textAlign="right";ctx.fillText("Temps "+Math.ceil(temps),W-16,12);
  if(etat==="attente")texteCentre("Super Animateur","Niveau 1 : la ruche","Espace ou un toucher pour commencer");
  if(etat==="gagne")texteCentre("Niveau terminé",fr(cagnotte)+" €","Espace ou un toucher pour rejouer");
  if(etat==="perdu")texteCentre("Partie terminée",fr(cagnotte)+" €","Espace ou un toucher pour réessayer");
}

/* ---------- Boucle ---------- */
function taille(){const s=Math.min(2,window.devicePixelRatio||1);if(cv.width!==W*s){cv.width=W*s;cv.height=H*s}}
function boucle(t){
  if(!actif){raf=0;return}
  raf=requestAnimationFrame(boucle);
  acc+=Math.min(.1,(t-dernier)/1000||0);dernier=t;
  while(acc>=DT){pas();acc-=DT}
  dessiner();
}
function action(){if(etat!=="jeu"){nouvellePartie();return true}return false}
function sauter(){if(!action())sautTampon=.12}

const CLES={ArrowLeft:"g",KeyA:"g",KeyQ:"g",ArrowRight:"d",KeyD:"d",ArrowUp:"s",KeyW:"s",KeyZ:"s",Space:"s"};
window.addEventListener("keydown",e=>{
  if(!actif)return;const k=CLES[e.code];if(!k)return;
  e.preventDefault();
  if(k==="s"&&!touches.s&&!e.repeat)sauter();
  touches[k]=true;
});
window.addEventListener("keyup",e=>{const k=CLES[e.code];if(k)touches[k]=false});
window.addEventListener("blur",()=>{touches.g=touches.d=touches.s=false});
cv.addEventListener("pointerdown",e=>{e.preventDefault();action()});
[["pf-g","g"],["pf-d","d"],["pf-s","s"]].forEach(([id,k])=>{
  const b=document.getElementById(id);if(!b)return;
  const on=e=>{e.preventDefault();if(k==="s")sauter();else action();touches[k]=true;try{b.setPointerCapture(e.pointerId)}catch(x){}};
  const off=()=>{touches[k]=false};
  b.addEventListener("pointerdown",on);b.addEventListener("pointerup",off);b.addEventListener("pointercancel",off);b.addEventListener("lostpointercapture",off);
  b.addEventListener("contextmenu",e=>e.preventDefault());
});
window.addEventListener("resize",taille);

niveau();vies=3;cagnotte=0;temps=200;effets=[];reprise=0;placer();P.inv=0;
window.Plateforme={
  entrer(){actif=true;taille();dernier=performance.now();acc=0;if(!raf)raf=requestAnimationFrame(boucle)},
  sortir(){actif=false;touches.g=touches.d=touches.s=false}
};
})();
