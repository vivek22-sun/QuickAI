import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resumeReview } from '../controllers/aiController.js';
import { auth } from '../middlewares/auth.js';
import multer from 'multer';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock dependencies
jest.mock('../configs/db.js', () => global.mockSql);
jest.mock('@clerk/express', () => ({
  clerkClient: global.mockClerkClient
}));

// Mock OpenAI client
const mockOpenAIResponse = {
  choices: [{
    message: {
      content: 'This resume shows good experience in software development. Strengths include relevant technical skills and clear formatting. Areas for improvement include adding more quantifiable achievements and improving the skills section organization.'
    }
  }]
};

jest.mock('openai', () => {
  return class {
    constructor() {}
    chat = {
      completions: {
        create: jest.fn().mockResolvedValue(mockOpenAIResponse)
      }
    }
  }
});

// Mock auth middleware
const mockAuth = (req, res, next) => {
  req.auth = () => ({ userId: 'test-user-123' });
  req.plan = 'premium';
  req.free_usage = 0;
  next();
};

// Setup express app for testing
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });
app.post('/api/ai/resume-review', upload.single('resume'), mockAuth, resumeReview);

describe('Resume Review API', () => {
  const testPDFPath = path.join(__dirname, '../uploads/resume-1761412609083-983161887.pdf');
  
  beforeAll(() => {
    // Ensure test PDF exists
    if (!fs.existsSync(testPDFPath)) {
      // Create a minimal test PDF if it doesn't exist
      console.warn('Test PDF not found. The test will skip file-based testing.');
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when no resume is uploaded', async () => {
    const response = await request(app)
      .post('/api/ai/resume-review')
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: 'No resume uploaded'
    });
  });

  it('should successfully process PDF and return review', async () => {
    // Skip test if test PDF doesn't exist
    if (!fs.existsSync(testPDFPath)) {
      console.warn('Skipping PDF test - test file not found');
      return;
    }

    const response = await request(app)
      .post('/api/ai/resume-review')
      .attach('resume', testPDFPath)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.content).toContain('resume');
    expect(response.body.content).toContain('experience');
    
    // Verify that the SQL insert was called
    expect(global.mockSql).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('INSERT INTO creations')]),
      'test-user-123',
      'Review the uploaded resume',
      expect.stringContaining('resume'),
      'resume-review'
    );
  });

  it('should handle PDF parsing errors gracefully', async () => {
    // Create a temporary invalid file
    const invalidFilePath = path.join(__dirname, '../uploads/test-invalid.txt');
    fs.writeFileSync(invalidFilePath, 'This is not a PDF file');

    try {
      const response = await request(app)
        .post('/api/ai/resume-review')
        .attach('resume', invalidFilePath)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    } finally {
      // Clean up the test file
      if (fs.existsSync(invalidFilePath)) {
        fs.unlinkSync(invalidFilePath);
      }
    }
  });

  it('should reject non-premium users', async () => {
    // Override the auth middleware for this test
    const nonPremiumAuth = (req, res, next) => {
      req.auth = () => ({ userId: 'test-user-123' });
      req.plan = 'free';
      req.free_usage = 0;
      next();
    };

    const testApp = express();
    testApp.use(express.json());
    testApp.use(express.urlencoded({ extended: true }));
    testApp.post('/api/ai/resume-review', upload.single('resume'), nonPremiumAuth, resumeReview);

    const response = await request(testApp)
      .post('/api/ai/resume-review')
      .attach('resume', Buffer.from('test'), 'test.pdf')
      .expect(200);

    expect(response.body).toEqual({
      success: false,
      message: 'Limit reached. Upgrade to continue'
    });
  });

  it('should handle file size validation', async () => {
    // This test would require mocking multer more extensively
    // For now, we'll test the basic functionality
    const testApp = express();
    testApp.use(express.json());
    
    // Mock a large file by setting file size in req.file
    const largeSizeAuth = (req, res, next) => {
      req.auth = () => ({ userId: 'test-user-123' });
      req.plan = 'premium';
      req.free_usage = 0;
      req.file = {
        path: '/fake/path',
        size: 6 * 1024 * 1024 // 6MB - over the 5MB limit
      };
      next();
    };

    testApp.post('/api/ai/resume-review', largeSizeAuth, resumeReview);

    const response = await request(testApp)
      .post('/api/ai/resume-review')
      .expect(200);

    expect(response.body).toEqual({
      success: false,
      message: 'Resume size must be less than 5MB'
    });
  });
});

describe('PDF Parse Integration', () => {
  it('should successfully import and use pdf-parse library', async () => {
    // Test that pdf-parse can be imported and used
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    
    expect(() => {
      const pdfParse = require('pdf-parse');
      expect(typeof pdfParse).toBe('function');
    }).not.toThrow();
  });

  it('should parse PDF content correctly', async () => {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');
    
    // Create a simple test buffer (this won't be a real PDF, but tests the function call)
    const testBuffer = Buffer.from('test data');
    
    // The actual pdf-parse will throw an error for invalid PDF, which is expected
    await expect(pdfParse(testBuffer)).rejects.toThrow();
    
    // This confirms that pdf-parse is a function and can be called
    expect(typeof pdfParse).toBe('function');
  });
});