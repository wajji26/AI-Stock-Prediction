const http = require("http");
const app = require("./app.js");
const connectDB = require("./config/db.js"); // <-- add this
const cors = require("cors");

app.use(
  cors({
    origin: "*", // or "http://localhost:8081"
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type, Authorization",
  })
);

const DEFAULT_PORT = 4000;

async function startServer(port) {
  try {
    await connectDB();

    const server = http.createServer(app);

    server.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log(`⚠️ Port ${port} is busy, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error("❌ Server error:", err);
      }
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
  }
}

startServer(process.env.port || DEFAULT_PORT);
