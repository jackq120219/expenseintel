'use strict';
// A heuristic for questions to ask, never a statement that an item is excluded.
const TERMS=[
  ['Permits',/\bpermit(s|ting)?\b/i],
  ['Installation',/\binstall(ation|ed|ing)?\b/i],
  ['Electrical work',/\belectrical|electrician|wiring\b/i],
  ['Removal and disposal',/\bremov(al|e)|disposal|haul(?:ing)?\b/i],
  ['Warranty',/\bwarrant(y|ies)|guarantee\b/i],
  ['Labor',/\blabou?r|manhours|man-hours\b/i],
  ['Maintenance',/\bmaintenan(ce)|service plan\b/i],
  ['Delivery',/\bdeliver(y|ed)|shipping|freight\b/i],
  ['Taxes',/\btax(?:es)?\b/i],
  ['Inspection',/\binspect(ion|ed|ing)?\b/i]
];
function compareScopes(options){
  if(!Array.isArray(options)||options.length!==2)return [];
  const [a,b]=options;
  const left=String(a.scope||''),right=String(b.scope||'');
  if(!left.trim()||!right.trim())return ['Enter both written scopes to identify possible differences in included work.'];
  const findings=[];
  for(const [name,pattern] of TERMS){
    const hitA=pattern.test(left),hitB=pattern.test(right);
    if(hitA!==hitB){
      const mentioned=hitA?a:b,other=hitA?b:a;
      findings.push(`${name} is mentioned in ${mentioned.name}'s notes but not ${other.name}'s. Ask both sellers whether it is included; silence does not mean exclusion.`);
    }
  }
  return findings.length?findings:['No differences were detected among the listed scope keywords. This does not establish that the two full contracts match.'];
}
module.exports={compareScopes};
