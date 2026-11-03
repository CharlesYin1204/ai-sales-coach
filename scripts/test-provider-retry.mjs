import assert from 'node:assert/strict';
import {providerFetch} from '../src/lib/ai.js';
import {writeFile} from 'node:fs/promises';
const original=globalThis.fetch;const checks=[];
async function scenario(name,responses,expected,calls){let n=0;globalThis.fetch=async()=>{const r=responses[Math.min(n++,responses.length-1)];return new Response(JSON.stringify(r.body||{}),{status:r.status,headers:{'Retry-After':'0'}})};const r=await providerFetch('https://example.invalid',{},1000);assert.equal(r.status,expected);assert.equal(n,calls);checks.push(name)}
try{
 await scenario('transient rate limit retries and recovers',[{status:429},{status:200}],200,2);
 await scenario('temporary upstream outage retries and recovers',[{status:503},{status:502},{status:200}],200,3);
 await scenario('persistent rate limit stops after three attempts',[{status:429}],429,3);
 await scenario('insufficient quota is not retried',[{status:429,body:{error:{code:'insufficient_user_quota'}}}],429,1);
 await scenario('invalid credential is not retried',[{status:401}],401,1);
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}',{status:429,headers:{'Retry-After':'100'}})};assert.equal((await providerFetch('https://example.invalid',{},10)).status,429);assert.equal(calls,1);checks.push('retry delay respects overall timeout');
 await writeFile('docs/completion/provider-retry-tests.json',JSON.stringify({passed:true,checks},null,2));console.log('PASS provider retry:',checks.length,'checks');
}finally{globalThis.fetch=original}
