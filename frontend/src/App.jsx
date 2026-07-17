import React, { useState } from 'react';

function App() {
  const [mode, setMode] = useState('prescription');
  const [inputText, setInputText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Helper to convert file to base64
  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setScanning(true);
    setInputText("Scanning messy handwriting... please wait...");
    setResult(null);

    try {
      const base64 = await toBase64(file);
      const response = await fetch('http://localhost:5000/api/scan-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await response.json();
      if (data.success) {
        setInputText(data.text);
      } else {
        setInputText("Error scanning prescription: " + data.error);
      }
    } catch (err) {
      console.error(err);
      setInputText("Failed to connect to backend for scanning.");
    } finally {
      setScanning(false);
    }
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
      alert("Failed to connect to backend for generation.");
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (!result) return;
    
    // Stop any currently playing audio
    window.speechSynthesis.cancel();

    if (result.is_emergency && result.emergency_instructions) {
      const utterance = new SpeechSynthesisUtterance(result.emergency_instructions);
      utterance.lang = 'ml-IN';
      utterance.pitch = 0.9;
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    } else if (!result.is_emergency && result.kissa_script && result.kissa_script.length > 0) {
      let currentIndex = 0;

      const playNextLine = () => {
        if (currentIndex >= result.kissa_script.length) return;
        
        const line = result.kissa_script[currentIndex];
        const utterance = new SpeechSynthesisUtterance(line.text);
        utterance.lang = 'ml-IN';
        
        // Voice acting
        if (line.speaker.toLowerCase().includes("asha")) {
          utterance.pitch = 1.2;
          utterance.rate = 0.9;
        } else {
          utterance.pitch = 0.6;
          utterance.rate = 0.8;
        }

        utterance.onend = () => {
          currentIndex++;
          playNextLine();
        };

        window.speechSynthesis.speak(utterance);
      };

      // Start sequential playback
      playNextLine();
    }
  };

  // --- STYLES ---
  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, sans-serif'
    },
    header: {
      textAlign: 'center',
      color: '#1b4332',
      marginBottom: '30px'
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 6px rgba(45, 106, 79, 0.1)',
      border: '1px solid #74c69d',
      marginBottom: '20px'
    },
    modeToggle: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px'
    },
    toggleButton: (isActive) => ({
      flex: 1,
      padding: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      border: `2px solid ${isActive ? '#1b4332' : '#74c69d'}`,
      borderRadius: '8px',
      backgroundColor: isActive ? '#1b4332' : '#ffffff',
      color: isActive ? '#ffffff' : '#1b4332',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }),
    uploadLabel: {
      display: 'block',
      width: '100%',
      padding: '15px',
      backgroundColor: '#2d6a4f',
      color: '#ffffff',
      textAlign: 'center',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 'bold',
      marginBottom: '20px'
    },
    textarea: {
      width: '100%',
      minHeight: '150px',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #74c69d',
      fontSize: '16px',
      marginBottom: '20px',
      resize: 'vertical'
    },
    generateBtn: {
      width: '100%',
      padding: '15px',
      backgroundColor: '#40916c',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '18px',
      fontWeight: 'bold',
      cursor: 'pointer'
    },
    resultsCard: (isEmergency) => ({
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      border: `2px solid ${isEmergency ? '#c0392b' : '#d8f3dc'}`,
      marginTop: '20px'
    }),
    alertBlock: (isEmergency) => ({
      backgroundColor: isEmergency ? '#fadbd8' : '#e8f5e9',
      color: isEmergency ? '#c0392b' : '#1b4332',
      padding: '15px',
      borderRadius: '8px',
      fontWeight: 'bold',
      fontSize: '18px',
      marginBottom: '20px',
      textAlign: 'center'
    }),
    playBtn: (isEmergency) => ({
      width: '100%',
      padding: '15px',
      backgroundColor: isEmergency ? '#c0392b' : '#2d6a4f',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '18px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginBottom: '20px'
    }),
    emergencyBox: {
      border: '3px dashed #c0392b',
      padding: '20px',
      backgroundColor: '#fdf2f0',
      color: '#c0392b',
      borderRadius: '8px',
      textAlign: 'center'
    },
    emergencyText: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginTop: '10px'
    },
    chatBubble: (isAsha) => ({
      backgroundColor: isAsha ? '#e8f5e9' : '#f5f5f5',
      color: '#1b4332',
      padding: '15px',
      borderRadius: '16px',
      maxWidth: '80%',
      margin: '10px 0',
      alignSelf: isAsha ? 'flex-start' : 'flex-end',
      borderBottomLeftRadius: isAsha ? '4px' : '16px',
      borderBottomRightRadius: !isAsha ? '4px' : '16px'
    }),
    chatContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    speakerName: {
      fontSize: '12px',
      textTransform: 'uppercase',
      color: '#666',
      marginBottom: '5px',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Asha-Dhwani (ആശ ധ്വനി)</h1>
      
      <div style={styles.card}>
        <div style={styles.modeToggle}>
          <button 
            style={styles.toggleButton(mode === 'prescription')}
            onClick={() => setMode('prescription')}
          >
            📋 Prescription Mode
          </button>
          <button 
            style={styles.toggleButton(mode === 'notice')}
            onClick={() => setMode('notice')}
          >
            📢 Public Notice Mode
          </button>
        </div>

        {mode === 'prescription' && (
          <div>
            <label style={styles.uploadLabel}>
              📷 Upload Prescription Photo
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>
        )}

        <textarea 
          style={styles.textarea}
          placeholder="Paste or enter clinical notes here..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={scanning}
        />

        <button 
          style={styles.generateBtn}
          onClick={handleGenerate}
          disabled={loading || scanning}
        >
          {loading ? "Generating..." : "✨ Generate Kissa (നാടകം)"}
        </button>
      </div>

      {result && (
        <div style={styles.resultsCard(result.is_emergency)}>
          <div style={styles.alertBlock(result.is_emergency)}>
            {result.is_emergency ? `🚨 CRITICAL EMERGENCY: ${result.alert}` : `🚨 HEALTH ALERT: ${result.alert}`}
          </div>
          
          <button style={styles.playBtn(result.is_emergency)} onClick={playAudio}>
            {result.is_emergency ? "⚠️ Play Emergency Instructions" : "🔊 Play Drama"}
          </button>

          {result.is_emergency ? (
            <div style={styles.emergencyBox}>
              <div style={{ fontWeight: 'bold' }}>🔴 DIRECT DIRECTIVES (നേരിട്ടുള്ള നിർദ്ദേശം)</div>
              <div style={styles.emergencyText}>{result.emergency_instructions}</div>
            </div>
          ) : (
            <div style={styles.chatContainer}>
              {result.kissa_script && result.kissa_script.map((line, index) => {
                const isAsha = line.speaker.toLowerCase().includes('asha');
                return (
                  <div key={index} style={styles.chatBubble(isAsha)}>
                    <div style={styles.speakerName}>{line.speaker}</div>
                    <div style={{ fontSize: '18px' }}>{line.text}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
