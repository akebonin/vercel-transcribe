// api/transcribe.js
export default async function handler(req, res) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { audioUrl, audioData } = req.body;
    const whisperApiKey = process.env.WHISPER_API_KEY;

    if (!whisperApiKey) {
      throw new Error('Whisper API key not configured in Vercel environment variables');
    }

    console.log('Received transcription request');

    if (!audioUrl && !audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const formData = new FormData();
    
    if (audioUrl) {
      console.log('Downloading audio from URL:', audioUrl);
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status}`);
      }
      const audioBlob = await response.blob();
      formData.append('file', audioBlob, 'audio.mp3');
    } else {
      console.log('Processing base64 audio data');
      const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, '')
                                 .replace(/^data:application\/octet-stream;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'audio/mp3' });
      formData.append('file', blob, 'audio.mp3');
    }

    console.log('Calling Whisper API with key:', whisperApiKey.substring(0, 10) + '...');
    
    // CORRECT ENDPOINT: https://api.whisper-api.com
    const whisperResponse = await fetch('https://api.whisper-api.com', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${whisperApiKey}`
      }
    });

    console.log('Whisper API response status:', whisperResponse.status);
    
    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
    }

    const result = await whisperResponse.json();
    console.log('Transcription successful, text length:', result.text?.length);
    
    return res.status(200).json({ 
      transcription: result.text,
      success: true 
    });
    
  } catch (error) {
    console.error('Transcription proxy error:', error);
    return res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
    }
