import 'dotenv/config';
import sql from '../configs/db.js';

describe('Database Schema Integration Tests', () => {
  beforeAll(async () => {
    try {
      // Drop existing table if it exists
      await sql`DROP TABLE IF EXISTS creations CASCADE`;
      
      // Create creations table with proper schema
      await sql`
        CREATE TABLE IF NOT EXISTS creations (
          id SERIAL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          prompt TEXT,
          content TEXT NOT NULL,
          type VARCHAR(50) NOT NULL,
          publish BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          likes TEXT[] DEFAULT '{}',
          CONSTRAINT type_check CHECK (type IN ('article', 'image', 'resume-review'))
        )
      `;

      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_creations_userid ON creations("userId")`;
      await sql`CREATE INDEX IF NOT EXISTS idx_creations_publish ON creations(publish)`;
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data
      await sql`DROP TABLE IF EXISTS creations CASCADE`;
    } catch (error) {
      console.warn('Failed to cleanup test database:', error.message);
    }
  });

  describe('Table Structure', () => {
    it('should have creations table with correct columns', async () => {
      const result = await sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'creations'
        ORDER BY column_name
      `;

      expect(result.length).toBeGreaterThan(0);
      
      const columnNames = result.map(row => row.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('prompt');
      expect(columnNames).toContain('content');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('publish');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('likes');
    });

    it('should have userId column in proper case', async () => {
      const result = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'creations' AND column_name = 'userId'
      `;

      expect(result.length).toBe(1);
      expect(result[0].column_name).toBe('userId');
      expect(result[0].data_type).toBe('text');
    });

    it('should have proper column data types', async () => {
      const result = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'creations'
      `;

      const typeMap = Object.fromEntries(result.map(r => [r.column_name, r.data_type]));
      
      expect(typeMap.id).toBe('integer');
      expect(typeMap.userId).toBe('text');
      expect(typeMap.content).toBe('text');
      expect(typeMap.type).toBe('character varying');
      expect(typeMap.publish).toBe('boolean');
    });
  });

  describe('Insert Operations', () => {
    it('should successfully insert article with quoted userId column', async () => {
      const userId = 'test-user-123';
      const prompt = 'Write an article about testing';
      const content = 'This is a test article...';
      
      const result = await sql`
        INSERT INTO creations ("userId", prompt, content, type, publish)
        VALUES (${userId}, ${prompt}, ${content}, 'article', false)
        RETURNING id, "userId", content, type
      `;

      expect(result.length).toBe(1);
      expect(result[0].userId).toBe(userId);
      expect(result[0].content).toBe(content);
      expect(result[0].type).toBe('article');
    });

    it('should successfully insert image with quoted userId column', async () => {
      const userId = 'test-user-456';
      const prompt = 'Generate an image';
      const imageUrl = 'https://example.com/image.png';
      
      const result = await sql`
        INSERT INTO creations ("userId", prompt, content, type, publish)
        VALUES (${userId}, ${prompt}, ${imageUrl}, 'image', true)
        RETURNING id, "userId", type, publish
      `;

      expect(result.length).toBe(1);
      expect(result[0].userId).toBe(userId);
      expect(result[0].type).toBe('image');
      expect(result[0].publish).toBe(true);
    });

    it('should successfully insert resume-review with quoted userId column', async () => {
      const userId = 'test-user-789';
      const prompt = 'Review the uploaded resume';
      const reviewContent = 'Great resume! Here are improvements...';
      
      const result = await sql`
        INSERT INTO creations ("userId", prompt, content, type, publish)
        VALUES (${userId}, ${prompt}, ${reviewContent}, 'resume-review', false)
        RETURNING id, "userId", type
      `;

      expect(result.length).toBe(1);
      expect(result[0].userId).toBe(userId);
      expect(result[0].type).toBe('resume-review');
    });

    it('should handle multiple inserts without column name errors', async () => {
      const userId = 'multi-test-user';
      
      for (let i = 0; i < 3; i++) {
        const result = await sql`
          INSERT INTO creations ("userId", prompt, content, type, publish)
          VALUES (${userId}, ${'Prompt ' + i}, ${'Content ' + i}, 'article', false)
          RETURNING id
        `;
        expect(result.length).toBe(1);
      }

      // Verify all inserts were successful
      const allInserts = await sql`
        SELECT COUNT(*) as count FROM creations WHERE "userId" = ${userId}
      `;
      expect(allInserts[0].count).toBe(3);
    });
  });

  describe('Select Operations', () => {
    beforeEach(async () => {
      // Insert test data
      await sql`
        INSERT INTO creations ("userId", prompt, content, type, publish)
        VALUES 
          ('select-test-user-1', 'Prompt 1', 'Content 1', 'article', false),
          ('select-test-user-1', 'Prompt 2', 'Content 2', 'image', true),
          ('select-test-user-2', 'Prompt 3', 'Content 3', 'article', true)
      `;
    });

    it('should retrieve creations by userId using quoted column', async () => {
      const userId = 'select-test-user-1';
      const result = await sql`
        SELECT * FROM creations WHERE "userId" = ${userId}
      `;

      expect(result.length).toBe(2);
      expect(result.every(r => r.userId === userId)).toBe(true);
    });

    it('should retrieve published creations', async () => {
      const result = await sql`
        SELECT * FROM creations WHERE publish = true
      `;

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(r => r.publish === true)).toBe(true);
    });

    it('should maintain data integrity with multiple queries', async () => {
      const userId = 'select-test-user-1';
      
      // First query
      const result1 = await sql`SELECT * FROM creations WHERE "userId" = ${userId}`;
      const count1 = result1.length;

      // Second query
      const result2 = await sql`SELECT * FROM creations WHERE "userId" = ${userId}`;
      const count2 = result2.length;

      expect(count1).toBe(count2);
    });
  });

  describe('Default Values and Constraints', () => {
    it('should set default publish to false', async () => {
      const result = await sql`
        INSERT INTO creations ("userId", prompt, content, type)
        VALUES ('default-test', 'Test prompt', 'Test content', 'article')
        RETURNING publish
      `;

      expect(result[0].publish).toBe(false);
    });

    it('should set default likes to empty array', async () => {
      const result = await sql`
        INSERT INTO creations ("userId", prompt, content, type)
        VALUES ('likes-test', 'Test prompt', 'Test content', 'article')
        RETURNING likes
      `;

      expect(result[0].likes).toEqual([]);
    });

    it('should enforce type check constraint', async () => {
      try {
        await sql`
          INSERT INTO creations ("userId", prompt, content, type)
          VALUES ('invalid-type-test', 'Test prompt', 'Test content', 'invalid-type')
        `;
        fail('Should have thrown constraint error');
      } catch (error) {
        expect(error.code).toBe('23514'); // PostgreSQL constraint violation code
      }
    });

    it('should require content field', async () => {
      try {
        await sql`
          INSERT INTO creations ("userId", prompt, content, type)
          VALUES ('no-content-test', 'Test prompt', NULL, 'article')
        `;
        fail('Should have thrown NOT NULL error');
      } catch (error) {
        expect(error.code).toBe('23502'); // PostgreSQL NOT NULL violation code
      }
    });
  });

  describe('Index Performance', () => {
    it('should have userId index', async () => {
      const result = await sql`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'creations' AND indexname LIKE '%userid%'
      `;

      expect(result.length).toBeGreaterThan(0);
    });

    it('should have publish index', async () => {
      const result = await sql`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'creations' AND indexname LIKE '%publish%'
      `;

      expect(result.length).toBeGreaterThan(0);
    });
  });
});