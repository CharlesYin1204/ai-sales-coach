import {q,pool} from '../src/lib/db.js';
try {if(!(await q("SHOW COLUMNS FROM ai_threads LIKE 'voice_id'")).length)await q('ALTER TABLE ai_threads ADD voice_id INT NULL, ADD CONSTRAINT fk_ai_thread_voice FOREIGN KEY (voice_id) REFERENCES voice_items(id) ON DELETE SET NULL');console.log('Assistant voice schema ready');}finally{await pool.end()}
