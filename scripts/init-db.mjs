import mysql from 'mysql2/promise';import bcrypt from 'bcryptjs';import {randomBytes} from 'node:crypto';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {analyze} from '../src/lib/analysis.js';
const db=await mysql.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,multipleStatements:true,charset:'utf8mb4'});
await db.query(await readFile('database/schema.sql','utf8'));
const [[{n}]]=await db.query('SELECT COUNT(*) n FROM users');
if(n===0){
 await db.query("INSERT INTO stores(name,city) VALUES('杭州滨江体验中心','杭州'),('上海静安体验中心','上海')");
 const accounts=[];
 for(const [email,name,role,store] of [['admin@whale.local','系统管理员','admin',1],['manager@whale.local','陈店长','manager',1],['sales@whale.local','林晓','sales',1],['shanghai@whale.local','周悦','sales',2]]){
 const password=randomBytes(12).toString('base64url');await db.execute('INSERT INTO users(email,name,password,role,store_id) VALUES(?,?,?,?,?)',[email,name,await bcrypt.hash(password,12),role,store]);accounts.push({email,password,name,role});}
 await db.query("INSERT INTO rules(name,description,keywords) VALUES('汽车接待 · 需求探索','检查预算、使用场景、购车时间及试驾跟进。关键词仅作模拟提示。','预算,用途,时间,试驾,跟进'),('服务沟通 · 基础复盘','检查沟通诉求、解决方案及后续跟进。','需求,方案,跟进')");
 const samples=[['家庭增购 · 完整需求沟通','王先生','客户：预算二十万元左右，主要家用和接送孩子。\n销售：我确认一下，预算20万，家用为主，购车时间有计划吗？\n客户：希望下个月能提车。\n销售：可以安排周末试驾，体验后我们通过微信跟进。\n客户：好的，周六下午联系我。'],['到店咨询 · 预算确认待完善','李女士','客户：我想先看看二十万元左右的车型。\n销售：这款高配车型配置比较齐全，空间也大。\n客户：和其他版本有什么区别？\n销售：高配增加了舒适配置，我们可以去展车看看。\n客户：我再考虑一下。'],['简短接待 · 信息不足','匿名客户','客户：先随便看看。\n销售：您好，欢迎体验。']];
 for(let i=0;i<samples.length;i++){const [title,customer,transcript]=samples[i];const a=analyze(transcript,'预算,用途,时间,试驾,跟进');const [r]=await db.execute('INSERT INTO conversations(title,customer,owner_id,store_id,rule_id,transcript,status,score,summary,is_demo,created_at,analyzed_at) VALUES(?,?,3,1,1,?,\'ready\',?,?,1,DATE_SUB(NOW(), INTERVAL ? DAY),NOW())',[title,customer,transcript,a.score,a.summary,i]);for(const f of a.findings)await db.execute('INSERT INTO findings(conversation_id,dimension,verdict,evidence,line_index,confidence) VALUES(?,?,?,?,?,?)',[r.insertId,f.dimension,f.verdict,f.evidence,f.line_index,f.confidence]);}
 await mkdir('docs',{recursive:true});await writeFile('docs/initial-credentials.json',JSON.stringify(accounts,null,2),{mode:0o600});
 console.log('Schema initialized; 4 accounts and 3 clearly marked demo conversations created. Credentials saved to docs/initial-credentials.json.');
}else console.log('Schema checked; existing data preserved.');
await db.end();
