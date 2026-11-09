// Run with: node glove-finder/qa.js
// Dependency-free regression checks for the published Glove Finder snapshot.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname=dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const scripts=html.split('<script>').slice(1).map(x=>x.split('</script>')[0]);
assert.ok(html.includes('assets/branding-sprite.webp'),'Brand sprite stylesheet missing');
assert.ok(html.includes('assets/three-thinking.svg'),'Three thinking chibi art reference missing');
assert.ok(html.includes('class="brand-ko-logo"'),'KO logo missing');
assert.equal(scripts.length,3,'Expected data, engine and UI scripts');
const start=scripts[0].indexOf('const CC_GLOVES = ')+'const CC_GLOVES = '.length;
const end=scripts[0].indexOf(';\nif (typeof window',start);
assert.ok(start>20&&end>start,'Could not read approved data');
const gloves=JSON.parse(scripts[0].slice(start,end));
assert.equal(gloves.length,51,'Unexpected number of approved gloves');
const module={exports:{}};
vm.runInNewContext(scripts[1],{module,window:{}});
new vm.Script(scripts[2]); // UI syntax check
const engine=module.exports;
assert.equal(gloves.filter(g=>Number.isFinite(g.onlinePriceUsd)&&g.onlinePriceUsd>0).length,51,'Unexpected priced glove count');
assert.equal(gloves.find(g=>g.id==='fairtex-bgv1').onlinePriceUsd,139,'Fairtex should use online, not reviewer price');
let combinations=0;
const ceilings={under50:50,under100:100,b100to200:200,b200to300:300,b300plus:Infinity};
for(const sport of ['Boxing','Muay Thai','Kickboxing','MMA','Fitness'])
for(const use of ['Sparring','Bag & Pads','Both'])
for(const budget of Object.keys(ceilings))
for(const experience of ['under1','1to3','3to5','5plus'])
for(const fit of ['Snug','Normal','Roomy','Any'])
for(const priorities of [['none'],['Value'],['Protection'],['Comfort'],['Feedback'],['Versatility'],['Wrist Support'],['Compactness']])
for(const style of ['Any','Japanese','Thai','Mexican','Other'])
for(const material of ['Any','Genuine Leather','Synthetic']){
  const a={sport,use,budget,experience,fit,priorities,style,material};
  const result=engine.recommend(gloves,a);
  const cap=engine.effectiveBudgetCap(a);
  assert.equal(cap,Math.min(ceilings[budget],experience==='under1'?100:Infinity,
    sport==='Fitness'&&use==='Bag & Pads'?200:Infinity),'Effective cap mismatch');
  assert.ok(result.matches.length<=4,'More than four results');
  assert.equal(new Set(result.matches.map(g=>g.id)).size,result.matches.length,'Duplicate result');

  for(const g of result.matches){
    assert.equal(g.approved,true);
    assert.ok(sport==='MMA'&&(use==='Sparring'||use==='Both') ? (g.gloveType==='MMA Sparring'&&(g.use==='Sparring'||g.use==='Both')) : engine.useFits(g,use),'Invalid training use');
    assert.ok(Number.isFinite(g.onlinePriceUsd)&&g.onlinePriceUsd>0,'Unsourced price displayed');
    const stretchMax=ceilings[budget]+Math.min(75,Math.max(25,ceilings[budget]*0.25));
    if(g.kind==='Stretch alternative'){
      assert.ok(Number.isFinite(ceilings[budget])&&g.onlinePriceUsd>ceilings[budget]&&
        g.onlinePriceUsd<=stretchMax,'Stretch option exceeds allowed range');
      assert.ok(!(sport==='Fitness'&&use==='Bag & Pads'),'Fitness cannot have a stretch option');
      assert.ok(experience!=='under1','First-year buyers cannot get stretch picks');
      assert.ok(budget!=='under50','$50 budget must not offer stretch picks');
      assert.ok(result.matches.some(x=>x.onlinePriceUsd<=ceilings[budget]),'Stretch cannot replace all in-budget matches');
    }else{
      assert.ok(g.onlinePriceUsd<=cap,'Main recommendation exceeded effective budget');
    }
    if(style!=='Any')assert.equal(g.style,style,'Style mismatch');
    if(material!=='Any')assert.equal(g.material,material,'Material mismatch');
    assert.ok(['Best match','Strong match','Lower-cost alternative','Stretch alternative'].includes(g.kind),
      'Unknown result category');
    assert.ok(g.matchScore>=result.matches[0].matchScore-Math.max(3,Math.ceil(engine.maxPossible(a)*0.35)),
      'Low-ranked option was forced into results');
    if(g.kind==='Lower-cost alternative'){
      assert.ok(g.onlinePriceUsd<=result.matches[0].onlinePriceUsd*0.8,
        'Cheaper option is not meaningfully cheaper');
    }
    if(sport==='Fitness'&&use==='Bag & Pads')assert.ok(g.onlinePriceUsd<=200,'Fitness cap exceeded');
  }
  combinations++;
}
// User choices must be respected even when the strict result set is empty.
const mustMatch={sport:'Boxing',use:'Both',budget:'b300plus',fit:'Any',
  priorities:['Value'],style:'Japanese',material:'Genuine Leather'};
const jpLeather=engine.recommend(gloves,mustMatch);
assert.ok(jpLeather.matches.every(g=>g.style==='Japanese'&&g.material==='Genuine Leather'),
  'Japanese leather request diverted');
const noSyntheticJapanese=engine.recommend(gloves,{...mustMatch,material:'Synthetic'});
assert.equal(noSyntheticJapanese.matches.length,0,'Unapproved or mismatched styles should not fill results');
const highBudget=engine.recommend(gloves,{...mustMatch,style:'Any',priorities:['Protection']});
assert.ok(highBudget.matches.every(g=>g.approved&&g.ratings.Protection>=2),
  'Premium sparring matches must retain owner-rated protection');
// Alternatives may cross only the price boundary, not user preferences.
for(const [style,material] of [['Japanese','Genuine Leather'],['Mexican','Genuine Leather'],['Thai','Synthetic'],['Other','Genuine Leather']]){
  const a={sport:'Boxing',use:'Sparring',budget:'b100to200',fit:'Any',priorities:['Comfort'],style,material};
  const result=engine.recommend(gloves,a);
  for(const item of result.matches){
    assert.equal(item.style,style,'Alternative changed style');
    assert.equal(item.material,material,'Alternative changed material');
  }
}
// MMA branch: bag work can use boxing gloves, but sparring must not.
const mmaBase={sport:'MMA',experience:'1to3',budget:'b100to200',fit:'Any',priorities:['none'],style:'Any',material:'Any'};
const mmaBag=engine.recommend(gloves,{...mmaBase,use:'Bag & Pads'});
assert.ok(mmaBag.matches.length>0,'MMA bag work should retain boxing glove options');
assert.ok(mmaBag.matches.every(g=>!g.gloveType||g.gloveType==='Boxing'),'MMA bag work returned an MMA sparring glove');
const mmaModels=new Set(['onx-freedom-250-mma-sparring','isami-pounding-gloves','fairtex-fgv18-mma-sparring']);
assert.equal(gloves.filter(g=>g.gloveType==='MMA Sparring').length,3,'Expected three MMA sparring models');
for(const use of ['Sparring','Both']){
  for(const budget of Object.keys(ceilings)){
    const result=engine.recommend(gloves,{...mmaBase,use,budget});
    if(budget==='under50')assert.equal(result.matches.length,0,'No verified MMA sparring gloves under $50');
    else assert.ok(result.matches.length>0,'Missing MMA sparring options for '+use+' '+budget);
    assert.ok(result.matches.every(g=>g.gloveType==='MMA Sparring'&&mmaModels.has(g.id)),'Boxing glove leaked into MMA '+use);
    assert.ok(result.matches.every(g=>g.use==='Sparring'||g.use==='Both'),'Unsafe MMA glove use');
    if(budget==='under50')assert.equal(result.count,0,'$50 MMA sparring pool must remain empty');
    else assert.ok(result.count>=1,'MMA sparring should have approved gloves');
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
assert.ok(['onx-freedom-250-mma-sparring','isami-pounding-gloves'].includes(mmaRank('Protection')[0]),
  'Protection must prioritize an owner-rated excellent glove');
assert.equal(mmaRank('Grappling Mobility')[0],'fairtex-fgv18-mma-sparring','Fairtex should lead grappling');
assert.equal(mmaRank('Striking')[0],'isami-pounding-gloves','Isami should lead striking');
assert.equal(gloves.find(g=>g.id==='isami-pounding-gloves').testedWeight,'XL','Preserve owner-reported XL despite retailer one-size description');
assert.equal(gloves.find(g=>g.id==='fairtex-fgv18-mma-sparring').mmaProtection,'Average','Fairtex padding caution matters');
const ms600=gloves.find(g=>g.id==='winnings-ms-600');
assert.ok(ms600&&ms600.testedWeight==='16 oz'&&ms600.use==='Both','Winning MS-600 missing 16oz sparring suitability');
assert.equal(ms600.onlinePriceUsd,535,'Winning MS-600 price is not the verified exact-model listing');
assert.ok(gloves.every(g=>g.style!=='Western/Other'),'Obsolete Western style labels remain');
for(const use of ['Sparring','Both']){
  const premium=engine.recommend(gloves,{sport:'Boxing',use,budget:'b300plus',fit:'Any',
    priorities:['Protection'],style:'Any',material:'Any'});
  assert.ok(premium.matches.some(g=>g.id==='winnings-ms-600'),'MS-600 should surface as a premium sparring option');
  assert.ok(premium.matches.every(g=>g.ratings.Protection>=2),'Unsafe protection leaked into premium sparring');
}
const valueOptions=engine.recommend(gloves,{sport:'Boxing',use:'Both',budget:'b300plus',fit:'Any',
  priorities:['Value'],style:'Any',material:'Any'});
assert.ok(valueOptions.matches.length>0,'Value preference should retain strong recommendations');
const benchmark=engine.recommend(gloves,{
  sport:'Muay Thai',use:'Sparring',budget:'b100to200',fit:'Any',
  priorities:['none'],style:'Any',material:'Any'
}).matches.map(g=>g.id);
assert.ok(benchmark.length>0,'Muay Thai sparring must have appropriate recommendations');
assert.ok(!benchmark.some(id=>gloves.find(g=>g.id===id)?.use==='Bag & Pads'),
  'Bag-only gloves must not appear for sparring');
assert.ok(gloves.some(g=>g.id==='primo-emblem-2'&&g.approved),'Primo remains available when answers justify it');
assert.ok(gloves.find(g=>g.brand==='Primo'&&g.model==='Emblem 2'));
assert.equal(gloves.find(g=>g.brand==='Combat Corner'&&g.model==='Cream').use,'Both');
assert.equal(gloves.find(g=>g.brand==='Casanova').use,'Both');

// No brand receives an unconditional Muay Thai points boost.
const unrankedMuay={sport:'Muay Thai',use:'Both',budget:'b300plus',fit:'Any',style:'Any',
  material:'Any',priorities:['none']};
const openMuay=engine.recommend(gloves,unrankedMuay);
assert.equal(openMuay.matches[0].matchScore,
  Math.max(...gloves.filter(g=>engine.useFits(g,'Both')&&g.gloveType==='Boxing')
    .map(g=>engine.score(g,unrankedMuay))),
  'All-around top pick should be the highest owner-rated score');
assert.ok(openMuay.matches.some(g=>g.id==='winnings-ms-600'),
  'Premium Winning should no longer be excluded by a hidden Fairtex bonus');
assert.ok(!openMuay.matches.some(g=>g.kind==='Stretch alternative'),
  'Unlimited budget should not create a meaningless stretch alternative');

// New rating-driven checks: no brand bonuses, no guessed missing ratings.
const allR=gloves.filter(g=>g.approved);
assert.equal(allR.length,51,'51 approved glove records expected');
for(const g of allR){
  assert.ok(g.ratings&&['Protection','Comfort','Build Quality','Wrist Support','Feedback','Versatility','Value']
    .every(k=>Number.isInteger(g.ratings[k])&&g.ratings[k]>=1&&g.ratings[k]<=3),
    'Missing or invalid core 1-3 rating for '+g.id);
  for(const name of ['Compactness','Clinch Mobility','MMA Grappling Mobility']){
    const n=g.ratings[name];
    assert.ok(n===null||(Number.isInteger(n)&&n>=1&&n<=3),
      'Invalid or non-neutral unverified extra rating for '+g.id+' '+name);
  }
}
const cleto=gloves.find(g=>g.id==='cleto-reyes-traditional-laces');
assert.ok(cleto&&cleto.testedWeight==='16 oz'&&cleto.fit==='Normal'&&
  cleto.style==='Mexican'&&cleto.material==='Genuine Leather'&&
  cleto.onlinePriceUsd===269,'Cleto Reyes record incomplete');
assert.ok(engine.useFits(cleto,'Sparring')&&engine.useFits(cleto,'Bag & Pads')&&engine.useFits(cleto,'Both'),
  'Cleto suitability should include both sparring and bag/pad work');
assert.ok(!gloves.some(g=>g.id!==cleto.id&&g.suitableUses?.length), 'Suitability for other models should not be invented');
const stable={id:'sample',brand:'Sample',model:'Training',use:'Both',gloveType:'Boxing',
  fit:'Normal',approved:true,onlinePriceUsd:180,
  ratings:{Protection:2,'Build Quality':2,Comfort:2,'Wrist Support':2,Feedback:2,Versatility:2,Value:2}};
const syntheticA={sport:'Muay Thai',use:'Both',budget:'b300plus',fit:'Any',
  style:'Any',material:'Any',priorities:['none']};
const betterQuality={...stable,ratings:{...stable.ratings,'Build Quality':3}};
const betterProtection={...stable,ratings:{...stable.ratings,Protection:3}};
assert.ok(engine.score(betterQuality,syntheticA)>engine.score(stable,syntheticA),
  'Build quality must improve the default ranking');
assert.ok(engine.score(betterProtection,syntheticA)>engine.score(stable,syntheticA),
  'Protection must improve the default ranking');
assert.equal(engine.score(stable,{...syntheticA,sport:'Boxing'}),engine.score(stable,syntheticA),
  'Boxing, Muay Thai and kickboxing must have no arbitrary sport bonus');
assert.equal(engine.score(stable,{...syntheticA,sport:'Kickboxing'}),engine.score(stable,syntheticA),
  'Kickboxing must not create a default brand bonus');
const betterValue={...stable,ratings:{...stable.ratings,Value:3}};
assert.equal(engine.score(betterValue,syntheticA),engine.score(stable,syntheticA),
  'Unlimited budget without value priority must not reward value');
assert.ok(engine.score(betterValue,{...syntheticA,priorities:['Value']})>
  engine.score(stable,{...syntheticA,priorities:['Value']}),
  'Explicit value priority must reward owner-rated value');
const noCore={...stable,ratings:{...stable.ratings,Protection:null}};
assert.ok(engine.incompleteReason(noCore), 'Missing protection must not become average');
assert.ok(engine.recommend([noCore],syntheticA).matches.length===0,
  'Unrated core safety must exclude an unfinished glove');
const unsafe={...stable,ratings:{...stable.ratings,Protection:1}};
assert.ok(engine.recommend([unsafe],{...syntheticA,use:'Sparring'}).matches.length===0,
  'Owner-rated poor protection cannot be recommended for sparring');
assert.equal(engine.score(stable,{...syntheticA,fit:'Normal'})-engine.score(stable,syntheticA),3,
  'Exact fit adjustment should be modest');
assert.ok(engine.recommend(gloves,syntheticA).matches[0].ratings['Build Quality']>=2);


// Additional 1-3 scores: a 2 is neutral, unknown is neutral, and specializations matter.
const extraNeutral={...stable,ratings:{...stable.ratings,Compactness:2,'Clinch Mobility':2,'MMA Grappling Mobility':2}};
assert.equal(engine.score(extraNeutral,syntheticA),engine.score(stable,syntheticA),
  '2 and unrated must both contribute zero');
const compactGood={...extraNeutral,ratings:{...extraNeutral.ratings,Compactness:3}};
assert.ok(engine.score(compactGood,syntheticA)>engine.score(extraNeutral,syntheticA),
  'Compactness=3 must contribute to rankings');
const compactPriority=engine.score(compactGood,{...syntheticA,priorities:['Compactness']})-
  engine.score(extraNeutral,{...syntheticA,priorities:['Compactness']});
assert.ok(compactPriority>engine.score(compactGood,syntheticA)-engine.score(extraNeutral,syntheticA),
  'Explicit compactness preference must increase the weight');
const clinchGood={...extraNeutral,ratings:{...extraNeutral.ratings,'Clinch Mobility':3}};
const muayBoth={...syntheticA,sport:'Muay Thai',use:'Both'};
const clinchBaseDelta=engine.score(clinchGood,muayBoth)-engine.score(extraNeutral,muayBoth);
assert.ok(clinchBaseDelta>=3,'Muay Thai all-around must reward good clinch mobility');
assert.ok(engine.score(clinchGood,{...muayBoth,priorities:['Clinch Mobility']})-
  engine.score(extraNeutral,{...muayBoth,priorities:['Clinch Mobility']})>clinchBaseDelta,
  'Choosing clinch as a Muay Thai priority must increase its weight');
assert.ok(engine.score(clinchGood,{...muayBoth,use:'Sparring'})>
  engine.score(extraNeutral,{...muayBoth,use:'Sparring'}),
  'Muay Thai sparring must account for clinch mobility');
assert.equal(engine.score(clinchGood,{...muayBoth,use:'Bag & Pads'}),
  engine.score(extraNeutral,{...muayBoth,use:'Bag & Pads'}),
  'Bag/pad-only Muay Thai must not use clinch mobility');
for(const otherSport of ['Boxing','Kickboxing','MMA','Fitness']){
  for(const use of ['Sparring','Bag & Pads','Both']){
    const a={...syntheticA,sport:otherSport,use};
    assert.equal(engine.score(clinchGood,a),engine.score(extraNeutral,a),
      'Clinch must not influence '+otherSport+' / '+use);
    assert.equal(engine.getWeights(a)['Clinch Mobility'],undefined,
      'Clinch weight must be absent outside Muay Thai sparring/all-around');
  }
}
const mmaContrast={...syntheticA,sport:'MMA',use:'Sparring'};
const mobileGood={...extraNeutral,ratings:{...extraNeutral.ratings,'MMA Grappling Mobility':3}};
assert.ok(engine.score(mobileGood,{...mmaContrast,priorities:['Grappling Mobility']})-
  engine.score(extraNeutral,{...mmaContrast,priorities:['Grappling Mobility']})>=8,
  'MMA grappling priority must strongly reward separate MMA mobility');
assert.equal(engine.mobilityRating(extraNeutral),2,'Separate MMA mobility rating 2 should be neutral');
assert.equal(engine.score(mobileGood,{...syntheticA,sport:'Boxing'}),
  engine.score(extraNeutral,{...syntheticA,sport:'Boxing'}),
  'MMA grappling score must not affect boxing');
assert.ok(!gloves.some(g=>Object.hasOwn(g,'compactness')||Object.hasOwn(g,'clinchMobility')||Object.hasOwn(g,'availability')||Object.hasOwn(g.ratings,'Availability')),
  'Old categorical fields and Availability scoring must be gone');
assert.ok(gloves.filter(g=>g.ratings.Compactness!==null).length>=45,'Existing compactness ratings lost');
assert.ok(gloves.filter(g=>g.ratings['Clinch Mobility']!==null).length>=10,'Existing Muay Thai clinch ratings lost');
assert.equal(gloves.filter(g=>g.ratings['MMA Grappling Mobility']!==null).length,3,
  'Three separate MMA mobility assessments must be preserved');
assert.ok(gloves.filter(g=>g.gloveType==='MMA Sparring').every(g=>g.ratings['Clinch Mobility']===null),
  'No MMA glove should have a Muay Thai clinch rating');


// Training experience must only affect the novice price cap, not glove scores.
const experienceBase={sport:'Boxing',use:'Both',budget:'b300plus',fit:'Any',
  priorities:['none'],style:'Any',material:'Any'};
assert.equal(engine.effectiveBudgetCap({...experienceBase,experience:'under1'}),100);
assert.equal(engine.effectiveBudgetCap({...experienceBase,experience:'under1',budget:'under50'}),50);
assert.equal(engine.effectiveBudgetCap({...experienceBase,experience:'5plus'}),Infinity);
for(const experience of ['1to3','3to5','5plus']){
  const a={...experienceBase,experience};
  assert.equal(engine.score(gloves[0],a),engine.score(gloves[0],experienceBase),
    'Experience over one year cannot bias glove score');
}
for(const sport of ['Boxing','Muay Thai','Kickboxing','MMA','Fitness'])
for(const use of ['Sparring','Bag & Pads','Both'])
for(const budget of Object.keys(ceilings)){
  const result=engine.recommend(gloves,{...experienceBase,sport,use,budget,experience:'under1'});
  assert.ok(result.matches.every(g=>g.onlinePriceUsd<=Math.min(100,ceilings[budget])),
    'First-year result exceeds spending guidance');
  assert.ok(!result.matches.some(g=>g.kind==='Stretch alternative'),
    'First-year results cannot stretch past price cap');
}
const lowCost=engine.recommend(gloves,{...experienceBase,experience:'5plus',budget:'under50'});
assert.ok(lowCost.matches.length>0,'Under-$50 budget should find some approved training gloves');
assert.ok(lowCost.matches.every(g=>g.onlinePriceUsd<=50),'$50 result exceeded selected budget');
assert.ok(!lowCost.matches.some(g=>g.kind==='Stretch alternative'),'$50 results must have no stretch');

// Feedback must open a prefilled email, never auto-send.
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
    if(value==='b100to200')assert.ok(get('quiz-content').innerHTML.includes('data-answer="Clinch Mobility"'),
      'Muay Thai sparring priority question must offer Clinch Mobility');
  }
  function finish(){
    assert.ok(get('quiz-content').innerHTML.includes('brand-start'),'Opening screen chibi missing');
    let lastPose=null,thinkingTransitions=0;
    for(const v of ['Muay Thai','Sparring','1to3','b100to200','none','Any','Thai','Genuine Leather']){
      answer(v);
      const pose=get('quiz-content').innerHTML.match(/brand-thinking-([012])/);
      if(pose){
        if(lastPose!==null)assert.ok(pose[1]!==lastPose,'Thinking chibi should change between questions');
        lastPose=pose[1];thinkingTransitions++;
      }
    }
    assert.ok(thinkingTransitions>=3,'Expected multiple thinking chibi transitions');
    assert.ok(get('quiz-content').innerHTML.includes('Your Glove Shortlist.'),'Missing result cards');
    assert.ok(get('quiz-content').innerHTML.includes('brand-results'),'Results thumbs-up chibi missing');
    assert.ok(get('quiz-content').innerHTML.includes('id="feedback-toggle"'),'Feedback button missing');
    get('feedback-toggle').click();
    assert.equal(get('feedback-toggle')['aria-expanded'],'true','Feedback form did not open');
    get('feedback-details').value='I would rank the Fairtex glove differently.';
    get('feedback-kind').value='Disagree with a recommendation';
    get('feedback-email').click();
    const draft=get('feedback-email').href;
    assert.ok(draft.startsWith('mailto:combatcultureusa@gmail.com?'),'Feedback email address missing');
    const body=decodeURIComponent(draft.split('&body=')[1]);
    assert.ok(body.includes('1–3 years'),'Training experience missing in feedback');
    assert.ok(body.includes('I would rank the Fairtex glove differently.'),'Feedback text missing');
    assert.ok(body.includes('Glove recommendations:'),'Recommended picks missing in feedback');
    get('feedback-details').value='';
    get('feedback-email').click();
    assert.ok(get('feedback-status').textContent.includes('Add a short note'),'Empty feedback not validated');
  }
  finish();
  assert.equal(get('sound-toggle').textContent,'','Sound switch should have default markup label');
  get('sound-toggle').click();
  assert.equal(get('sound-toggle').textContent,'Sound: Off','Mute should disable audio');
  assert.equal(get('sound-toggle')['aria-pressed'],'false','Mute should be accessible');
  get('sound-toggle').click();
  assert.equal(get('sound-toggle').textContent,'Sound: On','Sound can be enabled again');
  get('again').click();
  assert.equal(get('stage-label').textContent,'QUESTION 1 OF 8','Start over did not reset step');
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
  assert.equal(get('stage-label').textContent,'QUESTION 2 OF 6','Fitness should skip use and style');
  assert.ok(get('quiz-content').innerHTML.includes('How Long Have You Been Training?'));
  select('5plus');
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
  assert.equal(get('stage-label').textContent,'QUESTION 1 OF 8','Reset should show generic route');
  select('Boxing');
  assert.equal(get('stage-label').textContent,'QUESTION 2 OF 8','Boxing should show full route');
  assert.ok(get('quiz-content').innerHTML.includes('What Are These Gloves For?'));
  select('Sparring');select('1to3');select('b100to200');
  assert.ok(!get('quiz-content').innerHTML.includes('data-answer="Clinch Mobility"'),
    'Boxing must not offer the Muay Thai-specific clinch priority');
  assert.ok(!get('quiz-content').innerHTML.includes('data-answer="Grappling Mobility"'),
    'Boxing must not offer the MMA-specific grappling priority');
}

const fitnessScenarios={sport:'Fitness',use:'Bag & Pads',fit:'Any',style:'Any',material:'Any',priorities:['none']};
for(const budget of Object.keys(ceilings)){
  const result=engine.recommend(gloves,{...fitnessScenarios,budget});
  assert.ok(result.matches.length>0,'No suitable cardio gloves for '+budget);
  assert.ok(result.matches.every(g=>(g.use==='Bag & Pads'||g.use==='Both') &&
    g.onlinePriceUsd<=Math.min(200,ceilings[budget])),'Fitness returned unsuitable or expensive glove');
  assert.ok(!result.matches.some(g=>g.kind==='Stretch pick'),'Fitness should not stretch budget');
}
assert.equal(combinations,180000,'Unexpected combination count');
console.log('PASS:',gloves.length,'approved gloves,',combinations,'quiz combinations, UI syntax and Start Over twice');
