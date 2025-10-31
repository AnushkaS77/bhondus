// No need to import fetch in Node 18+

async function checkReplicateCredits() {
    try {
      const res = await fetch("https://api.replicate.com/v1/account", {
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
      });
  
      if (!res.ok) {
        throw new Error(`Failed to fetch credits: ${res.status}`);
      }
  
      const data = await res.json();
  
      console.log("✅ Replicate Account Info:");
      console.log("Username:", data.username);
      console.log("Email:", data.email);
      console.log("Plan:", data.plan);
      console.log("Usage:", data.usage);
      console.log("Billing URL: https://replicate.com/account/billing");
  
      return data;
    } catch (err) {
      console.error("❌ Error checking credits:", err.message);
      throw err;
    }
  }
  
  // Run directly if you call `node checkCredits.js`
  if (require.main === module) {
    checkReplicateCredits();
  }
  