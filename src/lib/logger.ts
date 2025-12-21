import pino from 'pino';

// Create logger without worker threads for Next.js compatibility
// pino-pretty transport uses worker threads which don't work in Next.js RSC
const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
    level: isProduction ? 'info' : 'debug',
    // In development, use basic formatting without pino-pretty transport
    // to avoid worker thread issues with Next.js Turbopack
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    ...(isProduction ? {} : {
        // Pretty print in development without using worker threads
        base: { pid: false, hostname: false },
    }),
});
