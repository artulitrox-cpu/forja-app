/* Forja: idioma de la interfaz (español / inglés). Script clásico.
   La app se escribe en español y se traduce al pintarse: un observador recorre los textos y atributos visibles
   y los sustituye con el diccionario de js/i18n-en.js (frases exactas y patrones con partes variables).
   Lo que no esté en el diccionario se queda en español, así que nada se rompe si falta una traducción. */

const LANG_KEY='forja.lang';
let LANG=(()=>{try{const l=localStorage.getItem(LANG_KEY);if(l==='es'||l==='en')return l}catch(e){}
 return typeof navigator!=='undefined'&&/^es/i.test(navigator.language||'es')?'es':'en'})();
const LOC=()=>LANG==='en'?'en-GB':'es-ES';
// Traduce una cadena completa (conserva los espacios de los extremos). Sin traducción, devuelve el original.
function tr(s){if(LANG!=='en'||s==null)return s;const str=String(s),m=str.match(/^(\s*)([\s\S]*?)(\s*)$/),core=m[2];if(!core)return str;
 const d=typeof I18N_EN!=='undefined'?I18N_EN:null;if(!d)return str;
 let out=d.dict[core];
 if(out==null)for(const [re,rep] of d.patterns){if(re.test(core)){out=core.replace(re,typeof rep==='function'?rep:rep);break}}
 if(out==null&&typeof window!=='undefined'&&window.__i18nMissing)window.__i18nMissing.add(core);
 return out==null?str:m[1]+out+m[3]}
/* ---- Traducción del DOM ---- */
const TR_ATTRS=['aria-label','placeholder','title','alt'];
const hasLetters=/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/;
function translateTree(root){if(LANG!=='en'||!root)return;
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentNode&&n.parentNode.nodeName;return p==='SCRIPT'||p==='STYLE'?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}});
 const nodes=[];while(w.nextNode())nodes.push(w.currentNode);
 nodes.forEach(n=>{const v=n.nodeValue;if(!v||!hasLetters.test(v))return;const t=tr(v);if(t!==v)n.nodeValue=t});
 const els=root.querySelectorAll?root.querySelectorAll(TR_ATTRS.map(a=>`[${a}]`).join(',')):[];
 [root,...els].forEach(el=>{if(!el.getAttribute)return;TR_ATTRS.forEach(a=>{const v=el.getAttribute(a);if(v&&hasLetters.test(v)){const t=tr(v);if(t!==v)el.setAttribute(a,t)}})})}
let trPending=false;
function translateSoon(){if(LANG!=='en'||trPending)return;trPending=true;queueMicrotask(()=>{trPending=false;translateTree(document.body)})}
if(typeof document!=='undefined'){
 const start=()=>{document.documentElement.lang=LANG;if(LANG==='en'){document.title=tr(document.title);translateTree(document.body)}
  new MutationObserver(translateSoon).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:TR_ATTRS})};
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
 // Los diálogos nativos también se traducen.
 const _confirm=window.confirm.bind(window),_alert=window.alert.bind(window);
 window.confirm=m=>_confirm(tr(m));window.alert=m=>_alert(tr(m));}
function setLang(l){if(l!=='es'&&l!=='en')return;try{localStorage.setItem(LANG_KEY,l)}catch(e){}location.reload()}
// Selector de idioma.
const langSelect=(id='lang-sel')=>`<label class="sr-only" for="${id}">Idioma</label><select id="${id}" class="langsel" data-lang-sel>${[['es','ES'],['en','EN']].map(([v,l])=>`<option value="${v}" ${LANG===v?'selected':''}>${l}</option>`).join('')}</select>`;
if(typeof document!=='undefined')document.addEventListener('change',e=>{if(e.target&&e.target.matches&&e.target.matches('[data-lang-sel]'))setLang(e.target.value)});
