// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { HfInference } = require('@huggingface/inference');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Hugging Face using your secret token
const hf = new HfInference(process.env.HF_TOKEN);

app.post('/api/generate-kissa', async (req, res) => {
    try {
        const { reportText } = req.body; 

        if (!reportText) {
            return res.status(400).json({ error: "Please provide a report text." });
        }

        // The Master Prompt
        const prompt = `You are an AI Public Health system for rural India. I will give you a report from a health worker. 
        You must analyze it and output ONLY a valid JSON object. Do not use markdown backticks. 
        Structure:
        {
          "alert": "A 3-word warning",
          "kissa_script": [
            {"speaker": "Asha", "text": "Short warning sentence in Hinglish"},
            {"speaker": "Amma", "text": "Short response in Hinglish"}
          ]
        }
        Report: ${reportText}`;

        console.log("Calling Gemma 4...");

        // 🔥 THIS IS WHERE YOU USE GEMMA 4 🔥
        const result = await hf.chatCompletion({
            model: "google/gemma-4-it", // The Gemma 4 Instruct model!
            messages: [
                { role: "user", content: prompt }
            ],
            max_tokens: 500
        });

        // Get the text from Gemma's response
        const responseText = result.choices[0].message.content;
        
        // Clean and parse the JSON safely
        const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanJsonText);

        res.json(data);

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Failed to generate Kissa script using Gemma." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Backend Server running on http://localhost:${PORT}`);
});