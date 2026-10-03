const { app } = require('../backend/server');

// Vercel serverless entrypoint: Vercel mounts this file at /api so all
// Express routes (starting with /api/...) keep their original paths.
// Socket.IO clients connect same-origin and fall back to HTTP long-polling
// (websockets are not supported on serverless).
module.exports = app;
