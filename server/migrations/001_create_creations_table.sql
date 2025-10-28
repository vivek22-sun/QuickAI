-- Create creations table
CREATE TABLE IF NOT EXISTS creations (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL,
  prompt TEXT,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  publish BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  likes TEXT[] DEFAULT '{}',
  CONSTRAINT type_check CHECK (type IN ('article', 'image', 'resume-review'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_creations_userid ON creations(userId);
CREATE INDEX IF NOT EXISTS idx_creations_publish ON creations(publish);