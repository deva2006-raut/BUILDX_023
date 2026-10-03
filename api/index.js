const { app, io } = require('../backend/server');

// Vercel serverless entrypoint. Vercel mounts this file at /api so Express
// routes (starting with /api/...) keep their original paths. The socket.io
// engine is attached to the http.Server (used in standalone mode), so in
// serverless mode it is invoked explicitly for polling transport (real
// websockets are not supported on serverless).
module.exports = (req, res) => {
  if (req.url.startsWith('/api/socket.io')) {
    return io.engine.handleRequest(req, res);
  }
  return app(req, res);
};
