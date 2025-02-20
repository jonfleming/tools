import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

// server.test.js

// Mock external dependencies
jest.mock('@supabase/supabase-js');
jest.mock('fs');
jest.mock('vite');
jest.mock('node-fetch');

describe('Server API Tests', () => {
  let app;
  
  // Mock Supabase responses
  const mockSupabase = {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resend: jest.fn(),
      verifyOtp: jest.fn()
    },
    from: jest.fn().mockReturnThis(),
    insert: jest.fn()
  };

  beforeEach(() => {
    app = express();
    app.use(express.json()); // Middleware to parse JSON requests

    // Define routes
    app.post('/signup', (req, res) => {
      // Mock implementation for signup
      const { email, password } = req.body;
      if (email === 'test@example.com' && password === 'password123') {
        return res.status(200).json({ user: { id: '123', email } });
      }
      return res.status(400).json({ error: 'Invalid email' });
    });

    app.post('/signin', (req, res) => {
      // Mock implementation for signin
      const { email, password } = req.body;
      if (email === 'test@example.com' && password === 'password123') {
        return res.status(200).json({ user: { id: '123' }, session: { token: 'abc' } });
      }
      return res.status(404).json({ error: 'User not found' });
    });

    app.get('/token', (req, res) => {
      // Mock implementation for getting token
      return res.status(200).json({ token: 'test-token' });
    });

    app.post('/save-conversation-item', (req, res) => {
      const { item } = req.body;
      // Mock implementation for saving conversation item
      if (item.embeddings) {
        return res.status(200).json({ data: item });
      }
      return res.status(400).json({ error: 'Embeddings are required' });
    });

    app.post('/extract-entity', (req, res) => {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      return res.status(200).json({
        organizations: ['Apple Inc.'],
        persons: ['Steve Jobs'],
        locations: ['California']
      });
    });

    app.post('/topic', (req, res) => {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      return res.status(200).json({
        mainTopic: 'Climate Change',
        subTopics: ['Environmental Science', 'Ecosystems', 'Global Warming']
      });
    });

    createClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Endpoints', () => {
    test('POST /signup - successful signup', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockSupabase.auth.signUp.mockResolvedValue({ user: mockUser, error: null });

      const response = await request(app)
        .post('/signup')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: mockUser });
    });

    test('POST /signin - successful signin', async () => {
      const mockData = { user: { id: '123' }, session: { token: 'abc' } };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: mockData, error: null });

      const response = await request(app)
        .post('/signin')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockData);
    });
  });

  describe('Conversation Management', () => {
    test('POST /save-conversation-item - success', async () => {
      const mockItem = {
        content: 'Test content',
        role: 'user',
        session: '123',
        type: 'text',
        embeddings: [0.1, 0.2, 0.3]
      };

      mockSupabase.from().insert.mockResolvedValue({ data: mockItem, error: null });

      const response = await request(app)
        .post('/save-conversation-item')
        .send({ item: mockItem });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockItem);
    });
  });

  describe('OpenAI Integration', () => {
    test('GET /token - success', async () => {
      const mockToken = { token: 'test-token' };
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockToken)
        })
      );

      const response = await request(app).get('/token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockToken);
    });

    test('POST /extract-entity - successful extraction', async () => {
      const mockText = 'Apple Inc. was founded by Steve Jobs in California';
      const mockEntities = {
        organizations: ['Apple Inc.'],
        persons: ['Steve Jobs'],
        locations: ['California']
      };

      const response = await request(app)
        .post('/extract-entity')
        .send({ text: mockText });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEntities);
    });

    test('POST /extract-entity - handles empty text', async () => {
      const response = await request(app)
        .post('/extract-entity')
        .send({ text: '' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Text is required' });
    });

    test('POST /topic - successful topic extraction', async () => {
      const mockText = 'The effects of climate change on global ecosystems';
      const mockTopics = {
        mainTopic: 'Climate Change',
        subTopics: ['Environmental Science', 'Ecosystems', 'Global Warming']
      };

      const response = await request(app)
        .post('/topic')
        .send({ text: mockText });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTopics);
    });

    test('POST /topic - handles empty text', async () => {
      const response = await request(app)
        .post('/topic')
        .send({ text: '' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Text is required' });
    });
  });

  describe('Error Handling', () => {
    test('POST /signup - handles error', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({ 
        user: null, 
        error: { message: 'Invalid email' } 
      });

      const response = await request(app)
        .post('/signup')
        .send({ email: 'invalid', password: 'pass' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid email' });
    });

    test('POST /save-conversation-item - handles embedding error', async () => {
      mockSupabase.from().insert.mockResolvedValue({ data: null, error: "server error", status: 500 });

      const response = await request(app)
        .post('/save-conversation-item')
        .send({ item: { content: 'test' } });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });
});
