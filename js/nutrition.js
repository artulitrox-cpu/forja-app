/* Forja: objetivos nutricionales del día (sin DOM). Script clásico.
   Proteína por kg según objetivo, grasa al 25 % (mínimo 0,6 g/kg) y carbohidratos con el resto.
   Las calorías del día (con deporte) vienen de dayKcal(): los días de deporte suben los carbohidratos. */

const PROTEIN_GKG={fat:2.0,hyp:1.8,maint:1.6};
// Con IMC ≥ 30, la proteína se calcula sobre el peso de referencia (IMC 25) para no inflarla.
function refWeight(pr){const b=bmi(pr);return b&&b>=30?Math.round(25*(pr.height/100)**2*10)/10:pr.weight}
function macros(u,now=Date.now()){const pr=u.profile;if(!hasBio(pr))return null;const d=dayKcal(u,now);if(!d.total)return null;
 const rw=refWeight(pr),protein=Math.round((PROTEIN_GKG[pr.goal]||1.6)*rw),fat=Math.round(Math.max(.25*d.total/9,.6*pr.weight));
 const carbs=Math.max(0,Math.round((d.total-protein*4-fat*9)/4));
 return {kcal:d.total,sport:d.sport,protein,fat,carbs,refWeight:rw,perMeal:Math.round(.4*rw)}}
