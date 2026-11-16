import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let now=1000;
const ctx={require:n=>n==='http'?{createServer:()=>({listen(){}})}:require(n),process:{env:{HOST_PASSWORD:'test'},loadEnvFile(){}},Date:{now:()=>now},console,URL,Buffer,__dirname:new URL('..',import.meta.url).pathname};
runInNewContext(readFileSync(new URL('../server.js',import.meta.url),'utf8')+'\nglobalThis.routesForTest=routes;',ctx);
function call(p,b){let out;ctx.routesForTest['/api/'+p](b,{writeHead(){},end(s){out=JSON.parse(s)}});return out;}
for(let first=0;first<2;first++)for(let second=0;second<2;second++)for(let final=0;final<3;final++){
 const room=call('create',{password:'test'}),h={code:room.code,token:room.token};
 const joined=call('join',{code:room.code,name:'Path'}),t={code:room.code,token:joined.token};
 const other=call('join',{code:room.code,name:'Other'}),u={code:room.code,token:other.token};
 const state=()=>call('state',t);
 const guide=call('host-guide',h);
 for(let round=0;round<7;round++){
  assert(call('host',{...h,action:'start'}).ok);
  let s=state();assert.equal(s.self.journey.revision,0);assert.equal(s.self.journey.log.length,0);
  assert.equal(call('respond',{...t,response:0,revision:0}).ok,false);
  for(const file of s.self.evidenceFiles.slice(0,2))assert(call('terminal',{...t,command:'inspect '+file}).ok);
  for(const [stage,choice] of [first,second,final].entries()){
   let j=state().self.journey;
   assert.equal(j.stage,stage+1);assert.equal(call('answer',{...t,answer:0}).ok,false);
   assert.equal(call('respond',{...t,action:'advance',revision:j.revision}).ok,false);
   assert.equal(call('respond',{...t,response:9,revision:j.revision}).ok,false);
   assert(call('respond',{...t,response:choice,revision:j.revision}).ok);
   assert.equal(call('respond',{...t,response:choice,revision:j.revision}).ok,false,'duplicate action');
   let after=state().self.journey;assert(after.pending);assert.equal(after.node,null);assert.equal(after.log.length,stage+1);
   assert.equal(call('answer',{...t,answer:0}).ok,false,'must read final outcome');
   assert.equal(call('respond',{...t,response:0,revision:after.revision}).ok,false,'must advance first');
   assert.equal(state().self.journey.log.at(-1).result,after.log.at(-1).result,'reload preserves outcome');
   assert(call('respond',{...t,action:'advance',revision:after.revision}).ok);
   if(stage===0)assert.equal(state().self.journey.node.title,guide.missions[round].scenario.nodes[first===0?'controlled':'exposed'].title);
   if(stage===1)assert.equal(state().self.journey.node.brief,guide.missions[round].scenario.nodes[second===0?'resolved':'unresolved'].brief);
  }
  assert(state().self.journey.complete);assert.equal(state().self.response,final);
  assert.equal(call('state',u).self.journey.log.length,0,'teams isolated');
  assert(call('answer',{...t,answer:guide.missions[round].correct}).ok);
  assert.equal(call('respond',{...t,response:0,revision:6}).ok,false,'submission lock');
  assert(call('host',{...h,action:'reveal'}).ok);
  assert.equal(state().self.history.at(-1).decisions.length,3);
 }
 assert(call('host',{...h,action:'finish'}).ok);
}
console.log('PASS: all 84 complete mission paths; branches, recovery, stale requests, server persistence, team isolation, decision gates and final submissions.');
const room=call('create',{password:'test'}),h={code:room.code,token:room.token},j=call('join',{code:room.code,name:'Timeout'}),t={code:room.code,token:j.token};
call('host',{...h,action:'start',duration:180});now+=181000;
assert.equal(call('respond',{...t,response:0,revision:0}).ok,false);
console.log('PASS: timed-out incident actions rejected.');
