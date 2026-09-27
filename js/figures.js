/* Forja: figuras animadas de la técnica. Script clásico: comparte variables globales con el resto de js/*.js e index.html. */

/* ============ Figuras animadas (SVG esquemático) ============ */
const ST={head:[100,40],nk:[100,56],sh:[100,58],el:[100,84],ha:[100,108],hip:[100,108],kn:[100,144],ft:[100,180]};
const POSES={
 squat:{face:1,act:'legs',a:{...ST,head:[100,42],sh:[100,60],el:[86,72],ha:[98,60]},b:{head:[111,79],nk:[104,93],sh:[104,95],el:[90,105],ha:[101,92],hip:[82,138],kn:[116,148],ft:[100,180]}},
 bench:{act:'arms',bench:1,nofoot:1,a:{head:[44,104],nk:[60,110],sh:[60,110],el:[62,86],ha:[62,60],hip:[112,112],kn:[146,112],ft:[152,158]},b:{el:[42,126],ha:[60,104]}},
 ohp:{face:1,act:'arms',a:{...ST,el:[116,76],ha:[102,56]},b:{...ST,el:[106,33],ha:[104,8]}},
 row:{face:-1,act:'arms',a:{head:[56,76],nk:[70,86],sh:[70,88],el:[70,114],ha:[72,140],hip:[112,104],kn:[120,140],ft:[112,180]},b:{el:[94,78],ha:[82,102]}},
 pull:{act:'arms',ground:0,bar:1,nofoot:1,a:{head:[110,58],nk:[100,70],sh:[100,70],el:[100,46],ha:[100,22],hip:[100,120],kn:[102,154],ft:[98,186]},b:{head:[110,16],nk:[100,30],sh:[100,30],el:[84,46],ha:[100,22],hip:[100,80],kn:[102,114],ft:[98,146]}},
 curl:{face:-1,act:'arms',anchor:[118,184],a:{...ST,el:[100,86],ha:[102,112]},b:{...ST,el:[100,86],ha:[86,64]}},
 lateral:{front:1,act:'arms',anchor:[156,184],a:{head:[100,38],nk:[100,54],sh:[90,58],sh2:[110,58],el:[86,82],ha:[82,106],el2:[114,82],ha2:[118,106],hip:[100,106],kn:[94,144],ft:[92,180],kn2:[106,144],ft2:[108,180]},b:{el:[66,62],ha:[42,66],el2:[134,62],ha2:[158,66]}},
 hinge:{face:-1,act:'legs',a:{...ST},b:{head:[60,82],nk:[73,88],sh:[73,90],el:[74,116],ha:[76,140],hip:[120,106],kn:[108,144],ft:[100,180]}},
 lunge:{face:-1,act:'legs',a:{...ST,el:[98,84],ha:[98,108],kn:[86,144],ft:[80,180],kn2:[114,144],ft2:[122,180]},b:{head:[100,70],nk:[100,86],sh:[100,88],el:[98,114],ha:[98,138],hip:[100,138],kn:[66,142],ft:[66,180],kn2:[110,170],ft2:[140,178]}},
 plank:{act:'core',nofoot:1,a:{head:[38,144],nk:[54,150],sh:[54,150],el:[56,178],ha:[80,178],hip:[116,154],kn:[142,165],ft:[170,176]},b:{hip:[116,149],kn:[142,163]}},
 pushup:{act:'arms',nofoot:1,a:{head:[40,122],nk:[56,128],sh:[56,128],el:[56,154],ha:[56,180],hip:[116,146],kn:[142,162],ft:[170,178]},b:{head:[42,156],nk:[58,160],sh:[58,160],el:[78,166],ha:[56,180],hip:[118,166],kn:[144,172],ft:[170,178]}},
 calf:{face:1,act:'legs',a:{...ST,toe:[112,182]},b:{head:[100,30],nk:[100,46],sh:[100,48],el:[100,74],ha:[100,98],hip:[100,98],kn:[100,134],ft:[100,170],toe:[112,182]}},
 crunch:{act:'core',nofoot:1,anchor:[20,120],a:{head:[36,168],nk:[50,172],sh:[50,172],el:[40,156],ha:[34,166],hip:[104,174],kn:[128,146],ft:[152,178]},b:{head:[58,140],nk:[66,152],sh:[66,152],el:[56,136],ha:[50,146]}},
 facepull:{face:1,act:'arms',anchor:[194,58],a:{...ST,el:[122,66],ha:[146,62]},b:{...ST,el:[80,64],ha:[100,50]}},
 pushdown:{face:1,act:'arms',anchor:[122,4],a:{...ST,el:[100,86],ha:[122,72]},b:{...ST,el:[100,86],ha:[102,112]}},
 legcurl:{act:'legs',bench:1,nofoot:1,a:{head:[34,106],nk:[48,112],sh:[48,112],el:[40,130],ha:[30,118],hip:[108,112],kn:[144,114],ft:[180,116]},b:{ft:[160,82]}}
};
function poseAt(d,t){const o={};new Set([...Object.keys(d.a),...Object.keys(d.b)]).forEach(k=>{const A=d.a[k]||d.b[k],B=d.b[k]||A;o[k]=[A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t]});return o}
const f1=n=>n.toFixed(1);
function figMarkup(anim,eq,t){
 const d=POSES[anim]||POSES.curl,p=poseAt(d,t),f=d.face||0;
 const pl=(pts,c)=>`<polyline points="${pts.map(q=>f1(q[0])+','+f1(q[1])).join(' ')}" class="${c}"/>`;
 const arm=d.act==='arms'?'fa':'fb',leg=d.act==='legs'?'fa':'fb',core=d.act==='core'?'fa':'fb';
 let s='';
 if(d.ground!==0)s+='<line x1="12" y1="184" x2="188" y2="184" class="fg"/>';
 if(d.bench)s+='<rect x="26" y="118" width="128" height="8" rx="3" class="fp"/><line x1="40" y1="126" x2="40" y2="184" class="fl"/><line x1="140" y1="126" x2="140" y2="184" class="fl"/>';
 if(d.bar)s+='<line x1="46" y1="22" x2="154" y2="22" class="fl"/>';
 if(eq==='cable'&&d.anchor){const a=d.anchor;s+=`<line x1="${a[0]}" y1="${a[1]}" x2="${f1(p.ha[0])}" y2="${f1(p.ha[1])}" class="fc"/><circle cx="${a[0]}" cy="${a[1]}" r="5" class="fpc"/>`}
 if(p.kn2){const tail=d.front?[[p.ft2[0]+9,p.ft2[1]+2]]:f?[[p.ft2[0]+f*11,p.ft2[1]+2]]:[];s+=pl([p.hip,p.kn2,p.ft2,...tail],leg+(d.front?'':' bk'))}
 if(p.el2)s+=pl([p.sh2,p.el2,p.ha2],arm);
 if(d.front)s+=pl([p.sh,p.sh2],'fb');
 s+=pl([p.nk,p.hip],core);
 const foot=d.nofoot?[]:d.front?[[p.ft[0]-9,p.ft[1]+2]]:f?[p.toe||[p.ft[0]+f*11,p.ft[1]+2]]:[];
 s+=pl([p.hip,p.kn,p.ft,...foot],leg);
 s+=pl([p.sh,p.el,p.ha],arm);
 s+=`<circle cx="${f1(p.head[0])}" cy="${f1(p.head[1])}" r="10" class="fh"/>`;
 if(eq==='bar'&&!d.front&&!d.bar)s+=`<circle cx="${f1(p.ha[0])}" cy="${f1(p.ha[1])}" r="14" class="fplate"/><circle cx="${f1(p.ha[0])}" cy="${f1(p.ha[1])}" r="3" class="fhub"/>`;
 if(eq==='db')[p.ha,p.ha2].filter(Boolean).forEach(h=>{s+=`<rect x="${f1(h[0]-9)}" y="${f1(h[1]-5)}" width="18" height="10" rx="3" class="fdb"/>`});
 return s;
}
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function phaseT(ph){if(ph<.12)return 0;if(ph<.5){const x=(ph-.12)/.38;return x*x*(3-2*x)}if(ph<.62)return 1;const x=(ph-.62)/.38;return 1-x*x*(3-2*x)}
let rafOn=false;
function tick(ts){const svgs=document.querySelectorAll('svg[data-anim]');if(!svgs.length){rafOn=false;return}
 svgs.forEach(el=>{const t=reduceMotion?.5:phaseT((ts%2800)/2800);el.innerHTML=figMarkup(el.dataset.anim,el.dataset.eq,t)});requestAnimationFrame(tick)}
function ensureAnim(){if(!rafOn&&document.querySelector('svg[data-anim]')){rafOn=true;requestAnimationFrame(tick)}}
const animSvg=ex=>`<svg viewBox="0 0 200 200" class="fig" data-anim="${ex.anim}" data-eq="${ex.eq}" role="img" aria-label="Animación de la técnica: ${esc(ex.n)}">${figMarkup(ex.anim,ex.eq,0)}</svg>`;
const mini=ex=>`<svg viewBox="0 0 200 200" class="mini" aria-hidden="true">${figMarkup(ex.anim,ex.eq,1)}</svg>`;
