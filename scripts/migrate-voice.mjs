import {q,pool} from '../src/lib/db.js';
try{
 await q("ALTER TABLE ai_models MODIFY kind ENUM('chat','transcription','speech') NOT NULL DEFAULT 'chat'");
 const cols=await q("SHOW COLUMNS FROM ai_settings LIKE 'speech_model_id'");if(!cols.length)await q('ALTER TABLE ai_settings ADD speech_model_id INT NULL');
 await q(`CREATE TABLE IF NOT EXISTS voice_items(id INT PRIMARY KEY AUTO_INCREMENT,user_id INT NOT NULL,title VARCHAR(140) NOT NULL,kind ENUM('speech','recording','upload') NOT NULL,content MEDIUMTEXT NOT NULL,audio_path VARCHAR(100) NOT NULL,mime VARCHAR(80) NOT NULL,model VARCHAR(160),voice VARCHAR(30),speed DECIMAL(3,2),status ENUM('ready','working','failed') NOT NULL DEFAULT 'ready',error VARCHAR(300),busy_token VARCHAR(64),busy_at DATETIME,is_demo BOOLEAN NOT NULL DEFAULT 0,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX(user_id,created_at))`);
 await q('CREATE TABLE IF NOT EXISTS demo_seeds(seed_key VARCHAR(120) PRIMARY KEY,entity VARCHAR(40),entity_id INT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 const [existing]=await q("SELECT id FROM ai_models WHERE kind='speech' ORDER BY id LIMIT 1");let id=existing?.id;
 if(!id){const [source]=await q('SELECT m.* FROM ai_models m JOIN ai_settings s ON s.chat_model_id=m.id WHERE s.id=1');const r=await q("INSERT INTO ai_models(name,base_url,model,kind,api_key_enc,timeout_seconds) VALUES(?,?,'gpt-4o-mini-tts','speech',?,180)",['文字转语音 TTS',source.base_url,source.api_key_enc]);id=r.insertId;}
 await q('UPDATE ai_settings SET speech_model_id=COALESCE(speech_model_id,?) WHERE id=1',[id]);console.log('Voice schema and encrypted speech model configured');
}finally{await pool.end()}
