import mysql from 'mysql2/promise';
const globalDB=globalThis;
export const pool=globalDB.whalePool || mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectionLimit:5,charset:'utf8mb4',dateStrings:true});
globalDB.whalePool=pool;
export async function q(sql,params=[]){const [r]=await pool.execute(sql,params);return r;}
export async function audit(user,action,detail){await q('INSERT INTO audit(user_id,action,detail) VALUES(?,?,?)',[user?.id||null,action,String(detail).slice(0,500)]);}
