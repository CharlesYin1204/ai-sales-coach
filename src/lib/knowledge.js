import {q,pool,audit} from './db.js';
import {aiError} from './ai.js';
const check=(ok,message)=>{if(!ok)throw aiError(message,400)};
const valid=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export function knowledgeScope(user,alias='k'){
 if(user.role==='admin')return ['1=1',[]];
 if(user.role==='manager')return [`(${alias}.store_id=? OR (${alias}.store_id IS NULL AND ${alias}.status='published'))`,[user.store_id]];
 return [`${alias}.status='published' AND (${alias}.store_id=? OR ${alias}.store_id IS NULL)`,[user.store_id]];
}
export async function knowledgeDocument(user,id){const [where,args]=knowledgeScope(user);const [d]=await q(`SELECT k.*,u.name author_name,s.name store_name FROM knowledge_documents k LEFT JOIN users u ON u.id=k.author_id LEFT JOIN stores s ON s.id=k.store_id WHERE k.id=? AND ${where}`,[id,...args]);if(!d)throw aiError('知识不存在或无权查看',404);return {...d,can_edit:user.role==='admin'||user.role==='manager'&&d.store_id===user.store_id};}
export async function knowledgeRoutes({route,method,data,user,url}){
 if(route==='knowledge'&&method==='GET'){
  const page=Math.max(1,Math.min(100000,Math.floor(Number(url.searchParams.get('page'))||1))),size=20;
  const search=(url.searchParams.get('search')||'').trim().slice(0,120),status=url.searchParams.get('status');
  const [scope,args]=knowledgeScope(user);let where=scope;
  if(search){where+=' AND (k.title LIKE ? OR k.category LIKE ? OR k.content LIKE ?)';args.push(...Array(3).fill('%'+search.replace(/[\\%_]/g,'\\$&')+'%'));}
  if(status&&status!=='all'){check(['draft','published','archived'].includes(status),'状态不正确');where+=' AND k.status=?';args.push(status);}
  const [count]=await q(`SELECT COUNT(*) total FROM knowledge_documents k WHERE ${where}`,args);
  const rows=await q(`SELECT k.id,k.title,k.category,k.status,k.store_id,k.revision,k.updated_at,LEFT(k.content,140) excerpt,u.name author_name,s.name store_name FROM knowledge_documents k LEFT JOIN users u ON u.id=k.author_id LEFT JOIN stores s ON s.id=k.store_id WHERE ${where} ORDER BY k.updated_at DESC,k.id DESC LIMIT ${size} OFFSET ${(page-1)*size}`,args);
  return Response.json({items:rows,total:count.total,page,size});
 }
 const match=route.match(/^knowledge\/(\d+)(?:\/(history))?$/);
 if(match){const d=await knowledgeDocument(user,Number(match[1]));if(method==='GET'){if(match[2]){if(!d.can_edit)throw aiError('仅知识维护者可查看历史版本',403);return Response.json(await q('SELECT r.*,u.name editor_name FROM knowledge_revisions r LEFT JOIN users u ON u.id=r.editor_id WHERE document_id=? ORDER BY revision DESC',[d.id]));}return Response.json(d);}}
 if((route==='knowledge'&&method==='POST')||(match&&!match[2]&&method==='PATCH')){
  if(!['admin','manager'].includes(user.role))throw aiError('仅店长或管理员可维护知识',403);
  check(valid(data.title,160)&&valid(data.category,80)&&valid(data.content,60000),'请填写标题、分类和正文；正文最多60000字');check(['draft','published','archived'].includes(data.status),'请选择知识状态');
  let targetStore=user.store_id;
  if(user.role==='admin'){targetStore=data.store_id==null||data.store_id===''?null:Number(data.store_id);check(targetStore===null||Number.isInteger(targetStore)&&targetStore>0,'请选择有效门店');if(targetStore){const [store]=await q('SELECT id FROM stores WHERE id=? AND active=1',[targetStore]);check(store,'请选择有效门店');}}
  const db=await pool.getConnection();let id=match?Number(match[1]):null;
  try{await db.beginTransaction();let revision=1;
   if(id){const [[old]]=await db.execute('SELECT * FROM knowledge_documents WHERE id=? FOR UPDATE',[id]);if(!old||user.role!=='admin'&&old.store_id!==user.store_id)throw aiError('无权编辑此知识',403);check(Number(data.revision)===old.revision,'知识已被他人更新，请重新打开后编辑');revision=old.revision+1;targetStore=old.store_id;
    await db.execute('UPDATE knowledge_documents SET title=?,category=?,content=?,status=?,revision=? WHERE id=?',[data.title.trim(),data.category.trim(),data.content.trim(),data.status,revision,id]);
   }else{const [r]=await db.execute('INSERT INTO knowledge_documents(title,category,content,status,store_id,author_id) VALUES(?,?,?,?,?,?)',[data.title.trim(),data.category.trim(),data.content.trim(),data.status,targetStore,user.id]);id=r.insertId;}
   await db.execute('INSERT INTO knowledge_revisions(document_id,revision,title,category,content,status,editor_id) VALUES(?,?,?,?,?,?,?)',[id,revision,data.title.trim(),data.category.trim(),data.content.trim(),data.status,user.id]);await db.commit();
  }catch(e){await db.rollback();throw e}finally{db.release()}
  await audit(user,match?'更新知识':'创建知识',`知识 #${id} ${data.title}：${data.status}`);return Response.json({id});
 }
 return null;
}
export async function retrieveKnowledge(user,question){
 const clean=question.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ');const words=[...clean.matchAll(/[a-z0-9]{2,}|[\u4e00-\u9fff]{2,}/g)].map(x=>x[0]);const tokens=new Set();
 for(const word of words){if(/[\u4e00-\u9fff]/.test(word)){for(let i=0;i<word.length-1;i++)tokens.add(word.slice(i,i+2));}else tokens.add(word);}
 for(const stop of ['请问','如何','这个','什么','我们','客户','请根','根据','一下','知识','可以','告诉'])tokens.delete(stop);
 const terms=[...tokens].slice(0,24);if(!terms.length)return [];
 const where=terms.map(()=>'(k.title LIKE ? OR k.content LIKE ?)').join(' OR ');const args=terms.flatMap(t=>['%'+t+'%','%'+t+'%']);
 const docs=await q(`SELECT k.id,k.title,k.content,k.revision FROM knowledge_documents k LEFT JOIN stores s ON s.id=k.store_id WHERE k.status='published' AND (k.store_id IS NULL OR (k.store_id=? AND s.active=1)) AND (${where}) ORDER BY k.updated_at DESC LIMIT 200`,[user.store_id,...args]);
 const matches=[];for(const d of docs){const chunks=d.content.match(/[\s\S]{1,1000}/g)||[];for(const excerpt of chunks){const hay=excerpt.toLowerCase();const score=terms.reduce((n,t)=>n+(hay.includes(t)?1:0)+(d.title.toLowerCase().includes(t)?2:0),0);if(score)matches.push({document_id:d.id,title:d.title,revision:d.revision,excerpt,score});}}
 const seen=new Set();return matches.sort((a,b)=>b.score-a.score).filter(x=>{if(seen.has(x.document_id))return false;seen.add(x.document_id);return true}).slice(0,4);
}
export async function messageSources(user,threadId){const [where,args]=knowledgeScope(user,'k');return q(`SELECT s.message_id,s.document_id,s.revision,s.title,s.excerpt FROM ai_message_sources s JOIN ai_messages m ON m.id=s.message_id JOIN ai_threads t ON t.id=m.thread_id JOIN knowledge_documents k ON k.id=s.document_id WHERE t.id=? AND t.user_id=? AND ${where}`,[threadId,user.id,...args]);}
