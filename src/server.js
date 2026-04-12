import { createApp } from "./app.js";
import { connectDB } from "./db/connect.js";

async function start() {
  try {
    const port = process.env.PORT;

    const uri = process.env.MONGO_URI;

    await connectDB(uri);
    const app = createApp();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
