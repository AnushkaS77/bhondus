const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function testImagen() {
  try {
    const model = genAI.getGenerativeModel({ model: "imagen-3.0" });

    const result = await model.generateImage({
      prompt: "A colorful children's storybook illustration of a cat flying on a balloon",
      aspectRatio: "1:1",
    });

    const imageBase64 = result.response.image.base64;
    fs.writeFileSync("test-output.png", Buffer.from(imageBase64, "base64"));
    console.log("✅ Image saved as test-output.png");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

testImagen();
