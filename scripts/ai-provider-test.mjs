import {chat,transcribeWithAI,analyzeWithAI} from '../src/lib/ai.js';import {readFile,writeFile} from 'node:fs/promises';import {pool,q} from '../src/lib/db.js';
const results={};try{
 for(const m of await q("SELECT id,model FROM ai_models WHERE kind='chat'")){const t=Date.now();const r=await chat({purpose:'connection_test',modelId:m.id,messages:[{role:'user',content:'请仅回复：连接成功'}],maxTokens:256});results[m.model]={text:r.text,returned_model:r.returned_model,ms:Date.now()-t};await q("UPDATE ai_models SET test_status='success',tested_at=NOW(),test_message=? WHERE id=?",['连接成功',m.id]);console.log(m.model,r.text);}
 const st=Date.now();const speech=await transcribeWithAI(null,await readFile('scripts/fixtures/ai-test-voice.wav'),'audio/wav');results.transcription={...speech,ms:Date.now()-st};await q("UPDATE ai_models SET test_status='success',tested_at=NOW(),test_message='已通过真实语音转写测试' WHERE model=?",[speech.model]);console.log('ASR',speech);
 const a=await analyzeWithAI(null,'客户：我想先看看二十万元左右的车型。\n销售：这款高配车型配置比较齐全。\n客户：主要是接送孩子，计划下个月买。\n销售：我们去看展车吧。',{name:'需求探索',description:'检查预算、用途、购车时间、试驾和跟进',keywords:'预算,用途,时间,试驾,跟进'});results.analysis=a;console.log('Analysis validated',a.findings.length,'findings',a.model);
 await writeFile('docs/ai/provider-tests.json',JSON.stringify(results,null,2));
}finally{await pool.end()}
