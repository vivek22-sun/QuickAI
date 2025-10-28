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

async function runTests() {
  console.log('Starting API Integration Tests...\n');

  // Setup: Ensure database is ready
  try {
    await sql`DROP TABLE IF EXISTS creations CASCADE`;
    
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

    await sql`CREATE INDEX IF NOT EXISTS idx_creations_userid ON creations("userId")`;
    await sql`CREATE INDEX IF NOT EXISTS idx_creations_publish ON creations(publish)`;
    
    console.log('Database setup complete\n');
  } catch (e) {
    console.error('Failed to setup database:', e.message);
    process.exit(1);
  }

  // Test 1: Article creation simulation
  await test('Simulate generateArticle controller logic', async () => {
    const userId = 'test-user-article';
    const prompt = 'Write an article about AI';
    const content = 'Article content about AI...';

    const result = await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${content}, 'article', false)
      RETURNING id, "userId", prompt, content, type
    `;

    if (!result[0]) {
      throw new Error('Failed to insert article');
    }

    if (result[0].userId !== userId || result[0].type !== 'article') {
      throw new Error('Article data mismatch');
    }
  });

  // Test 2: Blog title creation simulation
  await test('Simulate generateBlogTitle controller logic', async () => {
    const userId = 'test-user-blog';
    const prompt = 'Generate blog title';
    const content = 'Top 10 AI Trends in 2024';

    const result = await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${content}, 'article', false)
      RETURNING id, "userId", prompt, content
    `;

    if (!result[0]) {
      throw new Error('Failed to insert blog title');
    }

    if (result[0].content !== content) {
      throw new Error('Blog title content mismatch');
    }
  });

  // Test 3: Image creation simulation (publish=true)
  await test('Simulate generateImage controller logic (published)', async () => {
    const userId = 'test-user-image';
    const prompt = 'Generate landscape image';
    const imageUrl = 'https://example.com/image.png';
    const publish = true;

    const result = await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${imageUrl}, 'image', ${publish})
      RETURNING id, "userId", content, type, publish
    `;

    if (!result[0]) {
      throw new Error('Failed to insert image');
    }

    if (result[0].publish !== true || result[0].type !== 'image') {
      throw new Error('Image data mismatch');
    }
  });

  // Test 4: Resume review creation
  await test('Simulate resumeReview controller logic', async () => {
    const userId = 'test-user-resume';
    const prompt = 'Review the uploaded resume';
    const reviewContent = 'Excellent resume with strong technical background...';

    const result = await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${reviewContent}, 'resume-review', false)
      RETURNING id, "userId", content, type
    `;

    if (!result[0]) {
      throw new Error('Failed to insert resume review');
    }

    if (result[0].type !== 'resume-review') {
      throw new Error('Resume review type mismatch');
    }
  });

  // Test 5: Get user creations (getUserCreations simulation)
  await test('Simulate getUserCreations controller logic', async () => {
    const userId = 'test-get-user';
    
    // Insert test data
    await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES 
        (${userId}, 'Prompt 1', 'Content 1', 'article', false),
        (${userId}, 'Prompt 2', 'Content 2', 'image', true),
        (${userId}, 'Prompt 3', 'Content 3', 'article', false)
    `;

    // Get user creations
    const result = await sql`
      SELECT * FROM creations WHERE "userId" = ${userId} ORDER BY created_at DESC
    `;

    if (result.length !== 3) {
      throw new Error(`Expected 3 creations, got ${result.length}`);
    }

    // Verify all belong to the same user
    for (const creation of result) {
      if (creation.userId !== userId) {
        throw new Error('Mismatch in userId retrieval');
      }
    }
  });

  // Test 6: Get published creations
  await test('Simulate getPublishedCreation controller logic', async () => {
    const userId = 'test-published';
    
    // Insert mixed published/unpublished
    await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES 
        (${userId}, 'Prompt 1', 'Content 1', 'article', true),
        (${userId}, 'Prompt 2', 'Content 2', 'image', false),
        (${userId}, 'Prompt 3', 'Content 3', 'article', true)
    `;

    // Get only published
    const result = await sql`
      SELECT * FROM creations WHERE publish = true ORDER BY created_at DESC
    `;

    if (result.length === 0) {
      throw new Error('No published creations found');
    }

    // Verify all are published
    for (const creation of result) {
      if (creation.publish !== true) {
        throw new Error('Non-published content in published results');
      }
    }
  });

  // Test 7: Background removal simulation
  await test('Simulate removeImageBackground controller logic', async () => {
    const userId = 'test-remove-bg';
    const prompt = 'Remove background from image';
    const imageUrl = 'https://cloudinary.com/processed-image.png';

    const result = await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${imageUrl}, 'image', true)
      RETURNING id, "userId", prompt, content, type, publish
    `;

    if (!result[0]) {
      throw new Error('Failed to insert background removal result');
    }

    if (result[0].publish !== true) {
      throw new Error('Background removal should be auto-published');
    }
  });

  // Test 8: Object removal simulation
  await test('Simulate removeImageObject controller logic', async () => {
    const userId = 'test-remove-obj';
    const prompt = 'Removed person from image';
    const imageUrl = 'https://cloudinary.com/object-removed.png';

    const result = await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${imageUrl}, 'image', true)
      RETURNING id, "userId", prompt, content, type, publish
    `;

    if (!result[0]) {
      throw new Error('Failed to insert object removal result');
    }

    if (result[0].type !== 'image') {
      throw new Error('Object removal should create image type');
    }
  });

  // Test 9: Multiple operations in sequence (transaction-like)
  await test('Handle multiple operations in sequence', async () => {
    const userId = 'test-sequence';
    
    // Create multiple creations
    for (let i = 0; i < 5; i++) {
      await sql`
        INSERT INTO creations ("userId", prompt, content, type, publish)
        VALUES (${userId}, ${'Prompt ' + i}, ${'Content ' + i}, 'article', false)
      `;
    }

    // Verify count
    const countResult = await sql`
      SELECT COUNT(*)::int as count FROM creations WHERE "userId" = ${userId}
    `;

    if (parseInt(countResult[0].count) !== 5) {
      throw new Error(`Expected 5 creations, got ${countResult[0].count}`);
    }
  });

  // Test 10: Data persistence and retrieval
  await test('Verify data persistence and retrieval', async () => {
    const userId = 'test-persist';
    const testContent = 'This is persistent test data';

    // Insert
    const insertResult = await sql`
      INSERT INTO creations ("userId", prompt, content, type, publish)
      VALUES (${userId}, 'Test prompt', ${testContent}, 'article', false)
      RETURNING id
    `;

    const insertedId = insertResult[0].id;

    // Retrieve
    const retrieveResult = await sql`
      SELECT * FROM creations WHERE id = ${insertedId}
    `;

    if (retrieveResult[0].content !== testContent) {
      throw new Error('Data persistence check failed');
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
    console.log('\n✓ All API integration tests passed!');
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});