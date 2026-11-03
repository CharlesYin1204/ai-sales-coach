import {q} from './db.js';import {aiError} from './ai.js';
const pageOf=url=>Math.max(1,Math.min(100000,Math.floor(Number(url.searchParams.get('page'))||1)));
export async function queryRoutes({route,method,user,url,scope}){
 if(method!=='GET')return null;
 if(route==='dashboard'){
  const [where,args]=scope(user),[tw,ta]=user.role==='sales'?['t.assignee_id=?',[user.id]]:scope(user);
  const [cs]=await q(`SELECT COUNT(*) conversations FROM conversations c WHERE ${where}`,args);
  const [fs]=await q(`SELECT COUNT(*) pending FROM findings f JOIN conversations c ON c.id=f.conversation_id WHERE ${where} AND f.review='pending'`,args);
  const [ts]=await q(`SELECT SUM(t.status<>'done') open_tasks,SUM(t.status='done') done_tasks FROM tasks t JOIN conversations c ON c.id=t.conversation_id WHERE ${tw}`,ta);
  const conversations=await q(`SELECT c.*,u.name owner_name,s.name store_name,(SELECT COUNT(*) FROM findings f WHERE f.conversation_id=c.id AND f.review='pending') pending FROM conversations c JOIN users u ON u.id=c.owner_id JOIN stores s ON s.id=c.store_id WHERE ${where} ORDER BY pending DESC,c.id DESC LIMIT 5`,args);
  for(const c of conversations){delete c.audio_path;delete c.ai_run_token;delete c.transcript;delete c.analysis_data;}
  const tasks=await q(`SELECT t.id,t.title,t.status,t.due_date,u.name assignee_name FROM tasks t JOIN conversations c ON c.id=t.conversation_id JOIN users u ON u.id=t.assignee_id WHERE ${tw} AND t.status<>'done' ORDER BY t.due_date,t.id LIMIT 3`,ta);
  return Response.json({stats:{conversations:cs.conversations,pending:fs.pending,open_tasks:Number(ts.open_tasks)||0,done_tasks:Number(ts.done_tasks)||0},conversations,tasks});
 }
 if(route==='conversations/search'){
  const page=pageOf(url),size=20,[visible,args]=scope(user);let where=visible;
  const search=(url.searchParams.get('search')||'').trim().slice(0,160),status=url.searchParams.get('status');
  if(search){where+=' AND (c.title LIKE ? OR c.customer LIKE ? OR u.name LIKE ?)';args.push(...Array(3).fill('%'+search.replace(/[\\%_]/g,'\\$&')+'%'));}
  if(status&&status!=='all'){if(!['ready','processing','failed'].includes(status))throw aiError('状态不正确',400);where+=' AND c.status=?';args.push(status);}
  if(url.searchParams.get('reviews')==='1')where+=" AND EXISTS (SELECT 1 FROM findings f WHERE f.conversation_id=c.id AND f.review='pending')";
  const [count]=await q(`SELECT COUNT(*) total FROM conversations c JOIN users u ON u.id=c.owner_id WHERE ${where}`,args);
  const items=await q(`SELECT c.id,c.title,c.customer,c.owner_id,c.store_id,c.status,c.score,c.analysis_engine,c.analysis_model,c.is_demo,c.created_at,u.name owner_name,s.name store_name,(SELECT COUNT(*) FROM findings f WHERE f.conversation_id=c.id AND f.review='pending') pending FROM conversations c JOIN users u ON u.id=c.owner_id JOIN stores s ON s.id=c.store_id WHERE ${where} ORDER BY c.id DESC LIMIT ${size} OFFSET ${(page-1)*size}`,args);
  return Response.json({items,total:count.total,page,size});
 }
 if(route==='admin/audit/search'){
  if(user.role!=='admin')throw aiError('仅管理员可查看操作日志',403);const page=pageOf(url),search=(url.searchParams.get('search')||'').slice(0,120);const args=[];let where='1=1';if(search){where='(a.action LIKE ? OR a.detail LIKE ? OR u.name LIKE ?)';args.push(...Array(3).fill('%'+search.replace(/[\\%_]/g,'\\$&')+'%'));}
  const [count]=await q(`SELECT COUNT(*) total FROM audit a LEFT JOIN users u ON u.id=a.user_id WHERE ${where}`,args);const items=await q(`SELECT a.*,u.name user_name FROM audit a LEFT JOIN users u ON u.id=a.user_id WHERE ${where} ORDER BY a.id DESC LIMIT 30 OFFSET ${(page-1)*30}`,args);return Response.json({items,total:count.total,page,size:30});
 }
 if(route==='ai/report-history'){
  const page=pageOf(url),[count]=await q('SELECT COUNT(*) total FROM ai_report_insights WHERE user_id=?',[user.id]);const items=await q(`SELECT id,days,content,model,created_at FROM ai_report_insights WHERE user_id=? ORDER BY id DESC LIMIT 10 OFFSET ${(page-1)*10}`,[user.id]);return Response.json({items,total:count.total,page,size:10});
 }
 if(route==='ai/threads/search'){
  const page=pageOf(url),[count]=await q('SELECT COUNT(*) total FROM ai_threads WHERE user_id=?',[user.id]);const items=await q(`SELECT id,title,conversation_id,created_at,updated_at FROM ai_threads WHERE user_id=? ORDER BY updated_at DESC,id DESC LIMIT 30 OFFSET ${(page-1)*30}`,[user.id]);return Response.json({items,total:count.total,page,size:30});
 }
 return null;
}
