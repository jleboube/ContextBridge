const { RateLimiterMemory } = require('rate-limiter-flexible');

// Create rate limiters for different endpoints
const authLimiter = new RateLimiterMemory({
  points: 5, // Number of requests
  duration: 900, // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes if limit exceeded
});

const generalLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

const createRateLimit = (limiter) => {
  return async (req, res, next) => {
    try {
      const key = req.ip || req.connection.remoteAddress;
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const totalHits = Number(rejRes.totalHits) || 1;
      const remainingPoints = Number(rejRes.remainingPoints) || 0;
      const msBeforeNext = Number(rejRes.msBeforeNext) || 1000;

      res.set({
        'Retry-After': Math.round(msBeforeNext / 1000) || 1,
        'X-RateLimit-Limit': limiter.points,
        'X-RateLimit-Remaining': remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext)
      });

      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.round(msBeforeNext / 1000)
      });
    }
  };
};

module.exports = {
  authRateLimit: createRateLimit(authLimiter),
  generalRateLimit: createRateLimit(generalLimiter)
};