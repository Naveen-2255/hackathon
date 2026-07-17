// server.js

require('dotenv').config(); // Load local .env from backend folder
const express = require('express');
const cors = require('cors');
const tesseract = require('tesseract.js');
const googleTTS = require('google-tts-api');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE SETUP ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

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

        console.log("-> Starting offline Tesseract.js OCR scan...");
        
        // Convert base64 back to buffer for Tesseract if needed, though it accepts base64 strings directly!
        // But tesseract.js sometimes prefers a clean data URI or buffer. 
        // We'll pass the base64 string directly as it usually accepts data URIs.
        
        let imgData = imageBase64;
        if (!imageBase64.startsWith('data:image')) {
            // If the frontend didn't pass the prefix (it usually does via FileReader)
            imgData = `data:image/jpeg;base64,${imageBase64}`;
        }

        const worker = await tesseract.createWorker('eng');
        const ret = await worker.recognize(imgData);
        await worker.terminate();
        
        const text = ret.data.text;
        
        console.log("[PIPELINE SUCCESS] Text extracted from image offline.");
        res.json({ success: true, text: text });
    } catch (error) {
        console.error("Tesseract API Error:", error);
        res.status(500).json({ error: "Failed to extract text offline. Try a clearer image." });
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
        
        // Using google-tts-api (Google Translate's native Malayalam engine)
        // This generally has a much better native accent for Malayalam than ElevenLabs V2
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
