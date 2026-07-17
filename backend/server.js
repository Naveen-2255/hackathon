// server.js

// 1. Load Environment Variables (securely accesses .env)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000; // Use port 5000, or whatever is set in the environment

// --- MIDDLEWARE SETUP (Crucial for talking to React) ---
// cors allows our frontend (React on a different port) to talk to this backend.
app.use(cors());
// Built-in middleware to parse JSON bodies from requests (like those from React)
app.use(express.json({ limit: '50mb' })); 

// --- AI CLIENT SETUP ---
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY not found in .env file.");
    process.exit(1); // Stop the program if the key isn't set
}

const genAI = new GoogleGenerativeAI(API_KEY);

// --------------------------------------------
// === ROUTE 1: IMAGE SCANNER (VISION API) ===
// ============================================
app.post('/api/scan-prescription', async (req, res) => {
    console.log("\n[PIPELINE START] Received request for image scanning...");
    try {
        // Expecting a Base64 string from the frontend body
        const { imageBase64 } = req.body; 

        if (!imageBase64) {
            return res.status(400).json({ error: "No image provided." });
        }

        // Use gemini-1.5-flash because it has native Vision capabilities
        const visionModel = genAI.getGenerativeModel({ model: "gemma-4-vision-model" });

        // **THE PROMPT IS THE MAGIC:** This tells the AI exactly what its role is.
        const prompt = `You are an expert pharmacist in India specializing in handwritten medical prescriptions. Carefully read this image. Extract all necessary information, including drug names (medicines), dosages, frequencies/timing, and any explicit instructions for the patient. Output ONLY the extracted text in plain English. Do not add any conversational filler like 'Here is the text' or introductory phrases.`;

        // Preparing the parts: [TEXT_PROMPT, IMAGE_DATA]
        const imageParts = [
            {
                inlineData: {
                    data: imageBase64.split(',')[1], // Removes "data:image/jpeg;base64," prefix
                    mimeType: "image/jpeg" 
                }
            }
        ];

        console.log("-> Sending request to Gemini Vision API...");
        // Call the model with both prompt and image data
        const result = await visionModel.generateContent([prompt, ...imageParts]);
        const extractedText = result.response.text();

        console.log("[PIPELINE SUCCESS] Image scanned successfully.");
        // Send only the clean text back to the frontend
        res.json({ success: true, text: extractedText });

    } catch (error) {
        console.error("Vision API Error:", error);
        // Handle both AI errors and network/parsing errors gracefully
        res.status(500).json({ error: "Failed to read the prescription due to an internal server or API issue." });
    }
});

// ============================================
// === ROUTE 2: TRIAGE AND SCRIPT GENERATOR (GEMMA) ===
// ============================================
app.post('/api/generate-kissa', async (req, res) => {
    console.log("\n[PIPELINE START] Received request for Kissa Generation...");
    try {
        const { reportText, mode } = req.body; 

        if (!reportText) {
            return res.status(400).json({ error: "No medical report text provided." });
        }

        console.log(`-> Processing Text Report: "${reportText}"`);
        
        // Gemma is excellent at structured JSON output. We give it a strong schema and prompt.
        const prompt = `You are an AI Public Health and Triage system for rural Kerala. 
        Take this medical text: "${reportText}".
        
        1. FIRST, assess if this text describes a critical, life-threatening emergency (e.g., severe chest pain, heavy bleeding, unconsciousness, severe respiratory distress, or highly critical alerts). Set "is_emergency" to true or false.
        
        2. IF "is_emergency" is true:
           - Set "kissa_script" to null.
           - Create "emergency_instructions" in Malayalam script (മലയാളം). These must be direct, authoritative, rapid, step-by-step life-saving commands (e.g., "ഉടൻ കിടക്കുക. ഈ ഗുളിക ഇപ്പോൾ കഴിക്കുക. ഉടൻ ആശുപത്രിയിൽ പോകുക").
           
        3. IF "is_emergency" is false:
           - Set "emergency_instructions" to null.
           - Create "kissa_script" as a 4-line Malayalam radio drama (Kissa) between 'Asha Chechi' (ASHA worker) and the 'Patient/Listener' in native Malayalam script.
        
        Output ONLY a valid JSON object, and DO NOT output any markdown or conversational text outside of the required JSON structure. The keys MUST be: "is_emergency", "alert", "emergency_instructions", and "kissa_script". Use null for fields that are not applicable based on the triage rule.`;
        

        // We use gemini-1.5-flash again because it's excellent at reliable JSON extraction 
        // (although you could swap this to a different model if needed later).
        const visionModel = genAI.getGenerativeModel({ model: "gemma-4-text-model" });

        console.log("-> Sending request to Gemini Triage API...");
        const result = await visionModel.generateContent([prompt]);
        let jsonText = result.response.text();

        try {
            // The model is instructed to output JSON, so we must parse it.
            const dataObject = JSON.parse(jsonText);
            console.log("[PIPELINE SUCCESS] Triage and Scripting completed successfully.");
            res.json({ 
                success: true, 
                data: {
                    is_emergency: dataObject.is_emergency,
                    alert: dataObject.alert || "Health Alert", // Fallback alert
                    emergency_instructions: dataObject.emergency_instructions || null,
                    kissa_script: dataObject.kissa_script || []
                }
            });

        } catch (e) {
            console.error("JSON Parsing Error:", e);
            res.status(500).json({ error: "AI failed to structure the response into required JSON format." });
        }


    } catch (error) {
        console.error("Triage API Error:", error);
        res.status(500).json({ error: "Failed during the triage process. Check API key and logs." });
    }
});

// --------------------------------------------
// === START SERVER LISTENER ===
// ============================================
app.listen(PORT, () => {
    console.log(`\n============================================`);
    console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
    console.log(`   Ready to receive prescription scans.`);
    console.log(`============================================\n`);
});
