import { experimental_generateSpeech as generateSpeech } from 'ai';
import { elevenlabs } from '@ai-sdk/elevenlabs';

export async function POST(request: Request) {
  try {
    const { text, voice = 'onwK4e9ZLuTAKqWW03F9' } = await request.json(); // Daniel - Steady Broadcaster

    const result = await generateSpeech({
      model: elevenlabs.speech('eleven_turbo_v2_5'),
      text,
      voice,
    });

    // Convert the audio to base64
    const audioData = result.audio;
    const base64Audio = Buffer.from(audioData.uint8Array).toString('base64');

    return Response.json({
      audio: base64Audio,
      contentType: 'audio/mp3',
    });
  } catch (error) {
    console.error('Speech generation error:', error);
    return Response.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}
