import React, { useState, useRef } from 'react';

function App() {
  const [mode, setMode] = useState('prescription');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);

  // Real Scanner Logic
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setScanning(true);
    setInputText("Uploading and scanning image... please wait...");
    setResult(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/scan-prescription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: reader.result })
        });
        const data = await response.json();
        if (data.success) {
          setInputText(data.text);
        } else {
          setInputText("");
          alert("Scan Error: " + data.error);
        }
      } catch (err) {
        console.error(err);
        setInputText("");
        alert("Scan Error: Failed to connect to backend for scanning.");
      } finally {
        setScanning(false);
      }
    };
    reader.onerror = error => {
      console.error('Error: ', error);
      setScanning(false);
      alert("Error reading file.");
    };
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/generate-kissa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportText: inputText, mode })
      });
      const data = await response.json();
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        alert("Generation Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Generation Error: Failed to connect to local Ollama API. Check if the backend and Ollama are running.");
    } finally {
      setLoading(false);
    }
  };

  const playAudioArray = async (base64Array) => {
    for (const b64 of base64Array) {
      await new Promise((resolve) => {
        const audio = new Audio('data:audio/mp3;base64,' + b64);
        audio.onended = resolve;
        audio.play();
      });
    }
  };

  const fetchAndPlay = async (text, slow) => {
    try {
      const response = await fetch('http://localhost:5000/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, slow })
      });
      const data = await response.json();
      if (data.success) {
        await playAudioArray(data.audioBase64Array);
      }
    } catch (error) {
      console.error("TTS Error:", error);
    }
  };

  const playAudio = async () => {
    if (!result) return;

    if (result.is_emergency && result.emergency_instructions) {
      await fetchAndPlay(result.emergency_instructions, false);
    } else if (!result.is_emergency && Array.isArray(result.kissa_script) && result.kissa_script.length > 0) {
      for (let i = 0; i < result.kissa_script.length; i++) {
        const line = result.kissa_script[i];
        const textToSpeak = line?.text || (typeof line === 'string' ? line : 'Audio unreadable');
        const speakerName = line?.speaker || '';
        // Differentiate voices by making the non-Asha speaker talk slightly slower
        const isAsha = speakerName.toLowerCase().includes("asha");
        await fetchAndPlay(textToSpeak, !isAsha);
      }
    }
  };

  // --- COMPONENT STYLES ---
  const styles = {
    toggleBtn: (isActive) => ({
      flex: 1,
      padding: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      border: `2px solid ${isActive ? '#1b4332' : '#e0e0e0'}`,
      borderRadius: '8px',
      backgroundColor: isActive ? '#1b4332' : '#ffffff',
      color: isActive ? '#ffffff' : '#333',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'center'
    }),
    card: {
      padding: '24px',
      borderRadius: '12px',
      backgroundColor: '#f4fbf7',
      border: '1px solid #c8e6d9',
      textAlign: 'left'
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#ffffff', minHeight: '100vh', color: '#333' }}>
      
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', borderBottom: '1px solid #eaeaea' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1b4332', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌿</span> HealthStory AI
          </div>
          <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', fontSize: '16px' }}>Home</a>
          <a href="#" style={{ color: '#0000EE', textDecoration: 'underline', fontSize: '16px' }}>About</a>
        </div>
      </nav>

      {/* Main Content Container */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        
        {/* Hero Section */}
        <h1 style={{ fontSize: '48px', color: '#1b4332', marginBottom: '20px', fontWeight: '800', lineHeight: '1.2' }}>
          Health Guidance,<br/>Simplified with AI
        </h1>
        <p style={{ fontSize: '18px', color: '#555', marginBottom: '40px', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
          Upload prescriptions, medical notices or health guidance and transform them into easy explanations, health stories, voice narration and local languages.
        </p>

        {/* 4 Feature Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '60px' }}>
          <div style={styles.card}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>📖</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1b4332', marginBottom: '8px' }}>Simple Guide</h3>
            <p style={{ fontSize: '14px', color: '#555' }}>Get plain language explanations of complex medical terms.</p>
          </div>
          <div style={styles.card}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎭</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1b4332', marginBottom: '8px' }}>Health Story</h3>
            <p style={{ fontSize: '14px', color: '#555' }}>Translate diagnoses into culturally relevant radio dramas (Kissa).</p>
          </div>
          <div style={styles.card}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🗣️</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1b4332', marginBottom: '8px' }}>Voice</h3>
            <p style={{ fontSize: '14px', color: '#555' }}>Listen to your health guidance narrated by local voices.</p>
          </div>
          <div style={styles.card}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🌍</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1b4332', marginBottom: '8px' }}>Translation</h3>
            <p style={{ fontSize: '14px', color: '#555' }}>Automatically translate guidelines into native local scripts.</p>
          </div>
        </div>

        {/* Input Section Workspace */}
        <div style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto', padding: '30px', border: '1px solid #eaeaea', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#1b4332' }}>
            Offline Triage Workspace
          </h2>

          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button 
              style={styles.toggleBtn(mode === 'prescription')}
              onClick={() => setMode('prescription')}
            >
              📋 Prescription Mode
            </button>
            <button 
              style={styles.toggleBtn(mode === 'notice')}
              onClick={() => setMode('notice')}
            >
              📢 Public Notice Mode
            </button>
          </div>

          {/* Real Scanner Button */}
          {mode === 'prescription' && (
            <div style={{ marginBottom: '20px' }}>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
              />
              <button 
                onClick={() => fileInputRef.current.click()}
                disabled={scanning}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  border: '2px dashed #999',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#333',
                  cursor: scanning ? 'not-allowed' : 'pointer'
                }}
              >
                {scanning ? "⏳ Scanning... Please Wait" : "📷 Scan Handwritten Prescription"}
              </button>
            </div>
          )}

          {mode === 'notice' && (
            <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
              * Enter public health guidance below to generate a local radio drama.
            </div>
          )}

          <textarea 
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              fontSize: '16px',
              marginBottom: '20px',
              resize: 'vertical',
              fontFamily: 'monospace',
              backgroundColor: '#fefefe',
              color: '#333'
            }}
            placeholder="Medical text will appear here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={scanning}
          />

          <button 
            style={{
              padding: '16px 24px',
              backgroundColor: '#3b8256',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: (loading || scanning) ? 'not-allowed' : 'pointer',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              opacity: (loading || scanning) ? 0.7 : 1
            }}
            onClick={handleGenerate}
            disabled={loading || scanning}
          >
            <span>✨</span> {loading ? "Generating via Ollama (Offline)..." : "Generate with Gemma 4 E2B"}
          </button>
        </div>

        {/* Dynamic Results Section */}
        {result && (
          <div style={{ 
            marginTop: '40px',
            maxWidth: '800px', 
            margin: '40px auto 0 auto',
            padding: '30px', 
            borderRadius: '16px', 
            border: `3px ${result.is_emergency ? 'dashed #c0392b' : 'solid #2d6a4f'}`,
            backgroundColor: result.is_emergency ? '#fff5f5' : '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textAlign: 'left',
            animation: result.is_emergency ? 'pulse 2s infinite' : 'none'
          }}>
            <style>
              {`
                @keyframes pulse {
                  0% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.4); }
                  70% { box-shadow: 0 0 0 15px rgba(192, 57, 43, 0); }
                  100% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0); }
                }
              `}
            </style>

            <div style={{ 
              color: result.is_emergency ? '#c0392b' : '#2d6a4f', 
              fontSize: '24px', 
              fontWeight: '900', 
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {result.is_emergency ? `🚨 CRITICAL EMERGENCY: ${result.alert}` : `✅ HEALTH ALERT: ${result.alert}`}
            </div>

            <button 
              onClick={playAudio}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: result.is_emergency ? '#c0392b' : '#2d6a4f',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '30px',
                fontWeight: 'bold',
                fontSize: '18px'
              }}
            >
              {result.is_emergency ? '⚠️ Play Emergency Audio' : '🔊 Play Audio Drama'}
            </button>

            {result.is_emergency ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ 
                  fontSize: '28px', 
                  color: '#c0392b', 
                  fontWeight: 'bold', 
                  lineHeight: '1.4',
                  textAlign: 'center',
                  padding: '20px',
                  backgroundColor: '#fdf2f0',
                  borderRadius: '8px'
                }}>
                  {result.emergency_instructions}
                </div>
                
                <div style={{ marginTop: '20px' }}>
                  <a href="tel:108" style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '20px',
                    backgroundColor: '#d00000',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '50px',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(208, 0, 0, 0.3)'
                  }}>
                    📞 CALL AMBULANCE (108)
                  </a>
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f0f2f5', padding: '20px', borderRadius: '12px' }}>
                {Array.isArray(result.kissa_script) ? result.kissa_script.map((line, index) => {
                  const speakerName = line?.speaker || 'Speaker';
                  const isAsha = speakerName.toLowerCase().includes('asha') || speakerName.toLowerCase().includes('nurse');
                  const text = line?.text || (typeof line === 'string' ? line : JSON.stringify(line));
                  return (
                    <div key={index} style={{
                      padding: '12px 16px',
                      backgroundColor: isAsha ? '#dcf8c6' : '#ffffff',
                      borderRadius: '12px',
                      maxWidth: '80%',
                      alignSelf: isAsha ? 'flex-start' : 'flex-end',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      borderTopLeftRadius: isAsha ? '0' : '12px',
                      borderTopRightRadius: !isAsha ? '0' : '12px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: isAsha ? '#128C7E' : '#075E54', marginBottom: '4px', textTransform: 'uppercase' }}>
                        {speakerName}
                      </div>
                      <div style={{ fontSize: '16px', color: '#303030', lineHeight: '1.4' }}>
                        {text}
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '12px', fontSize: '16px', color: '#333' }}>
                    {typeof result.kissa_script === 'string' ? result.kissa_script : JSON.stringify(result.kissa_script)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
