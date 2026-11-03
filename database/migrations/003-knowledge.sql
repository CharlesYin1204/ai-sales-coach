CREATE TABLE IF NOT EXISTS knowledge_documents (
 id INT PRIMARY KEY AUTO_INCREMENT, title VARCHAR(160) NOT NULL, category VARCHAR(80) NOT NULL DEFAULT '销售知识',
 content MEDIUMTEXT NOT NULL, store_id INT NULL, author_id INT NOT NULL,
 status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft', revision INT NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX(store_id,status), INDEX(updated_at)
);
CREATE TABLE IF NOT EXISTS knowledge_revisions (
 id INT PRIMARY KEY AUTO_INCREMENT,document_id INT NOT NULL, revision INT NOT NULL, title VARCHAR(160) NOT NULL,
 content MEDIUMTEXT NOT NULL, category VARCHAR(80) NOT NULL,status VARCHAR(20) NOT NULL,editor_id INT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY(document_id,revision),
 FOREIGN KEY(document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ai_message_sources (
 id INT PRIMARY KEY AUTO_INCREMENT,message_id INT NOT NULL,document_id INT NOT NULL,revision INT NOT NULL,
 title VARCHAR(160) NOT NULL,excerpt TEXT NOT NULL,
 FOREIGN KEY(message_id) REFERENCES ai_messages(id) ON DELETE CASCADE,
 INDEX(document_id)
);
