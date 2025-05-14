import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai'; 

dotenv.config()

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);  // Make sure your API key is in .env

router.post('/chatting', async (req, res) => {
  try {
    const userMessage = req.body.message;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // or gemini-1.5-pro

    const result = await model.generateContent(userMessage);

    const response = await result.response;
    const text = response.text();

    console.log("Gemini response:", text);
    res.json({ reply: text });

  } catch (err) {
    console.error("Error in Gemini chat route:", err);
    res.status(500).json({ error: "Failed to get response from Gemini API" });
  }
});

export default router;
