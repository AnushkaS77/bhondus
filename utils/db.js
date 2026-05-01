import mongoose from "mongoose";

export default async function db() {
  // If already connected, return
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  // If connection is in progress, wait for it
  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve, reject) => {
      mongoose.connection.once("connected", resolve);
      mongoose.connection.once("error", reject);
    });
  }

  try {
    const dbUri = process.env.DATABASE;
    if (!dbUri) {
      throw new Error("Database URI is not provided. Please set DATABASE environment variable.");
    }

    // Log connection attempt (without exposing credentials)
    const uriPreview = dbUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    console.log("🔄 Attempting to connect to MongoDB...", uriPreview);

    // Connection options for better error handling and reliability
    const options = {
      serverSelectionTimeoutMS: 15000, // Increased to 15 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 15000, // Increased to 15 seconds
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      // Add heartbeat to detect connection issues faster
      heartbeatFrequencyMS: 10000,
    };

    await mongoose.connect(dbUri, options);
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    // Log detailed error for debugging
    console.error("❌ DB CONNECTION ERR!!", err);
    
    // Provide helpful error message based on error type
    let errorMessage = "Failed to connect to database.";
    let troubleshootingSteps = [];
    
    if (err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED") || err.message?.includes("querySrv")) {
      errorMessage = "Database connection refused (ECONNREFUSED).";
      troubleshootingSteps = [
        "🔴 MOST COMMON: MongoDB Atlas cluster is PAUSED - Go to MongoDB Atlas → Clusters → Click 'Resume'",
        "🌐 Your IP address changed - Go to MongoDB Atlas → Network Access → Add your current IP (or use 0.0.0.0/0 for testing)",
        "🔗 Check your DATABASE connection string format (should start with mongodb+srv://)",
        "⏱️ Wait 1-2 minutes after resuming cluster for it to fully start"
      ];
    } else if (err.message?.includes("authentication failed") || err.code === "Unauthorized") {
      errorMessage = "Database authentication failed.";
      troubleshootingSteps = [
        "🔑 Check your DATABASE connection string username and password",
        "👤 Verify the database user exists in MongoDB Atlas → Database Access"
      ];
    } else if (!process.env.DATABASE) {
      errorMessage = "DATABASE environment variable is not set.";
      troubleshootingSteps = [
        "📝 Create a .env.local file in your project root",
        "🔗 Add: DATABASE=your_mongodb_connection_string"
      ];
    } else if (err.message?.includes("timeout") || err.code === "ETIMEDOUT") {
      errorMessage = "Database connection timed out.";
      troubleshootingSteps = [
        "🔴 Check if MongoDB Atlas cluster is running (not paused)",
        "🌐 Verify your IP is whitelisted",
        "🔌 Check your internet connection"
      ];
    } else {
      errorMessage = `Database connection error: ${err.message}`;
      troubleshootingSteps = [
        "🔴 Check MongoDB Atlas cluster status",
        "🌐 Verify Network Access IP whitelist",
        "🔗 Verify DATABASE connection string"
      ];
    }
    
    // Log troubleshooting steps
    console.error("\n📋 Troubleshooting Steps:");
    troubleshootingSteps.forEach(step => console.error(`   ${step}`));
    console.error("");
    
    // Throw error so calling code can handle it
    const dbError = new Error(
      errorMessage + "\n\n" + troubleshootingSteps.join("\n")
    );
    dbError.originalError = err;
    dbError.code = err.code;
    throw dbError;
  }
}
