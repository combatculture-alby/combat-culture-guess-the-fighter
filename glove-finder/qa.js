// Run with: node glove-finder/qa.js
// Dependency-free regression checks for the published Glove Finder snapshot.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,3,'Expected data, engine and UI scripts');
const match=scripts[0].match(/const CC_GLOVES = ([\\s\\S]*?);\\nif \\(typeof window/);
assert.ok(match,'Could not read approved data');
const gloves=JSON.parse(match[1]);
assert.equal(gloves.length,47,'Unexpected number of approved gloves');
const module={exports:{}};
vm.runInNewContext(scripts[1],{module,window:{}});
new vm.Script(scripts[2]); // UI syntax check
const engine=module.exports;
let combinations=0;
const ceilings={under100:100,b100to200:200,b200to300:300,b300plus:Infinity};
for(const sport of ['Boxing','Muay Thai','Kickboxing','MMA','Fitness'])
for(const use of ['Sparring','Bag & Pads','Both'])
for(const budget of Object.keys(ceilings))
for(const fit of ['Snug','Normal','Roomy','Any'])
for(const priorities of [['none'],['Value'],['Protection'],['Comfort'],['Feedback'],['Versatility'],['Value','Comfort']]){
  const a={sport,use,budget,fit,priorities};
  const result=engine.recommend(gloves,a);
  assert.ok(result.matches.length<=3);
  assert.equal(new Set(result.matches.map(g=>g.id)).size,result.matches.length);
  for(const g of result.matches){
    assert.equal(g.approved,true);
    assert.ok(g.msrp<=ceilings[budget]);
    assert.ok(engine.useFits(g,use),'Invalid training use');
    if(sport==='Fitness'&&use==='Bag & Pads')assert.ok(g.msrp<=200,'Fitness cap exceeded');
  }
  combinations++;
}
assert.ok(gloves.find(g=>g.brand==='Primo'&&g.model==='Emblem 2'));
assert.equal(gloves.find(g=>g.brand==='Combat Corner'&&g.model==='Cream').use,'Both');
assert.equal(gloves.find(g=>g.brand==='Casanova').use,'Both');
console.log('PASS:',gloves.length,'approved gloves,',combinations,'quiz combinations, UI syntax');
