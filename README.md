# 🌿 HealthStory AI

## Problem Statement
**02 Medical Guidance Accessibility for Low-Literacy and Rural Populations**
Frontline healthcare workers and patients in rural and low-literacy communities routinely receive medical guidance, including dosage instructions, treatment protocols, and referral advisories, that is written for educated urban audiences. This creates a last-mile communication gap, where critical health information fails to reach or be understood by the people who need it most.

## Project Description
**HealthStory AI** bridges this exact last-mile communication gap by transforming complex medical guidance into culturally resonant native storytelling and proactive emergency alerts.

**How it works:**
1. A user (or frontline worker) either manually enters the advice given by the doctor, or simply uploads a photo of the medical prescription/notice.
2. Google's Gemma 4 analyzes the medical text to determine if it is a standard prescription or a critical emergency.
3. **If it's a standard prescription:** Gemma converts the medical jargon into a "Kissa"—a short, conversational radio drama story between a local nurse (Asha Chechi) and a patient (Amma). This explains the medication and dosage in plain, relatable rural Malayalam, which is then played back as ultra-realistic audio.
4. **If it's an emergency situation:** The system immediately releases a critical emergency notification and proactively prompts to inform concerned facilities, like calling a local ambulance (108).

## Google AI Usage
### Tools / Models Used
- **Google Gemini 1.5 Flash Vision API** (Cloud)
- **Google Gemma 4 (`gemma4:e2b`)** via Ollama (Local Edge)
- **Google Cloud TTS API** (Cloud)

### Tech Stack used
- **Frontend:** React, Vite, Glassmorphism UI
- **Backend:** Node.js, Express.js
- **AI Infrastructure:** Ollama (Local AI Runtime), Google Generative AI SDK

### How Google AI Was Used
Our architecture strategically splits Google AI into cloud and edge deployments to balance accuracy and privacy:
1. **Gemini Vision API (Cloud OCR):** We use Google's Gemini Vision API specifically for the OCR step because local scanners fail to read messy Indian doctor handwriting. In healthcare, a misread dosage is fatal, so we rely on state-of-the-art Gemini Vision to decipher the images accurately.
2. **Gemma 4 (Local Medical Brain):** We run Google's **Gemma 4** model locally via Ollama. The extracted text is sent to this local edge model to ensure patient data never leaves the clinic. Gemma 4 handles the complex medical reasoning, emergency detection, and generates the culturally accurate Malayalam Kissa script.
3. **Google TTS API (Cloud Accessibility):** Because local Windows operating systems lack native Indic text-to-speech support, we ping the Google TTS API at the very end to generate the ultra-realistic Malayalam audio narration.

## GitHub repo link of the project
[Insert your GitHub repository link here]

## Proof of Google AI Usage
in proofs image.png

## Screenshots
Please see the `/screenshots` folder for UI demonstrations of the Emergency Mode, Kissa Story Generation, and Audio Player.

## Demo Video
in proofs folder

## Installation Steps
Follow these steps to run the project locally on your machine.

### Prerequisites
- Node.js installed
- [Ollama](https://ollama.com/) installed and running

### 1. Start the Local AI Engine (Gemma 4)
Open a terminal and run:
```bash
ollama run gemma4:e2b
```
*(Leave this running in the background)*

### 2. Setup the Backend
Open a new terminal and navigate to the backend folder:
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder and add your Gemini API Key:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=5000
```
Start the backend server:
```bash
node server.js
```

### 3. Setup the Frontend
Open a third terminal and navigate to the frontend folder:
```bash
cd frontend
npm install
npm run dev
```
Open the provided `localhost` link in your browser to view the app!
