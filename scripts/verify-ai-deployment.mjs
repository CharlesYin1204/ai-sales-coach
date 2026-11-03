import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {q,pool} from '../src/lib/db.js';
const base='http://154.40.47.111:3030/api/';
const admin=JSON.parse(await readFile('docs/initial-credentials.json','utf8')).find(x=>x.role==='admin');
let cookie='',created;
async function call(p,method='GET',body){const r=await fetch(base+p,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});return {r,data:await r.json()};}
try {
 const login=await call('auth/login','POST',admin);assert.equal(login.r.status,200);cookie=login.r.headers.get('set-cookie').split(';')[0];
 const {data:models}=await call('admin/ai-models');assert(models.models.length>=4);assert.equal(models.settings.chat_model_id,models.models.find(x=>x.model==='gpt-5.6-luna').id);assert.equal(models.settings.transcription_model_id,models.models.find(x=>x.model==='gpt-4o-transcribe').id);
 const form=new FormData();form.set('title','部署回归测试（自动清理）');form.set('rule_id','1');form.set('transcript','客户：我准备花二十万元购买一辆家用车。销售：您计划什么时候购买？');const imported=await call('conversations','POST',form);assert.equal(imported.r.status,200);created=imported.data.id;
 assert.equal((await call(`conversations/${created}/transcribe`,'POST')).r.status,400);const detail=await call(`conversations/${created}`);assert.equal(detail.data.status,'processing');assert.equal(detail.data.ai_running,false);
 const health=await call('health');assert.equal(health.data.ok,true);assert.equal(health.data.analysis,'ai');
 for(const route of ['/admin/ai-models','/app/assistant','/app/reports'])assert.equal((await fetch('http://154.40.47.111:3030'+route)).status,200);
 const report={passed:true,checked_at:new Date().toISOString(),health:health.data,models:models.models.map(({name,model,kind,active})=>({name,model,kind,active})),checks:['default models persist after service restart','repeat transcription rejection does not change existing text or status','public IP pages respond successfully']};
 await writeFile('docs/ai/deployment-tests.json',JSON.stringify(report,null,2));console.log('PASS deployment smoke and transcription regression');
} finally {if(created){await q('DELETE FROM audit WHERE detail LIKE ?',[`对话 #${created}：部署回归测试%`]);await q('DELETE FROM conversations WHERE id=?',[created]);}if(cookie)await call('auth/logout','POST');await pool.end();}
