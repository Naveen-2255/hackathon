import React, { useState, useRef } from 'react';

function App() {
  const [mode, setMode] = useState('prescription');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  
  // Interactive Tab State
  const [activeTab, setActiveTab] = useState('health_story');
  const [isPlaying, setIsPlaying] = useState(false);

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
    setIsPlaying(true);
    for (const b64 of base64Array) {
      await new Promise((resolve) => {
        const audio = new Audio('data:audio/mp3;base64,' + b64);
        audio.onended = resolve;
        audio.play();
      });
    }
    setIsPlaying(false);
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
      setIsPlaying(false);
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
        const isAmma = (line?.speaker || '').toLowerCase().includes('amma');
        await fetchAndPlay(textToSpeak, isAmma);
      }
    }
  };

  const styles = {
    toggleBtn: (active) => ({
      flex: 1,
      padding: '12px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '16px',
      backgroundColor: active ? '#2d6a4f' : '#e0e0e0',
      color: active ? 'white' : '#555',
      transition: 'all 0.3s'
    }),
    tabButton: (id) => ({
      border: 'none',
      padding: '20px',
      borderRadius: '16px',
      textAlign: 'left',
      background: 'transparent'
    })
  };

  const tabs = [
    { id: 'simple_guide', icon: '📖', title: 'Simple Guide', desc: 'Get plain language explanations.' },
    { id: 'health_story', icon: '🎭', title: 'Health Story', desc: 'Translate diagnoses into Kissa dramas.' },
    { id: 'voice', icon: '🗣️', title: 'Voice Player', desc: 'Listen to native audio guidance.' },
    { id: 'translation', icon: '🌍', title: 'Translation', desc: 'View raw Malayalam translations.' }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Premium Navbar */}
      <nav className="glass-panel" style={{ padding: '15px 40px', display: 'flex', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#1b4332', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.5px' }}>
            <span style={{ fontSize: '28px' }}>🌿</span> HealthStory AI
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 20px', textAlign: 'center', width: '100%' }}>
        
        {/* Hero Section */}
        <h1 className="fade-in-up" style={{ fontSize: '56px', color: '#1b4332', marginBottom: '20px', fontWeight: '900', lineHeight: '1.1', letterSpacing: '-1px' }}>
          Health Guidance,<br/>Simplified with AI
        </h1>
        <p className="fade-in-up" style={{ fontSize: '20px', color: '#4a5568', marginBottom: '50px', maxWidth: '700px', margin: '0 auto 50px auto', lineHeight: '1.6', animationDelay: '0.1s' }}>
          Upload prescriptions, medical notices or health guidance and transform them into easy explanations, health stories, voice narration and local languages.
        </p>

        {/* Interactive Feature Tabs */}
        <div className="fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '60px', animationDelay: '0.2s' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`glass-card interactive-tab ${activeTab === tab.id ? 'active' : ''}`}
              style={styles.tabButton(tab.id)}
            >
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{tab.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1b4332', marginBottom: '8px' }}>{tab.title}</h3>
              <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.5' }}>{tab.desc}</p>
            </button>
          ))}
        </div>

        {/* Input Section Workspace */}
        <div className="glass-panel fade-in-up" style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto', padding: '40px', borderRadius: '24px', animationDelay: '0.3s' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px', color: '#1b4332' }}>
            Offline Triage Workspace
          </h2>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '24px' }}>
            <button style={styles.toggleBtn(mode === 'prescription')} onClick={() => setMode('prescription')}>
              📋 Prescription Mode
            </button>
            <button style={styles.toggleBtn(mode === 'notice')} onClick={() => setMode('notice')}>
              📢 Public Notice Mode
            </button>
          </div>

          {mode === 'prescription' && (
            <div style={{ marginBottom: '24px' }}>
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
              <button 
                onClick={() => fileInputRef.current.click()}
                disabled={scanning}
                style={{
                  width: '100%', padding: '20px', backgroundColor: 'rgba(255,255,255,0.8)', border: '2px dashed #9ca3af',
                  borderRadius: '16px', fontSize: '18px', fontWeight: '700', color: '#4b5563', cursor: scanning ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {scanning ? "⏳ Scanning... Please Wait" : "📷 Scan Handwritten Prescription"}
              </button>
            </div>
          )}

          <textarea 
            style={{
              width: '100%', minHeight: '150px', padding: '20px', borderRadius: '16px', border: '1px solid #d1d5db',
              fontSize: '16px', marginBottom: '24px', resize: 'vertical', fontFamily: 'monospace',
              backgroundColor: 'rgba(255,255,255,0.9)', color: '#1f2937', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}
            placeholder="Medical text will appear here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={scanning}
          />

          <button 
            style={{
              padding: '18px 24px', backgroundColor: '#1b4332', color: 'white', border: 'none', borderRadius: '16px',
              fontSize: '18px', fontWeight: '800', cursor: (loading || scanning) ? 'not-allowed' : 'pointer',
              width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px',
              boxShadow: '0 10px 25px rgba(27, 67, 50, 0.3)', transition: 'all 0.3s',
              opacity: (loading || scanning) ? 0.7 : 1
            }}
            onClick={handleGenerate}
            disabled={loading || scanning}
          >
            <span style={{ fontSize: '22px' }}>✨</span> {loading ? "Analyzing via Ollama..." : "Generate AI Output"}
          </button>
        </div>

        {/* Dynamic Results Section powered by Active Tab */}
        {result && (
          <div className="fade-in-up" style={{ 
            marginTop: '40px', maxWidth: '800px', margin: '40px auto 100px auto',
            padding: '40px', borderRadius: '24px', 
            border: result.is_emergency ? 'none' : '1px solid rgba(255,255,255,0.6)',
            backgroundColor: result.is_emergency ? '#fff5f5' : 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            boxShadow: result.is_emergency ? '0 0 0 rgba(192, 57, 43, 0.4)' : '0 20px 40px rgba(0,0,0,0.08)',
            textAlign: 'left',
            animation: result.is_emergency ? 'pulse-emergency 2s infinite' : 'none'
          }}>
            
            {/* EMERGENCY OVERRIDE - If it's an emergency, we lock the view to this critical alert */}
            {result.is_emergency ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ color: '#c0392b', fontSize: '28px', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '2px' }}>
                  🚨 CRITICAL EMERGENCY
                </div>
                <div style={{ fontSize: '20px', color: '#c0392b', fontWeight: 'bold', textAlign: 'center' }}>
                  {result.alert}
                </div>
                <div style={{ fontSize: '26px', color: '#c0392b', fontWeight: 'bold', lineHeight: '1.5', textAlign: 'center', padding: '30px', backgroundColor: '#fdf2f0', borderRadius: '16px' }}>
                  {result.emergency_instructions}
                </div>
                <button onClick={playAudio} style={{ padding: '20px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                  {isPlaying ? '🔊 Playing Audio...' : '⚠️ Play Emergency Audio'}
                </button>
                <div style={{ marginTop: '10px' }}>
                  <a href="tel:108" style={{ display: 'block', textAlign: 'center', padding: '24px', backgroundColor: '#d00000', color: 'white', textDecoration: 'none', borderRadius: '50px', fontSize: '24px', fontWeight: '900', boxShadow: '0 10px 30px rgba(208, 0, 0, 0.4)' }}>
                    📞 CALL AMBULANCE (108)
                  </a>
                </div>
              </div>
            ) : (
              /* TAB VIEWS FOR NON-EMERGENCY */
              <>
                {/* 1. SIMPLE GUIDE TAB */}
                {activeTab === 'simple_guide' && (
                  <div>
                    <h3 style={{ fontSize: '24px', color: '#1b4332', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      📖 Simple Guide Summary
                    </h3>
                    <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <p style={{ fontSize: '18px', color: '#4a5568', marginBottom: '15px' }}><strong>Status:</strong> Not a critical emergency.</p>
                      <p style={{ fontSize: '18px', color: '#4a5568', marginBottom: '15px' }}><strong>Main Alert:</strong> {result.alert}</p>
                      <p style={{ fontSize: '18px', color: '#4a5568', marginBottom: '15px' }}><strong>Summary:</strong> <span style={{ color: '#1b4332', fontWeight: 'bold' }}>{result.simple_guide || 'No summary available.'}</span></p>
                      <p style={{ fontSize: '14px', color: '#9ca3af' }}><strong>Original Scan:</strong> <span style={{ fontStyle: 'italic' }}>{inputText}</span></p>
                    </div>
                  </div>
                )}

                {/* 2. HEALTH STORY TAB */}
                {activeTab === 'health_story' && (
                  <div>
                    <h3 style={{ fontSize: '24px', color: '#1b4332', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      🎭 Health Story (Kissa)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f0f2f5', padding: '24px', borderRadius: '16px' }}>
                      {Array.isArray(result.kissa_script) ? result.kissa_script.map((line, index) => {
                        const speakerName = line?.speaker || 'Speaker';
                        const isAsha = speakerName.toLowerCase().includes('asha') || speakerName.toLowerCase().includes('nurse');
                        const text = line?.text || (typeof line === 'string' ? line : JSON.stringify(line));
                        return (
                          <div key={index} style={{
                            padding: '16px 20px', backgroundColor: isAsha ? '#dcf8c6' : '#ffffff',
                            borderRadius: '16px', maxWidth: '85%', alignSelf: isAsha ? 'flex-start' : 'flex-end',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            borderTopLeftRadius: isAsha ? '0' : '16px', borderTopRightRadius: !isAsha ? '0' : '16px'
                          }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: isAsha ? '#128C7E' : '#075E54', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {speakerName}
                            </div>
                            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.5' }}>{text}</div>
                          </div>
                        );
                      }) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No Kissa script found in output.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. VOICE TAB */}
                {activeTab === 'voice' && (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                     <h3 style={{ fontSize: '24px', color: '#1b4332', fontWeight: '800', marginBottom: '40px' }}>
                      🗣️ Voice Narration
                    </h3>
                    <button 
                      onClick={playAudio}
                      disabled={isPlaying}
                      style={{
                        padding: '24px 40px', backgroundColor: '#2d6a4f', color: 'white', border: 'none', borderRadius: '50px',
                        fontSize: '20px', fontWeight: '800', cursor: isPlaying ? 'not-allowed' : 'pointer',
                        boxShadow: '0 10px 30px rgba(45, 106, 79, 0.3)', transition: 'all 0.3s',
                        display: 'inline-flex', alignItems: 'center', gap: '15px'
                      }}
                    >
                      {isPlaying ? (
                        <>
                          <div className="playing-waveform">
                            <span></span><span></span><span></span><span></span><span></span>
                          </div>
                          Playing Narration...
                        </>
                      ) : (
                        <>🔊 Play Health Story Audio</>
                      )}
                    </button>
                    <p style={{ marginTop: '30px', color: '#666', fontSize: '16px' }}>Powered by Native Google TTS Engine</p>
                  </div>
                )}

                {/* 4. TRANSLATION TAB */}
                {activeTab === 'translation' && (
                  <div>
                     <h3 style={{ fontSize: '24px', color: '#1b4332', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      🌍 Native Translation
                    </h3>
                    <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <p style={{ fontSize: '16px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Original Context</p>
                      <p style={{ fontSize: '18px', color: '#4a5568', marginBottom: '25px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>{inputText}</p>
                      
                      <p style={{ fontSize: '16px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Malayalam Output</p>
                      <div style={{ fontSize: '20px', color: '#1f2937', lineHeight: '1.6', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #2d6a4f' }}>
                         {Array.isArray(result.kissa_script) ? result.kissa_script.map((line, i) => (
                           <div key={i} style={{ marginBottom: '10px' }}>{line.text}</div>
                         )) : result.alert}
                      </div>
                    </div>
                  </div>
                )}

              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
