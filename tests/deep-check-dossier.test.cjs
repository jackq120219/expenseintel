'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {makeDossier,validate,computeOption}=require('../lib/deep-check-dossier');
const input=()=>({title:'Replace kitchen appliances',category:'home',years:5,options:[
  {name:'Quote A',price:10000,upfront:500,monthly:20,annual:120,resale:1000,scope:'Includes installation',source:'Signed quote A'},
  {name:'Quote B',price:12000,upfront:0,monthly:10,annual:80,resale:1500,scope:'Includes warranty',source:'Signed quote B'}
]});
test('paid report compares two modeled lifetime costs with a correct delta',()=>{
  const d=makeDossier(input());
  assert.equal(d.options.length,2);
  assert.equal(d.cases[0].options[0].netCost,11300); // 10000+500+(240+120)*5-1000
  assert.equal(d.cases[0].options[1].netCost,11500); // 12000+(120+80)*5-1500
  assert.equal(d.delta,-200);
  assert.match(d.comparison,/Quote A/);
  assert.equal(d.questions.length,3);
  assert.match(d.methodology,/user|entered/i);
});
test('stress test adjusts only documented assumptions, no invented market numbers',()=>{
  const d=makeDossier(input());
  assert.equal(d.cases.length,3);
  assert.equal(d.cases[1].options[0].netCost,10000+575+450*5-800);
  assert.equal(d.cases[2].options[0].netCost,10000+500+324*5-1000);
  assert.match(d.cases[1].description,/not a prediction/);
});
test('bad data, third option, negative prices and nonfinite amounts are rejected',()=>{
  for(const patch of [{years:0},{years:11},{years:2.5},{options:[]},{options:[...input().options,...input().options]}])assert.throws(()=>validate({...input(),...patch}));
  for(const bad of [-1,'NaN','Infinity',''])assert.throws(()=>validate({...input(),options:[{...input().options[0],price:bad},input().options[1]]}));
  assert.throws(()=>validate({...input(),options:[{...input().options[0],annual:-1},input().options[1]]}));
});
test('missing evidence becomes clearly identified open questions; input text is bounded',()=>{
  const d=makeDossier({...input(),options:[{...input().options[0],scope:'',source:''},input().options[1]]});
  assert.ok(d.missing.some(x=>/scope/.test(x)));
  assert.ok(d.missing.some(x=>/no source/.test(x)));
  assert.equal(validate({...input(),title:'a'.repeat(300)}).title.length,120);
  assert.equal(computeOption({price:100,upfront:0,monthly:0,annual:0,resale:0},1).netCost,100);
});
