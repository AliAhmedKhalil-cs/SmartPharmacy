import helmet from 'helmet';
import cors from 'cors';
import { rateLimit as expressRateLimit } from 'express-rate-limit';

export const securityHeaders = helmet();

export const rateLimit = expressRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // استخدمنا max بدلاً من limit
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.'
});

export const corsConfig = cors();