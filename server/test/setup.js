// Jest setup for server tests

// Mock environment variables
process.env.GEMINI_API_KEY = 'test-gemini-key'
process.env.NODE_ENV = 'test'

// Mock SQL database
const mockSql = async (strings, ...values) => {
  return { rows: [], rowCount: 0 }
}
mockSql.tagged = true

// Mock clerk client
const mockClerkClient = {
  users: {
    updateUserMetadata: jest.fn().mockResolvedValue({}),
  },
}

// Global mocks
global.mockSql = mockSql
global.mockClerkClient = mockClerkClient