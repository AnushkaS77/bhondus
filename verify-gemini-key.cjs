const logKeyPrefix = () => {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key) {
    console.error("Missing GEMINI_API_KEY environment variable.");
    return false;
  }

  console.log("API key prefix:", key.slice(0, 4));
  return true;
};

(async () => {
  if (!logKeyPrefix()) {
    return;
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("ping");

    console.log("Success response snippet:", result.response.text().slice(0, 80));
  } catch (err) {
    console.error("Request failed:", {
      status: err.status,
      statusText: err.statusText,
      message: err.message,
      errorInfo: err.errorInfo,
    });
  }
})();

