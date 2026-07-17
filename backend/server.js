// server.js

require('dotenv').config({ path: '../.env' }); // Ensure dotenv is loaded
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const googleTTS = require('google-tts-api');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini for Vision
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

        const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = "Extract the text from this medical prescription.";

        const imagePart = {
            inlineData: {
                data: imageBase64.split(',')[1] || imageBase64,
                mimeType: "image/jpeg"
            }
        };

        console.log("-> Sending request to Gemini Vision API...");
        const result = await visionModel.generateContent([prompt, imagePart]);
        const text = result.response.text();
        
        console.log("[PIPELINE SUCCESS] Text extracted from image.");
        res.json({ success: true, text: text });
    } catch (error) {
        console.error("Vision API Error:", error);
        res.status(500).json({ error: "Failed to extract text. Check API key and logs." });
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
        
        const prompt = `You are an AI Medical Assistant for rural Kerala. Analyze the following medical text: ${reportText}

Assess if this is a CRITICAL EMERGENCY (e.g., severe bleeding, chest pain, difficulty breathing, stroke symptoms).
If it is an emergency, output ONLY valid JSON matching this exact structure:
{
  "is_emergency": true,
  "alert": "🚨 EMERGENCY",
  "emergency_instructions": "Direct Malayalam commands for life saving actions...",
  "emergency_contact": "CALL_AMBULANCE_108",
  "kissa_script": null
}
If it is NOT an emergency, output ONLY valid JSON matching this exact structure:
{
  "is_emergency": false,
  "alert": "Health Advice",
  "emergency_instructions": null,
  "emergency_contact": null,
  "kissa_script": [{"speaker": "Asha Chechi", "text": "..."}]
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
        
        if (!process.env.ELEVENLABS_API_KEY) {
             return res.status(500).json({ error: "ELEVENLABS_API_KEY is not set in the environment." });
        }

        // Voice ID logic: 'slow' means it's Amma, else Asha Chechi
        // Amma voice (older, softer): "pFZP5JQG7iQjIQuC4Bku" (Lily)
        // Asha Chechi voice (professional): "EXAVITQu4vr4xnSDxMaL" (Rachel)
        const voiceId = slow ? "pFZP5JQG7iQjIQuC4Bku" : "EXAVITQu4vr4xnSDxMaL";
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2"
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("ElevenLabs API Error:", errText);
            return res.status(500).json({ error: "ElevenLabs API failed." });
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        res.json({ success: true, audioBase64Array: [base64] });
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
