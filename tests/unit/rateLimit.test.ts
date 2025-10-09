import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

// Mock the monitoring module
vi.mock('../../utils/monitoring', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { rateLimit, rateLimitPresets, withRateLimit } from '../../utils/rateLimit';

describe('Rate Limiting', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockNext: () => void;
  let requestCounter = 0;

  beforeEach(() => {
    // Use unique URL and IP for each test to avoid store collisions
    requestCounter++;
    mockReq = {
      url: `/api/test-${requestCounter}`,
      headers: {},
      socket: {
        remoteAddress: `127.0.0.${requestCounter}`,
      } as any,
    };

    mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockNext = vi.fn();

    vi.clearAllMocks();
  });

  describe('rateLimit middleware', () => {
    it('should allow requests within rate limit', async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      const result = await limiter(
        mockReq as NextApiRequest,
        mockRes as NextApiResponse,
        mockNext
      );

      expect(result).toBe(true);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 2,
      });

      // Make 3 requests (should block on 3rd)
      await limiter(mockReq as NextApiRequest, mockRes as NextApiResponse);
      await limiter(mockReq as NextApiRequest, mockRes as NextApiResponse);
      const result = await limiter(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(result).toBe(false);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: expect.any(Number),
      });
    });

    it('should set correct rate limit headers', async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 10,
      });

      await limiter(mockReq as NextApiRequest, mockRes as NextApiResponse);

      const setHeaderCalls = (mockRes.setHeader as any).mock.calls;
      expect(setHeaderCalls).toContainEqual(['X-RateLimit-Limit', '10']);
      expect(setHeaderCalls).toContainEqual(['X-RateLimit-Remaining', '9']);
      expect(setHeaderCalls.some((call: any[]) =>
        call[0] === 'X-RateLimit-Reset' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(call[1])
      )).toBe(true);
    });

    it('should use IP address as identifier by default', async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      mockReq.socket = { remoteAddress: '192.168.1.1' } as any;

      await limiter(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
    });

    it('should use x-forwarded-for header if present', async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      mockReq.headers = { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' };

      await limiter(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
    });

    it('should differentiate between different endpoints', async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 2,
      });

      // Request to endpoint 1
      mockReq.url = '/api/endpoint1';
      await limiter(mockReq as NextApiRequest, mockRes as NextApiResponse);
      await limiter(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Request to endpoint 2 (should not be blocked)
      mockReq.url = '/api/endpoint2';
      const result = await limiter(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(result).toBe(true);
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });
  });

  describe('rateLimitPresets', () => {
    it('should have strict preset configured', () => {
      expect(rateLimitPresets.strict).toEqual({
        windowMs: 60000,
        maxRequests: 10,
      });
    });

    it('should have standard preset configured', () => {
      expect(rateLimitPresets.standard).toEqual({
        windowMs: 60000,
        maxRequests: 100,
      });
    });

    it('should have relaxed preset configured', () => {
      expect(rateLimitPresets.relaxed).toEqual({
        windowMs: 60000,
        maxRequests: 300,
      });
    });
  });

  describe('withRateLimit wrapper', () => {
    it('should call handler when rate limit not exceeded', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = withRateLimit(rateLimitPresets.relaxed, handler);

      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(handler).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });

    it('should not call handler when rate limit exceeded', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrappedHandler = withRateLimit(
        { windowMs: 60000, maxRequests: 1 },
        handler
      );

      // First request should succeed
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(handler).toHaveBeenCalledTimes(1);

      // Reset mocks but keep same request (same IP/URL)
      vi.clearAllMocks();

      // Second request should be blocked
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);
      expect(handler).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(429);
    });
  });
});
