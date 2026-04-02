// Test MongoDB connection script
// Run with: node scripts/test-db-connection.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "..", ".env.local") });
dotenv.config({ path: join(__dirname, "..", ".env") });

async function testConnection() {
  console.log("🧪 Testing MongoDB Connection...\n");

  const dbUri = process.env.DATABASE;
  
  if (!dbUri) {
    console.error("❌ DATABASE environment variable is not set!");
    console.log("\n📝 Please set DATABASE in your .env.local file");
    process.exit(1);
  }

  // Mask credentials in connection string for display
  const uriPreview = dbUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  console.log("🔗 Connection String:", uriPreview);
  console.log("");

  try {
    console.log("⏳ Connecting...");
    
    const options = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
    };

    await mongoose.connect(dbUri, options);
    
    console.log("✅ SUCCESS! Connected to MongoDB");
    console.log("📊 Database:", mongoose.connection.db.databaseName);
    console.log("🔌 Ready State:", mongoose.connection.readyState);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("📚 Collections found:", collections.length);
    
    await mongoose.disconnect();
    console.log("👋 Disconnected successfully");
    process.exit(0);
    
  } catch (err) {
    console.error("\n❌ CONNECTION FAILED!");
    console.error("Error:", err.message);
    console.error("Code:", err.code);
    
    if (err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED")) {
      console.log("\n🔴 LIKELY ISSUES:");
      console.log("   1. MongoDB Atlas cluster is PAUSED");
      console.log("      → Go to MongoDB Atlas → Clusters → Click 'Resume'");
      console.log("   2. Your IP address is not whitelisted");
      console.log("      → Go to MongoDB Atlas → Network Access → Add your IP");
      console.log("   3. Connection string format is incorrect");
    } else if (err.message?.includes("authentication")) {
      console.log("\n🔴 AUTHENTICATION ISSUE:");
      console.log("   → Check your username and password in the connection string");
      console.log("   → Verify the database user exists in MongoDB Atlas");
    }
    
    process.exit(1);
  }
}

testConnection();


