process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-chars-long';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

jest.mock('../src/lib/prisma', () => ({
  user: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      mobile: '9876543210',
      role: 'customer',
      isActive: true,
      merchant: null,
      customer: { id: 'cust-1' }
    })
  }
}));

const { authenticate } = require('../src/middleware/auth');
const prisma = require('../src/lib/prisma');

function mockReqRes(authHeader, queryToken) {
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
    query: queryToken ? { token: queryToken } : {}
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects request with no token', async () => {
    const { req, res } = mockReqRes(null, null);
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('accepts valid Bearer token', async () => {
    const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '1h' });
    const { req, res } = mockReqRes(`Bearer ${token}`, null);
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('user-1');
  });

  it('rejects expired token', async () => {
    const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '-1h' });
    const { req, res } = mockReqRes(`Bearer ${token}`, null);
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
  });

  it('rejects token with wrong secret', async () => {
    const token = jwt.sign({ userId: 'user-1' }, 'wrong-secret', { expiresIn: '1h' });
    const { req, res } = mockReqRes(`Bearer ${token}`, null);
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('accepts SSE token in query param', async () => {
    const token = jwt.sign({ userId: 'user-1', purpose: 'sse' }, JWT_SECRET, { expiresIn: '5m' });
    const { req, res } = mockReqRes(null, token);
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects main access token in query param', async () => {
    const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '1h' });
    const { req, res } = mockReqRes(null, token);
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('rejects SSE token via Authorization header', async () => {
    const token = jwt.sign({ userId: 'user-1', purpose: 'sse' }, JWT_SECRET, { expiresIn: '5m' });
    const { req, res } = mockReqRes(`Bearer ${token}`, null);
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('rejects inactive user', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      isActive: false,
      merchant: null,
      customer: null
    });
    const token = jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '1h' });
    const { req, res } = mockReqRes(`Bearer ${token}`, null);
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});
