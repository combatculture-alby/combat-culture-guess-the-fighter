// Run with: node glove-finder/qa.js
// Dependency-free regression checks for the published Glove Finder snapshot.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const scripts=html.split('<script>').slice(1).map(x=>x.split('</script>')[0]);
assert.equal(scripts.length,3,'Expected data, engine and UI scripts');
const start=scripts[0].indexOf('const CC_GLOVES = ')+'const CC_GLOVES = '.length;
const end=scripts[0].indexOf(';\nif (typeof window',start);
assert.ok(start>20&&end>start,'Could not read approved data');
const gloves=JSON.parse(scripts[0].slice(start,end));
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
// Editorial benchmark from the owner's firsthand Muay Thai sparring preferences.
const sparring200=engine.recommend(gloves,{
  sport:'Muay Thai',use:'Sparring',budget:'b100to200',fit:'Any',priorities:['none']
}).matches.map(g=>g.id);
assert.equal(JSON.stringify(sparring200),
  JSON.stringify(['fairtex-bgv1','thaismai-bg121','primo-emblem-2']),
  'Muay Thai sparring editorial ranking changed unexpectedly');
assert.ok(gloves.find(g=>g.brand==='Primo'&&g.model==='Emblem 2'));
assert.equal(gloves.find(g=>g.brand==='Combat Corner'&&g.model==='Cream').use,'Both');
assert.equal(gloves.find(g=>g.brand==='Casanova').use,'Both');
console.log('PASS:',gloves.length,'approved gloves,',combinations,'quiz combinations, UI syntax');
