// api/transcribe.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { audioUrl, audioData } = req.body;

    if (!audioUrl && !audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const formData = new FormData();
    
    if (audioUrl) {
      // For video URLs - download from the provided URL
      console.log('Downloading audio from URL:', audioUrl);
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status}`);
      }
      const audioBlob = await response.blob();
      formData.append('file', audioBlob, 'audio.mp3');
    } else {
      // For base64 audio data
      console.log('Processing base64 audio data');
      const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'audio/mp3' });
      formData.append('file', blob, 'audio.mp3');
    }

    console.log('Calling whisper-api.com...');
    
    // Call free whisper-api.com
    const whisperResponse = await fetch('https://whisper-api.com/api/v1/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
    }

    const result = await whisperResponse.json();
    console.log('Transcription successful');
    
    res.status(200).json({ 
      transcription: result.text,
      success: true 
    });
    
  } catch (error) {
    console.error('Transcription proxy error:', error);
    res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
  }
