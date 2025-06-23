const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI("AIzaSyAuei9X6NFbOeTHZDa0TE9IffKCvl-eN3Q"); // Replace with your real key

(async () => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(["Hello Gemini"]);
    const text = await result.response.text();
    console.log("✅ Response:", text);
  } catch (err) {
    console.error("❌ Error:", err);
  }
})();
