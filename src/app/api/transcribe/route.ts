import { experimental_transcribe as transcribe } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    const result = await transcribe({
      model: openai.transcription('whisper-1'),
      audio: audioBuffer,
    });

    return Response.json({
      text: result.text,
      segments: result.segments,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return Response.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
