// Run with: node glove-finder/qa.js
// Dependency-free regression checks for the published Glove Finder snapshot.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const scripts=html.split('<script>').slice(1).map(x=>x.split('</script>')[0]);
assert.ok(html.includes('assets/branding-sprite.webp'),'Brand sprite stylesheet missing');
assert.ok(html.includes('class="brand-ko-logo"'),'KO logo missing');
assert.equal(scripts.length,3,'Expected data, engine and UI scripts');
const start=scripts[0].indexOf('const CC_GLOVES = ')+'const CC_GLOVES = '.length;
const end=scripts[0].indexOf(';\nif (typeof window',start);
assert.ok(start>20&&end>start,'Could not read approved data');
const gloves=JSON.parse(scripts[0].slice(start,end));
assert.equal(gloves.length,50,'Unexpected number of approved gloves');
const module={exports:{}};
vm.runInNewContext(scripts[1],{module,window:{}});
new vm.Script(scripts[2]); // UI syntax check
const engine=module.exports;
assert.equal(gloves.filter(g=>Number.isFinite(g.onlinePriceUsd)&&g.onlinePriceUsd>0undefined'Unexpected priced glove count');
assert.equal(gloves.find(g=>g.id==='fairtex-bgv1').onlinePriceUsd,139,'Fairtex should use online, not reviewer price');
let combinations=0;
const ceilings={under100:100,b100to200:200,b200to300:300,b300plus:Infinity};
for(const sport of ['Boxing','Muay Thai','Kickboxing','MMA','Fitness'])
for(const use of ['Sparring','Bag & Pads','Both'])
for(const budget of Object.keys(ceilings))
for(const fit of ['Snug','Normal','Roomy','Any'])
for(const priorities of [['none'],['Value'],['Protection'],['Comfort'],['Feedback'],['Versatility'],['Breathability'],['Compactness']])
for(const style of ['Any','Japanese','Thai','Mexican'])
for(const material of ['Any','Genuine Leather','Synthetic']){
  const a={sport,use,budget,fit,priorities,style,material};
  const result=engine.recommend(gloves,a);
  assert.ok(result.matches.length<=4,'More than four results');
  assert.equal(new Set(result.matches.map(g=>g.id)).size,result.matches.length,'Duplicate result');
  const stretchMax=ceilings[budget]+Math.min(75,Math.max(25,ceilings[budget]*0.25));
  for(const g of result.matches){
    assert.equal(g.approved,true);
    assert.ok(sport==='MMA'&&(use==='Sparring'||use==='Both') ? (g.gloveType==='MMA Sparring'&&(g.use==='Sparring'||g.use==='Both')) : engine.useFits(g,use),'Invalid training use');
    assert.ok(Number.isFinite(g.onlinePriceUsd)&&g.onlinePriceUsd>0,'Unsourced price displayed');
    if(g.kind==='Stretch pick'){
      assert.ok(g.onlinePriceUsd>ceilings[budget]&&g.onlinePriceUsd<=stretchMax,'Stretch price invalid');
      assert.ok(!(sport==='Fitness'&&use==='Bag & Pads'),'Cardio stretch disallowed');
    } else {
      assert.ok(g.onlinePriceUsd<=ceilings[budget],'In-budget option exceeded cap');
    }
    if(sport==='Fitness'&&use==='Bag & Pads')assert.ok(g.onlinePriceUsd<=200,'Fitness cap exceeded');
  }
  combinations++;
}
// MMA branch: bag work can use boxing gloves, but sparring must not.
const mmaBase={sport:'MMA',budget:'b100to200',fit:'Any',priorities:['none'],style:'Any',material:'Any'};
const mmaBag=engine.recommend(gloves,{...mmaBase,use:'Bag & Pads'});
assert.ok(mmaBag.matches.length>0,'MMA bag work should retain boxing glove options');
assert.ok(mmaBag.matches.every(g=>!g.gloveType||g.gloveType==='Boxing'),'MMA bag work returned an MMA sparring glove');
const mmaModels=new Set(['onx-freedom-250-mma-sparring','isami-pounding-gloves','fairtex-fgv18-mma-sparring']);
assert.equal(gloves.filter(g=>g.gloveType==='MMA Sparring').length,3,'Expected three MMA sparring models');
for(const use of ['Sparring','Both']){
  for(const budget of Object.keys(ceilings)){
    const result=engine.recommend(gloves,{...mmaBase,use,budget});
    assert.ok(result.matches.length>0,'Missing MMA sparring options for '+use+' '+budget);
    assert.ok(result.matches.every(g=>g.gloveType==='MMA Sparring'&&mmaModels.has(g.id)),'Boxing glove leaked into MMA '+use);
    assert.ok(result.matches.every(g=>g.use==='Sparring'||g.use==='Both'),'Unsafe MMA glove use');
    assert.ok(result.matches.some(g=>g.id==='fairtex-fgv18-mma-sparring'),'Affordable Fairtex MMA sparring glove missing');
  }
}
assert.ok(mmaBag.matches.every(g=>g.gloveType==='Boxing'),'MMA bag route must use ordinary striking gloves only');
assert.equal(gloves.find(g=>g.id==='onx-freedom-250-mma-sparring').onlinePriceUsd,249);
assert.equal(gloves.find(g=>g.id==='isami-pounding-gloves').onlinePriceUsd,139.95);
assert.equal(gloves.find(g=>g.id==='fairtex-fgv18-mma-sparring').onlinePriceUsd,99);
// Firsthand MMA assessments must change rankings for striking and grappling goals.
const mmaRank=(priority)=>engine.recommend(gloves,{
  sport:'MMA',use:'Sparring',budget:'b300plus',fit:'Any',style:'Any',material:'Any',priorities:[priority]
}).matches.map(g=>g.id);
assert.equal(mmaRank('Protection')[0],'onx-freedom-250-mma-sparring','ONX should lead protection');
assert.equal(mmaRank('Grappling Mobility')[0],'fairtex-fgv18-mma-sparring','Fairtex should lead grappling');
assert.equal(mmaRank('Striking')[0],'isami-pounding-gloves','Isami should lead striking');
assert.equal(gloves.find(g=>g.id==='isami-pounding-gloves').testedWeight,'XL','Preserve owner-reported XL despite retailer one-size description');
assert.equal(gloves.find(g=>g.id==='fairtex-fgv18-mma-sparring').mmaProtection,'Average','Fairtex padding caution matters');
const ms600=gloves.find(g=>g.id==='winnings-ms-600');
assert.ok(ms600&&ms600.testedWeight==='16 oz'&&ms600.use==='Both','Winning MS-600 missing 16oz sparring suitability');
assert.equal(ms600.onlinePriceUsd,535,'Winning MS-600 price is not the verified exact-model listing');
for(const use of ['Sparring','Both']){
  const premium=engine.recommend(gloves,{sport:'Boxing',use,budget:'b300plus',fit:'Any',
    priorities:['Protection'],style:'Any',material:'Any'});
  assert.ok(premium.matches.some(g=>g.id==='winnings-ms-600'),'MS-600 should surface as a premium sparring option');
  assert.ok(!premium.matches.some(g=>g.brand==='Pro Mex'),'High budget and protection priority should not force Pro Mex');
}
const valueOptions=engine.recommend(gloves,{sport:'Boxing',use:'Both',budget:'b300plus',fit:'Any',
  priorities:['Value'],style:'Any',material:'Any'});
assert.ok(valueOptions.matches.some(g=>g.brand==='Pro Mex'),'Pro Mex can remain a value pick when requested');
const benchmark=engine.recommend(gloves,{
  sport:'Muay Thai',use:'Sparring',budget:'b100to200',fit:'Any',
  priorities:['none'],style:'Any',material:'Any'
}).matches.map(g=>g.id);
assert.equal(JSON.stringify(benchmark.slice(0,2)),
 JSON.stringify(['fairtex-bgv1','thaismai-bg121']),
 'Muay Thai top two changed unexpectedly');
assert.ok(benchmark.includes('primo-emblem-2'),'Primo should appear within $200 options');
assert.ok(gloves.find(g=>g.brand==='Primo'&&g.model==='Emblem 2'));
assert.equal(gloves.find(g=>g.brand==='Combat Corner'&&g.model==='Cream').use,'Both');
assert.equal(gloves.find(g=>g.brand==='Casanova').use,'Both');

// UI regression: finish a quiz, click Start over, then finish it again.
{
  const win={CC_GLOVES:gloves};
  vm.runInNewContext(scripts[1],{window:win});
  const elements=new Map();
  function get(id) {
    if(!elements.has(id))elements.set(id,{
      id,_html:'',textContent:'',style:{},listeners:{},
      set innerHTML(value){this._html=value;this._buttons=null},
      get innerHTML(){return this._html},
      remove(){},
      addEventListener(type,callback){this.listeners[type]=callback},
      setAttribute(name,value){this[name]=value},
      click(){assert.ok(this.listeners.click,'Missing click handler: '+this.id);this.listeners.click()},
      querySelectorAll(selector){
        assert.equal(selector,'[data-answer]');
        if(!this._buttons)this._buttons=[...this._html.matchAll(/data-answer="([^"]+)"/g)]
          .map(match=>({dataset:{answer:match[1]},addEventListener(type,callback){this.click=callback}}));
        return this._buttons;
      }
    });
    return elements.get(id);
  }
  const doc={getElementById:get};
  vm.runInNewContext(scripts[2],{document:doc,window:win});
  function answer(value) {
    const button=get('quiz-content').querySelectorAll('[data-answer]').find(b=>b.dataset.answer===value);
    assert.ok(button && button.click,'Missing option '+value);
    button.click();
    get('continue').click();
    if(value==='Muay Thai')assert.ok(/brand-thinking-[012]/.test(get('quiz-content').innerHTML),'Thinking chibi missing on question screen');
  }
  function finish(){
    assert.ok(get('quiz-content').innerHTML.includes('brand-start'),'Opening screen chibi missing');
    for(const v of ['Muay Thai','Sparring','b100to200','none','Any','Thai','Genuine Leather'])answer(v);
    assert.ok(get('quiz-content').innerHTML.includes('Your Glove Shortlist.'),'Missing result cards');
    assert.ok(get('quiz-content').innerHTML.includes('brand-results'),'Results thumbs-up chibi missing');
  }
  finish();
  assert.equal(get('sound-toggle').textContent,'','Sound switch should have default markup label');
  get('sound-toggle').click();
  assert.equal(get('sound-toggle').textContent,'Sound: Off','Mute should disable audio');
  assert.equal(get('sound-toggle')['aria-pressed'],'false','Mute should be accessible');
  get('sound-toggle').click();
  assert.equal(get('sound-toggle').textContent,'Sound: On','Sound can be enabled again');
  get('again').click();
  assert.equal(get('stage-label').textContent,'QUESTION 1 OF 7','Start over did not reset step');
  assert.ok(get('quiz-controls').innerHTML.includes('id="continue" type="button" disabled'),
  'Next should be disabled after full reset');
  finish();
}

// Fitness pathway: skip sport-use and glove-style questions, respect cap, and reset.
{
  const win={CC_GLOVES:gloves};
  vm.runInNewContext(scripts[1],{window:win});
  const elements=new Map();
  function get(id){
    if(!elements.has(id))elements.set(id,{
      id,textContent:'',style:{},listeners:{},
      set innerHTML(v){this._html=v;this._buttons=null;},
      get innerHTML(){return this._html||'';},
      remove(){},setAttribute(k,v){this[k]=v;},
      addEventListener(k,fn){this.listeners[k]=fn;},
      click(){assert.ok(this.listeners.click,'No click handler for '+id);this.listeners.click();},
      querySelectorAll(selector){
        assert.equal(selector,'[data-answer]');
        if(!this._buttons)this._buttons=[...this.innerHTML.matchAll(/data-answer="([^"]+)"/g)]
          .map(m=>({dataset:{answer:m[1]},addEventListener(k,fn){this.click=fn;}}));
        return this._buttons;
      }
    });
    return elements.get(id);
  }
  vm.runInNewContext(scripts[2],{window:win,document:{getElementById:get}});
  function select(value){
    const b=get('quiz-content').querySelectorAll('[data-answer]').find(b=>b.dataset.answer===value);
    assert.ok(b,'Missing choice '+value);
    b.click();get('continue').click();
  }
  select('Fitness');
  assert.equal(get('stage-label').textContent,'QUESTION 2 OF 5','Fitness should skip use and style');
  assert.ok(get('quiz-content').innerHTML.includes('How Much Would You Spend?'));
  select('b300plus');
  select('none');
  select('Any');
  assert.ok(get('quiz-content').innerHTML.includes('Do You Prefer Leather or Synthetic?'));
  select('Any');
  const result=get('quiz-content').innerHTML;
  assert.ok(result.includes('Your Glove Shortlist.'),'Fitness route did not finish');
  assert.ok(result.includes('Cardio / Bag Training'),'Fitness summary missing');
  assert.ok(!result.includes('undefined'),'Fitness result has undefined answers');
  assert.ok(result.includes('fitness classes, cardio boxing'),'Fitness safety note missing');
  assert.ok(!result.includes('Japanese-Style'),'Fitness summary incorrectly includes style');
  get('again').click();
  assert.equal(get('stage-label').textContent,'QUESTION 1 OF 7','Reset should show generic route');
  select('Boxing');
  assert.equal(get('stage-label').textContent,'QUESTION 2 OF 7','Boxing should show full route');
  assert.ok(get('quiz-content').innerHTML.includes('What Are These Gloves For?'));
}

const fitnessScenarios={sport:'Fitness',use:'Bag & Pads',fit:'Any',style:'Any',material:'Any',priorities:['none']};
for(const budget of Object.keys(ceilings)){
  const result=engine.recommend(gloves,{...fitnessScenarios,budget});
  assert.ok(result.matches.length>0,'No suitable cardio gloves for '+budget);
  assert.ok(result.matches.every(g=>(g.use==='Bag & Pads'||g.use==='Both') &&
    g.onlinePriceUsd<=Math.min(200,ceilings[budget])),'Fitness returned unsuitable or expensive glove');
  assert.ok(!result.matches.some(g=>g.kind==='Stretch pick'),'Fitness should not stretch budget');
}
console.log('PASS:',gloves.length,'approved gloves,',combinations,'quiz combinations, UI syntax and Start Over twice');
