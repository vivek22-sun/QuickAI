import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resumeReview } from '../controllers/aiController.js';
import multer from 'multer';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock dependencies
jest.mock('../configs/db.js', () => global.mockSql);
jest.mock('@clerk/express', () => ({
  clerkClient: global.mockClerkClient
}));

// Mock OpenAI client with realistic response
const mockOpenAIResponse = {
  choices: [{
    message: {
      content: `Resume Review Analysis:

STRENGTHS:
- Clear contact information and professional presentation
- Strong technical skills relevant to the role
- Good project experience demonstrating practical application
- Clean and well-organized format

AREAS FOR IMPROVEMENT:
- Add quantifiable achievements and metrics where possible
- Include more specific details about project impact and outcomes  
- Consider adding a brief professional summary at the top
- Ensure consistent formatting throughout all sections

RECOMMENDATIONS:
- Highlight specific technologies and frameworks used in projects
- Add metrics showing project success or performance improvements
- Include any certifications or continuing education
- Tailor the resume for specific job applications`
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

// Mock auth middleware for premium user
const mockPremiumAuth = (req, res, next) => {
  req.auth = () => ({ userId: 'test-premium-user-123' });
  req.plan = 'premium';
  req.free_usage = 5;
  next();
};

// Mock auth middleware for free user  
const mockFreeAuth = (req, res, next) => {
  req.auth = () => ({ userId: 'test-free-user-456' });
  req.plan = 'free';
  req.free_usage = 8;
  next();
};

// Setup express app for testing
const createTestApp = (authMiddleware = mockPremiumAuth) => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const upload = multer({ dest: 'uploads/' });
  app.post('/api/ai/resume-review', upload.single('resume'), authMiddleware, resumeReview);
  
  return app;
};

describe('Resume Review Integration Tests', () => {
  const testPDFPath = path.join(__dirname, '../uploads/resume-1761412609083-983161887.pdf');
  let app;
  
  beforeEach(() => {
    app = createTestApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful PDF Processing', () => {
    it('should successfully process a real PDF resume and return detailed review', async () => {
      // Skip test if test PDF doesn't exist
      if (!fs.existsSync(testPDFPath)) {
        console.warn('Skipping PDF integration test - test file not found');
        return;
      }

      const response = await request(app)
        .post('/api/ai/resume-review')
        .attach('resume', testPDFPath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.content).toBeDefined();
      expect(response.body.content.length).toBeGreaterThan(50);
      
      // Verify the review contains expected sections
      expect(response.body.content).toMatch(/STRENGTHS|strengths/i);
      expect(response.body.content).toMatch(/IMPROVEMENT|improvement/i);
      expect(response.body.content).toMatch(/RECOMMENDATIONS|recommendations/i);
      
      // Verify that the SQL insert was called with correct parameters
      expect(global.mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('INSERT INTO creations')]),
        'test-premium-user-123',
        'Review the uploaded resume',
        expect.stringContaining('Resume Review Analysis'),
        'resume-review'
      );
    });
  });

  describe('Error Handling', () => {
    it('should return error when no resume file is uploaded', async () => {
      const response = await request(app)
        .post('/api/ai/resume-review')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'No resume uploaded'
      });
    });

    it('should reject non-premium users', async () => {
      const freeApp = createTestApp(mockFreeAuth);
      
      const response = await request(freeApp)
        .post('/api/ai/resume-review')
        .attach('resume', Buffer.from('%PDF-1.4 fake pdf'), 'test.pdf')
        .expect(200);

      expect(response.body).toEqual({
        success: false,
        message: 'Limit reached. Upgrade to continue'
      });
    });

    it('should handle invalid PDF files gracefully', async () => {
      // Create a temporary invalid file
      const invalidFilePath = path.join(__dirname, '../uploads/test-invalid-resume.txt');
      fs.writeFileSync(invalidFilePath, 'This is not a PDF file - just plain text');

      try {
        const response = await request(app)
          .post('/api/ai/resume-review')
          .attach('resume', invalidFilePath)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBeDefined();
        
        // The error should be related to PDF parsing
        expect(response.body.message).toMatch(/pdf|parse|invalid/i);
        
      } finally {
        // Clean up the test file
        if (fs.existsSync(invalidFilePath)) {
          fs.unlinkSync(invalidFilePath);
        }
      }
    });
  });

  describe('File Size Validation', () => {
    it('should reject files larger than 5MB', async () => {
      // Mock a request with large file size
      const largeSizeAuth = (req, res, next) => {
        req.auth = () => ({ userId: 'test-user-123' });
        req.plan = 'premium';
        req.free_usage = 0;
        // Simulate multer adding file info
        req.file = {
          path: '/fake/path/resume.pdf',
          size: 6 * 1024 * 1024, // 6MB - exceeds 5MB limit
          originalname: 'large-resume.pdf',
          mimetype: 'application/pdf'
        };
        next();
      };

      const testApp = express();
      testApp.use(express.json());
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

  describe('PDF Parse Function Fix Verification', () => {
    it('should verify pdf-parse can be imported and used correctly', async () => {
      // Test the exact import pattern used in resumeReview function
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      
      expect(() => {
        const pdfParse = require('pdf-parse');
        expect(typeof pdfParse).toBe('function');
      }).not.toThrow();
    });
  });
});