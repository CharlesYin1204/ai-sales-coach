import {readFile} from 'node:fs/promises';import {q,pool} from '../src/lib/db.js';
try{for(const sql of (await readFile('database/migrations/004-collaboration.sql','utf8')).split(';').map(x=>x.trim()).filter(Boolean))await q(sql);console.log('Collaboration migration complete');}finally{await pool.end()}
