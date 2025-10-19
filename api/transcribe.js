// api/transcribe.js
export default async function handler(req, res) {
  // Handle CORS preflight requests
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

  // Set CORS headers for actual request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { audioUrl, audioData } = req.body;

    console.log('Received transcription request:', { 
      hasAudioUrl: !!audioUrl, 
      hasAudioData: !!audioData,
      audioDataLength: audioData ? audioData.length : 0
    });

    if (!audioUrl && !audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const formData = new FormData();
    
    if (audioUrl) {
      // For video URLs
      console.log('Downloading audio from URL:', audioUrl);
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
      }
      const audioBlob = await response.blob();
      formData.append('file', audioBlob, 'audio.mp3');
    } else {
      // For base64 audio data
      console.log('Processing base64 audio data');
      // Remove data URL prefix if present
      const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, '')
                                 .replace(/^data:application\/octet-stream;base64,/, '');
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Create blob from buffer
      const blob = new Blob([buffer], { type: 'audio/mp3' });
      formData.append('file', blob, 'audio.mp3');
    }

    console.log('Calling whisper-api.com...');
    
    // Call free whisper-api.com
    const whisperResponse = await fetch('https://whisper-api.com/api/v1/transcribe', {
      method: 'POST',
      body: formData,
    });

    console.log('Whisper API response status:', whisperResponse.status);
    
    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
    }

    const result = await whisperResponse.json();
    console.log('Transcription successful, length:', result.text?.length);
    
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
