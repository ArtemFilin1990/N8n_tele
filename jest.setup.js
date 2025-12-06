/* eslint-disable no-undef */
require('@testing-library/jest-dom');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-token';

// Mock fetch
global.fetch = jest.fn();


