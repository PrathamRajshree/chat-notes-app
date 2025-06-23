console.log("🔑 Groq API Key:", process.env.GROQ_API_KEY);
require('dotenv').config();
console.log("✅ .env loaded. Keys:", Object.keys(process.env));

const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const session = require('express-session');
const mongoose = require('mongoose');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const axios = require('axios');
const PDFDocument = require('pdfkit');

const authRoutes = require('./routes/auth');
const app = express();

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ DB Connection Error:', err));

// ✅ Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use('/', authRoutes);

// ✅ Multer Config
const upload = multer({ dest: 'uploads/' });

// ✅ Upload PDF
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).send('No file uploaded.');

    const buffer = fs.readFileSync(file.path);
    const data = await pdfParse(buffer);
    req.session.pdfText = data.text;
    req.session.pdfName = file.originalname;

    fs.unlinkSync(file.path);
    res.redirect('/dashboard.html?uploaded=success');
  } catch (err) {
    console.error('❌ Upload/PDF parse error:', err);
    res.status(500).send('Failed to process PDF.');
  }
});

// ✅ Shared Groq API Call
async function groqCall(systemPrompt, userPrompt) {
  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama3-70b-8192',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data.choices[0].message.content;
}

// ✅ Ask a Question
app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const context = req.session.pdfText;
    if (!context) return res.status(400).send("No PDF uploaded yet.");

    const result = await groqCall(
      "You are a helpful assistant that answers questions based on PDF content.",
      `PDF Content:\n${context}\n\nQuestion:\n${question}`
    );

    res.send(result);
  } catch (err) {
    console.error("❌ Groq Ask Error:", err.response?.data || err.message);
    res.status(500).send("Error generating answer from Groq.");
  }
});

// ✅ Summarize
app.post('/summarize', async (req, res) => {
  try {
    const context = req.session.pdfText;
    if (!context) return res.status(400).send("No PDF uploaded yet.");

    const result = await groqCall(
      "You are a helpful assistant that summarizes documents into key points.",
      `Summarize the following PDF content:\n\n${context}`
    );

    res.send(result);
  } catch (err) {
    console.error("❌ Groq Summarize Error:", err.response?.data || err.message);
    res.status(500).send("Error generating summary from Groq.");
  }
});

// ✅ Generate Quiz (text)
app.post('/generate-quiz', async (req, res) => {
  try {
    const context = req.session.pdfText;
    if (!context) return res.status(400).send("No PDF uploaded yet.");

    const result = await groqCall(
      "You are a quiz generator. Create MCQs from the content.",
      `Generate 5 multiple-choice questions (with 4 options each) from this PDF:\n\n${context}`
    );

    res.send(result);
  } catch (err) {
    console.error("❌ Groq Quiz Error:", err.response?.data || err.message);
    res.status(500).send("Error generating quiz from Groq.");
  }
});

// ✅ Flashcards (Q&A pairs)
app.post('/flashcards', async (req, res) => {
  try {
    const context = req.session.pdfText;
    if (!context) return res.status(400).send("No PDF uploaded yet.");

    const result = await groqCall(
      "Generate flashcards as Q&A pairs.",
      `Create 5 flashcards with a question and a short answer from this text:\n\n${context}`
    );

    res.send(result);
  } catch (err) {
    console.error("❌ Groq Flashcard Error:", err.response?.data || err.message);
    res.status(500).send("Error generating flashcards.");
  }
});

// ✅ Download Quiz as PDF
app.get('/download-quiz', async (req, res) => {
  try {
    const context = req.session.pdfText;
    if (!context) return res.status(400).send("No PDF uploaded yet.");

    const quiz = await groqCall(
      "You are a quiz generator.",
      `Generate a 5-question quiz from this content:\n\n${context}`
    );

    const doc = new PDFDocument();
    res.setHeader('Content-disposition', 'attachment; filename=quiz.pdf');
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);
    doc.fontSize(18).text('📘 Quiz from Your PDF', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(quiz);
    doc.end();
  } catch (err) {
    console.error("❌ Groq Download Quiz Error:", err.response?.data || err.message);
    res.status(500).send("Error generating downloadable quiz.");
  }
});

// ✅ Get PDF Name
app.get('/pdf-name', (req, res) => {
  const name = req.session.pdfName || 'Unknown';
  res.send(name);
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
