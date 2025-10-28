import 'dotenv/config';
import sql from '../configs/db.js';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  testsRun++;
  try {
    await fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
  }
}

async function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function assertTrue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

async function runTests() {
  console.log('Starting Database Schema Integration Tests...\n');

  // Setup: Drop and recreate table
  try {
    await sql`DROP TABLE IF EXISTS creations CASCADE`;
    console.log('Dropped existing creations table');
  } catch (e) {
    // Table might not exist
  }

  try {
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
    console.log('Created creations table with proper schema\n');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_creations_userid ON creations("userId")`;
    await sql`CREATE INDEX IF NOT EXISTS idx_creations_publish ON creations(publish)`;
  } catch (e) {
    console.error('Failed to create table:', e.message);
    process.exit(1);
  }

  // Test 1: Table Structure
  await test('Table has creations table with correct columns', async () => {
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'creations'
      ORDER BY column_name
    `;
    
    if (result.length === 0) {
      throw new Error('No columns found in creations table');
    }
    
    const columnNames = result.map(row => row.column_name);
    const requiredColumns = ['id', 'userId', 'prompt', 'content', 'type', 'publish', 'created_at', 'likes'];
    
    for (const col of requiredColumns) {
      if (!columnNames.includes(col)) {
        throw new Error(`Missing column: ${col}`);
      }
    }
  });

  // Test 2: userId column case preservation
  await test('userId column exists in proper case', async () => {
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'creations' AND column_name = 'userId'
    `;
    
    if (result.length !== 1) {
      throw new Error('userId column not found with proper casing');
    }
  });

  // Test 3: Insert article with quoted userId
  await test('Successfully insert article with quoted userId column', async () => {
    const userId = 'test-user-123';
    const prompt = 'Write an article about testing';
    const content = 'This is a test article...';
    
    const result = await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${content}, 'article', false)
      RETURNING id, "userId", content, type
    `;
    
    if (result.length !== 1) {
      throw new Error('Insert failed');
    }
    
    await assertEquals(result[0].userId, userId, 'userId should match');
    await assertEquals(result[0].content, content, 'content should match');
    await assertEquals(result[0].type, 'article', 'type should be article');
  });

  // Test 4: Insert image with quoted userId
  await test('Successfully insert image with quoted userId column', async () => {
    const userId = 'test-user-456';
    const prompt = 'Generate an image';
    const imageUrl = 'https://example.com/image.png';
    
    const result = await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${imageUrl}, 'image', true)
      RETURNING id, "userId", type, publish
    `;
    
    if (result.length !== 1) {
      throw new Error('Insert failed');
    }
    
    await assertEquals(result[0].userId, userId, 'userId should match');
    await assertEquals(result[0].type, 'image', 'type should be image');
    await assertEquals(result[0].publish, true, 'publish should be true');
  });

  // Test 5: Insert resume-review with quoted userId
  await test('Successfully insert resume-review with quoted userId column', async () => {
    const userId = 'test-user-789';
    const prompt = 'Review the uploaded resume';
    const reviewContent = 'Great resume! Here are improvements...';
    
    const result = await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${reviewContent}, 'resume-review', false)
      RETURNING id, "userId", type
    `;
    
    if (result.length !== 1) {
      throw new Error('Insert failed');
    }
    
    await assertEquals(result[0].userId, userId, 'userId should match');
    await assertEquals(result[0].type, 'resume-review', 'type should be resume-review');
  });

  // Test 6: Default values
  await test('Default values are set correctly', async () => {
    const result = await sql`
      INSERT INTO creations ("userId", prompt, content, type)
      VALUES ('default-test', 'Test prompt', 'Test content', 'article')
      RETURNING publish, likes
    `;
    
    if (result.length !== 1) {
      throw new Error('Insert failed');
    }
    
    await assertEquals(result[0].publish, false, 'publish should default to false');
    await assertTrue(Array.isArray(result[0].likes) && result[0].likes.length === 0, 'likes should default to empty array');
  });

  // Test 7: Select by userId
  await test('Retrieve creations by userId using quoted column', async () => {
    const userId = 'select-test-user';
    
    // Insert multiple creations
    await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES 
        (${userId}, 'Prompt 1', 'Content 1', 'article', false),
        (${userId}, 'Prompt 2', 'Content 2', 'image', true)
    `;
    
    const result = await sql`
      SELECT * FROM creations WHERE "userId" = ${userId}
    `;
    
    if (result.length !== 2) {
      throw new Error(`Expected 2 results, got ${result.length}`);
    }
    
    for (const row of result) {
      if (row.userId !== userId) {
        throw new Error(`userId mismatch: ${row.userId} !== ${userId}`);
      }
    }
  });

  // Test 8: Type constraint
  await test('Enforce type check constraint', async () => {
    try {
      await sql`
        INSERT INTO creations ("userId", prompt, content, type)
        VALUES ('constraint-test', 'Test prompt', 'Test content', 'invalid-type')
      `;
      throw new Error('Should have thrown constraint violation error');
    } catch (error) {
      if (error.code !== '23514') {
        throw new Error(`Expected constraint violation (23514), got ${error.code}: ${error.message}`);
      }
    }
  });

  // Test 9: NOT NULL constraint on content
  await test('Enforce NOT NULL constraint on content', async () => {
    try {
      await sql`
        INSERT INTO creations ("userId", prompt, content, type)
        VALUES ('not-null-test', 'Test prompt', NULL, 'article')
      `;
      throw new Error('Should have thrown NOT NULL error');
    } catch (error) {
      if (error.code !== '23502') {
        throw new Error(`Expected NOT NULL violation (23502), got ${error.code}: ${error.message}`);
      }
    }
  });

  // Test 10: Indexes exist
  await test('userId index exists', async () => {
    const result = await sql`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'creations' AND indexname LIKE '%userid%'
    `;
    
    if (result.length === 0) {
      throw new Error('userId index not found');
    }
  });

  // Cleanup
  try {
    await sql`DROP TABLE IF EXISTS creations CASCADE`;
  } catch (e) {
    console.warn('Cleanup warning:', e.message);
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Tests Run: ${testsRun}`);
  console.log(`Tests Passed: ${testsPassed}`);
  console.log(`Tests Failed: ${testsFailed}`);
  console.log(`${'='.repeat(50)}`);

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});