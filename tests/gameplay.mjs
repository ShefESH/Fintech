import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://localhost:3101';
const password=process.env.TEST_HOST_PASSWORD;
assert(password,'Set TEST_HOST_PASSWORD for a disposable local server');
async function call(path,data){const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return r.json()}
const host=await call('create',{password});assert(host.ok);
const h={code:host.code,token:host.token};
const team=await call('join',{code:h.code,name:'Flow test'});assert(team.ok);const t={code:team.code,token:team.token};
const state=()=>call('state',t);
let s=await state();assert.equal(s.optionalFeatures,false);assert.equal(s.roundData,null);
assert.equal((await call('host',{...t,action:'settings',optionalFeatures:true})).ok,false);
assert.equal((await call('host',{...h,action:'settings',optionalFeatures:'yes'})).ok,false);
const guide=await call('host-guide',h);assert.equal(guide.missions.length,7);
assert.equal((await call('host-guide',t)).ok,false);
for(let round=0;round<7;round++){
 const extras=round%2===1;
 assert((await call('host',{...h,action:'settings',optionalFeatures:extras})).ok);
 assert((await call('host',{...h,action:'start',duration:540})).ok);
 s=await state();assert.equal(s.optionalFeatures,extras);assert.equal(s.round,round);
 assert.equal((await call('host',{...h,action:'settings',optionalFeatures:!extras})).ok,false);
 const m=guide.missions[round];
 assert.equal((await call('answer',{...t,answer:m.correct})).ok,false);
 for(const f of s.self.evidenceFiles.slice(0,2))assert((await call('terminal',{...t,command:'inspect '+f})).ok);
 assert.equal((await call('answer',{...t,answer:m.correct})).ok,false);
 assert((await call('terminal',{...t,command:'hint'})).ok);
 assert.equal((await call('terminal',{...t,command:'ls'})).ok,extras);
 assert.equal((await call('pin',{...t,file:s.self.evidenceFiles[0]})).ok,extras);
 assert.equal((await call('verify',{...t,answer:m.verification.answer})).ok,extras);
 assert.equal((await call('invest',{...t,choice:0})).ok,extras);
 s=await state();assert.equal(s.self.investment,extras?0:null);
 for(let stage=0;stage<3;stage++){let j=(await state()).self.journey;assert((await call('respond',{...t,response:0,revision:j.revision})).ok);j=(await state()).self.journey;assert((await call('respond',{...t,action:'advance',revision:j.revision})).ok);}
 assert.equal((await state()).self.answer,null);
 assert((await call('answer',{...t,answer:m.correct,notes:'Evidence demonstrates a specific control failure. Preserve records and contain the incident using the documented response.'})).ok);
 assert.equal((await call('answer',{...t,answer:m.correct})).ok,false);
 assert.equal((await call('respond',{...t,response:1})).ok,false);
 assert.equal((await call('terminal',{...t,command:'inspect '+s.self.evidenceFiles[0]})).ok,false);
 assert((await call('host',{...h,action:'reveal'})).ok);
 s=await state();assert.equal(s.self.history.length,round+1);assert.equal(s.self.history.at(-1).points,extras?355:220);
 assert.equal(s.reveal.correct,m.correct);
}
assert((await call('host',{...h,action:'finish'})).ok);
s=await state();assert.equal(s.phase,'finished');assert.equal(s.self.history.length,7);
assert.equal((await call('host',{...h,action:'settings',optionalFeatures:true})).ok,false);
console.log('PASS: seven missions, both modes, authenticated settings, live lock, evidence/response gates, bonuses, investment zero, submission lock, debrief and event completion.');
// Exercise expiry without a three-minute wall-clock wait or changing mission timing.
const {readFileSync}=await import('node:fs');
const {runInNewContext}=await import('node:vm');
const {createRequire}=await import('node:module');
const require=createRequire(import.meta.url);
let now=1_000_000;
const context={require:name=>name==='http'?{createServer:()=>({listen(){}})}:require(name),process:{env:{HOST_PASSWORD:'test'},loadEnvFile(){}},console,Date:{now:()=>now},URL,Buffer,__dirname:new URL('..',import.meta.url).pathname};
runInNewContext(readFileSync(new URL('../server.js',import.meta.url),'utf8')+'\nglobalThis.testRoutes=routes;',context);
function route(path,body){let value;context.testRoutes['/api/'+path](body,{writeHead(){},end(s){value=JSON.parse(s)}});return value}
const room=route('create',{password:'test'}), hc={code:room.code,token:room.token};
const joined=route('join',{code:room.code,name:'Expiry'}), tc={code:room.code,token:joined.token};
route('host',{...hc,action:'settings',optionalFeatures:true});route('host',{...hc,action:'start',duration:180});
now+=181_000;
for(const [path,data] of [['answer',{answer:1}],['respond',{response:0}],['verify',{answer:'86400'}],['invest',{choice:0}],['pin',{file:'mail/raw-headers.eml'}],['terminal',{command:'inspect mail/raw-headers.eml'}]])assert.equal(route(path,{...tc,...data}).ok,false,path+' must close on expiry');
console.log('PASS: all player write actions close when mission time expires.');
