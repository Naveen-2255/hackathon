// server.js

require('dotenv').config(); // Load local .env from backend folder
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const googleTTS = require('google-tts-api');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE SETUP ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// Initialize Google Gemini API
if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ WARNING: GEMINI_API_KEY is not set in backend/.env!");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --------------------------------------------
// === ROUTE 0: IMAGE SCANNER (CLOUD VISION) ===
// ============================================
app.post('/api/scan-prescription', async (req, res) => {
    console.log("\n[PIPELINE START] Received request for Image Scan...");
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: "No image provided." });
        }

        console.log("-> Sending request to Gemini Vision API...");
        
        let rawBase64 = imageBase64;
        let mimeType = "image/jpeg"; // default
        
        // Strip data URI prefix if present
        if (imageBase64.startsWith('data:image')) {
            const matches = imageBase64.match(/^data:(image\/[a-zA-Z]*);base64,([^\"]*)$/);
            if (matches) {
                mimeType = matches[1];
                rawBase64 = matches[2];
            }
        }
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = "Please extract all text from this medical prescription or notice. Return ONLY the extracted text. If it is illegible, return whatever you can decipher.";
        
        const imageParts = [
            {
                inlineData: {
                    data: rawBase64,
                    mimeType
                }
            }
        ];
        
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();
        
        console.log("[PIPELINE SUCCESS] Text extracted successfully from Gemini Vision.");
        res.json({ success: true, text: text });
    } catch (error) {
        console.error("Gemini Vision API Error:", error);
        res.status(500).json({ error: "Failed to read image via Gemini Vision. Please check your API key." });
    }
});

// --------------------------------------------
// === ROUTE 1: TRIAGE AND SCRIPT GENERATOR (OLLAMA LOCAL) ===
// ============================================
app.post('/api/generate-kissa', async (req, res) => {
    console.log("\n[PIPELINE START] Received request for Kissa Generation via Ollama...");
    try {
        const { reportText, mode } = req.body; 

        if (!reportText) {
            return res.status(400).json({ error: "No medical report text provided." });
        }

        console.log(`-> Processing Text Report: "${reportText}"`);
        console.log(`-> Mode: ${mode}`);
        
        const prompt = `You are a professional yet empathetic medical assistant for rural Kerala.
Take this medical text: "${reportText}".

1. FIRST, assess emergency status (is_emergency: boolean).
2. IF NOT EMERGENCY: Create a Kissa (Radio Drama) between 'Asha Chechi' (Nurse) and 'Amma' (Patient).
   - CONSTRAINT: Do NOT use overly complex or flowery metaphors. Keep it grounded and practical.
   - PATIENT NO-QUESTIONS RULE: 'Amma' (the patient) MUST NOT ask any questions. She should only listen, agree, or express understanding. 'Asha Chechi' must proactively explain everything.
   - You must explain the medical advice clearly. Use simple language that a village resident understands, but DO NOT lose the clinical meaning.
   - Focus on: What to take, when to take it, and why it is important for their health.
   - KEEP IT REAL: Talk like two people in a village, not like poets.
   
3. Output ONLY valid JSON.
Structure:
{
  "is_emergency": boolean,
  "alert": "Clear 3-word warning in Malayalam",
  "simple_guide": "A 2-sentence plain language summary of the medical advice in native Malayalam (മലയാളം)",
  "emergency_instructions": "Direct Malayalam commands or null",
  "emergency_contact": "CALL_AMBULANCE_108",
  "kissa_script": [
    {"speaker": "Asha Chechi", "text": "Practical Malayalam dialogue"},
    {"speaker": "Amma", "text": "Practical Malayalam dialogue"}
  ]
}`;

        const ollamaPayload = {
            model: "gemma4:e2b",
            prompt: prompt,
            format: "json",
            stream: false
        };

        console.log("-> Sending request to local Ollama Engine...");
        
        const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ollamaPayload)
        });

        if (!ollamaResponse.ok) {
            throw new Error(`Ollama responded with status: ${ollamaResponse.status}`);
        }

        const ollamaData = await ollamaResponse.json();
        let jsonText = ollamaData.response;

        // Clean any potential markdown wrappers, just in case
        jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();

        try {
            const dataObject = JSON.parse(jsonText);
            console.log("[PIPELINE SUCCESS] Local Triage completed successfully.");
            res.json({ 
                success: true, 
                data: {
                    is_emergency: dataObject.is_emergency,
                    alert: dataObject.alert || "Health Advice",
                    simple_guide: dataObject.simple_guide || null,
                    emergency_instructions: dataObject.emergency_instructions || null,
                    emergency_contact: dataObject.emergency_contact || null,
                    kissa_script: dataObject.kissa_script || []
                }
            });
        } catch (e) {
            console.error("JSON Parsing Error:", e, "Raw output:", jsonText);
            res.status(500).json({ error: "AI failed to structure the response into required JSON format." });
        }

    } catch (error) {
        console.error("Triage API Error:", error);
        res.status(500).json({ error: "Failed to connect to local Ollama engine. Is it running?" });
    }
});

// --------------------------------------------
// === ROUTE 2: CLOUD TTS (GOOGLE TTS API) ===
// ============================================
app.post('/api/tts', async (req, res) => {
    try {
        const { text, slow } = req.body;
        if (!text) {
            return res.status(400).json({ error: "No text provided for TTS." });
        }
        
        const results = await googleTTS.getAllAudioBase64(text, {
            lang: 'ml',
            slow: slow || false,
            host: 'https://translate.google.com',
            splitPunct: ',.?'
        });
        
        res.json({ success: true, audioBase64Array: results.map(r => r.base64) });
    } catch (error) {
        console.error("TTS API Error:", error);
        res.status(500).json({ error: "Failed to generate audio." });
    }
});

// --------------------------------------------
// === START SERVER LISTENER ===
// ============================================
app.listen(PORT, () => {
    console.log(`\n============================================`);
    console.log(`🚀 Offline Backend Server running on http://localhost:${PORT}`);
    console.log(`   Connected to Local Ollama Engine on port 11434.`);
    console.log(`============================================\n`);
});
