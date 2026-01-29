/**
 * File Analysis Service
 * Provides type-specific analysis prompts and functions for different file categories
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { FileCategory } from './fileTypes';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Get the appropriate analysis prompt based on file category
 */
export function getAnalysisPrompt(category: FileCategory): string {
    switch (category) {
        case 'video':
            return `Analyze this video and provide:
1. A comprehensive summary of the content
2. Temporal breakdown of scenes with timestamps
3. Key visual elements and events
4. Audio/speech transcription highlights

Format as JSON:
{
  "summary": "...",
  "scenes": [
    {"start": "0:05", "end": "0:12", "label": "...", "description": "..."}
  ],
  "keyPoints": ["..."],
  "transcription": "..."
}`;

        case 'image':
            return `Analyze this image and provide:
1. A detailed description of what is visible
2. List of objects, people, and elements detected
3. Any text visible in the image (OCR)
4. Context and setting
5. Colors, composition, and visual style

Format as JSON:
{
  "summary": "...",
  "objects": ["..."],
  "ocrText": "...",
  "setting": "...",
  "style": "...",
  "colors": ["..."],
  "keyPoints": ["..."]
}`;

        case 'audio':
            return `Analyze this audio file and provide:
1. Full transcription of speech/content
2. Speaker identification (if multiple speakers)
3. Key topics and themes discussed
4. Timestamps for important moments
5. Audio quality and characteristics
6. Background sounds or music

Format as JSON:
{
  "summary": "...",
  "transcription": "...",
  "speakers": [{"name": "Speaker 1", "segments": [{"start": "0:00", "end": "1:30"}]}],
  "keyMoments": [{"timestamp": "0:45", "description": "..."}],
  "topics": ["..."],
  "audioCharacteristics": "...",
  "keyPoints": ["..."]
}`;

        case 'pdf':
            return `Analyze this PDF document and provide:
1. Document type and purpose
2. Executive summary of main content
3. Key sections and their topics
4. Important data, facts, or findings
5. Tables or figures summary
6. Conclusions or recommendations

Format as JSON:
{
  "documentType": "...",
  "summary": "...",
  "sections": [{"title": "...", "content": "..."}],
  "keyPoints": ["..."],
  "dataHighlights": ["..."],
  "conclusions": "..."
}`;

        case 'document':
            return `Analyze this document and provide:
1. Document type and purpose
2. Summary of content
3. Key topics and themes
4. Important information extracted
5. Document structure

Format as JSON:
{
  "documentType": "...",
  "summary": "...",
  "topics": ["..."],
  "keyPoints": ["..."],
  "structure": "...",
  "importantInfo": ["..."]
}`;

        case 'spreadsheet':
            return `Analyze this spreadsheet and provide:
1. Purpose and context of the data
2. Summary of data structure (columns, rows)
3. Key statistics and metrics
4. Trends or patterns identified
5. Notable data points or outliers
6. Charts or visualizations described

Format as JSON:
{
  "purpose": "...",
  "structure": "...",
  "summary": "...",
  "keyMetrics": [{"name": "...", "value": "..."}],
  "trends": ["..."],
  "notablePoints": ["..."],
  "keyPoints": ["..."]
}`;

        case 'text':
            return `Analyze this text file and provide:
1. Content type and purpose
2. Summary of the text
3. Key themes and topics
4. Important information or data
5. Writing style and tone

Format as JSON:
{
  "contentType": "...",
  "summary": "...",
  "themes": ["..."],
  "keyPoints": ["..."],
  "style": "...",
  "importantInfo": ["..."]
}`;

        default:
            return `Analyze this file and provide:
1. Content description
2. Key information extracted
3. Summary

Format as JSON:
{
  "summary": "...",
  "keyPoints": ["..."],
  "description": "..."
}`;
    }
}

/**
 * Get chat context prompt based on file category
 */
export function getChatContextPrompt(category: FileCategory): string {
    switch (category) {
        case 'video':
            return `You are a helpful video analysis assistant. The user has uploaded a video and will ask questions about it.

IMPORTANT INSTRUCTIONS:
1. Answer questions based ONLY on what you can see and hear in the video
2. When mentioning specific moments, events, or scenes, ALWAYS include timestamps in the format [MM:SS] or [HH:MM:SS]
3. Be specific and reference visual or audio details from the video
4. If you mention multiple events or moments, provide a timestamp for each one
5. Format timestamps as clickable references like: "At [2:30], you can see..." or "The event at [1:15] shows..."

Now, please answer the user's question about the video.`;

        case 'image':
            return `You are a helpful image analysis assistant. The user has uploaded an image and will ask questions about it.

IMPORTANT INSTRUCTIONS:
1. Answer questions based ONLY on what is visible in the image
2. Be specific about visual details, objects, people, text, colors, and composition
3. Reference specific areas or elements when answering
4. If asked about text in the image, transcribe it accurately
5. Describe spatial relationships between elements

Now, please answer the user's question about the image.`;

        case 'audio':
            return `You are a helpful audio analysis assistant. The user has uploaded an audio file and will ask questions about it.

IMPORTANT INSTRUCTIONS:
1. Answer questions based on the audio content, including speech, music, and sounds
2. When referencing specific moments, include timestamps in the format [MM:SS] or [HH:MM:SS]
3. Be specific about speakers, topics, tone, and audio characteristics
4. If discussing transcription, quote accurately
5. Format timestamps as clickable references like: "At [2:30], the speaker says..."

Now, please answer the user's question about the audio.`;

        case 'pdf':
            return `You are a helpful document analysis assistant. The user has uploaded a PDF document and will ask questions about it.

IMPORTANT INSTRUCTIONS:
1. Answer questions based ONLY on the content of the PDF
2. Reference specific sections, pages, or data when possible
3. Be accurate with facts, figures, and quotes from the document
4. If the document contains tables or figures, describe them accurately
5. Summarize complex sections when asked

Now, please answer the user's question about the PDF document.`;

        case 'document':
            return `You are a helpful document analysis assistant. The user has uploaded a document and will ask questions about it.

IMPORTANT INSTRUCTIONS:
1. Answer questions based ONLY on the document content
2. Reference specific sections or parts when relevant
3. Extract and quote information accurately
4. Summarize content when requested
5. Identify document type and structure if relevant

Now, please answer the user's question about the document.`;

        case 'spreadsheet':
            return `You are a helpful data analysis assistant. The user has uploaded a spreadsheet and will ask questions about it.

IMPORTANT INSTRUCTIONS:
1. Answer questions based on the data in the spreadsheet
2. Be accurate with numbers, calculations, and data points
3. Reference specific cells, columns, rows, or sheets when relevant
4. Identify trends, patterns, and outliers when discussing the data
5. Perform calculations or summaries when requested

Now, please answer the user's question about the spreadsheet.`;

        case 'text':
            return `You are a helpful text analysis assistant. The user has uploaded a text file and will ask questions about it.

IMPORTANT INSTRUCTIONS:
1. Answer questions based on the text content
2. Quote accurately when referencing specific parts
3. Summarize sections when requested
4. Identify themes, tone, and writing style
5. Extract key information accurately

Now, please answer the user's question about the text.`;

        default:
            return `You are a helpful file analysis assistant. The user has uploaded a file and will ask questions about it.

IMPORTANT INSTRUCTIONS:
1. Answer questions based on the file content
2. Be specific and accurate in your responses
3. Reference relevant parts of the file when answering

Now, please answer the user's question about the file.`;
    }
}

/**
 * Stream analysis for any file type
 */
export async function analyzeFileStreaming(
    fileUri: string,
    mimeType: string,
    category: FileCategory
) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        generationConfig: {
            temperature: 1.0, // Keep at default as per Gemini 3 docs
        }
    });

    const prompt = getAnalysisPrompt(category);

    const result = await model.generateContentStream([
        {
            fileData: {
                mimeType: mimeType,
                fileUri: fileUri
            }
        },
        { text: prompt }
    ]);

    return result.stream;
}

/**
 * Chat with any file type
 */
export async function chatWithFile(
    fileUri: string,
    mimeType: string,
    category: FileCategory,
    message: string,
    history: Array<{ role: string; content: string; thoughtSignature?: string }> = []
) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        generationConfig: {
            temperature: 1.0, // Keep at default as per Gemini 3 docs
        }
    });

    const contextPrompt = getChatContextPrompt(category);

    // Build the conversation contents with file data included in EVERY user message
    // This is required for Gemini to maintain context of the file throughout the conversation
    const contents: any[] = [];

    // Add conversation history with file data attached to each user message
    history.forEach(msg => {
        if (msg.role === 'user') {
            // Include file data with every user message so Gemini can reference it
            contents.push({
                role: 'user',
                parts: [
                    {
                        fileData: {
                            mimeType: mimeType,
                            fileUri: fileUri
                        }
                    },
                    { text: msg.content }
                ]
            });
        } else {
            const parts: any[] = [{ text: msg.content }];
            if (msg.thoughtSignature) {
                parts[0].thoughtSignature = msg.thoughtSignature;
            }
            contents.push({
                role: 'model',
                parts
            });
        }
    });

    // If this is the first message (no history), add initial context
    if (contents.length === 0) {
        contents.push({
            role: 'user',
            parts: [
                {
                    fileData: {
                        mimeType: mimeType,
                        fileUri: fileUri
                    }
                },
                { text: contextPrompt }
            ]
        });
        // Add model acknowledgment
        contents.push({
            role: 'model',
            parts: [{ text: 'I understand. I will analyze the file and answer your questions based on its content.' }]
        });
    }

    // Start chat with history
    const chat = model.startChat({
        history: contents,
    });

    // Send the current message with file data
    const result = await chat.sendMessage([
        {
            fileData: {
                mimeType: mimeType,
                fileUri: fileUri
            }
        },
        { text: message }
    ]);

    const response = result.response;

    return {
        text: response.text(),
        thoughtSignature: extractThoughtSignature(response),
        timestamps: category === 'video' || category === 'audio'
            ? extractTimestamps(response.text())
            : []
    };
}

/**
 * Extract thought signature from response (for Gemini 3 continuity)
 */
function extractThoughtSignature(response: any): string | null {
    if (response.candidates && response.candidates[0]?.content?.parts) {
        const parts = response.candidates[0].content.parts;
        for (const part of parts) {
            if ((part as any).thoughtSignature) {
                return (part as any).thoughtSignature;
            }
        }
    }
    return null;
}

/**
 * Extract timestamps from text (only for video/audio)
 */
function extractTimestamps(text: string): string[] {
    const timestampRegex = /\[(\d{1,2}):(\d{2})\]|\[(\d{1,2}):(\d{2}):(\d{2})\]/g;
    const timestamps: string[] = [];
    let match;

    while ((match = timestampRegex.exec(text)) !== null) {
        timestamps.push(match[0]);
    }

    return [...new Set(timestamps)]; // Remove duplicates
}

/**
 * Get default analysis result structure for a file category
 * Used when analysis fails or for initialization
 */
export function getDefaultAnalysis(category: FileCategory) {
    const base = {
        summary: '',
        keyPoints: [],
        createdAt: new Date().toISOString()
    };

    switch (category) {
        case 'video':
            return {
                ...base,
                scenes: [],
                transcription: ''
            };
        case 'image':
            return {
                ...base,
                objects: [],
                ocrText: '',
                setting: '',
                style: '',
                colors: []
            };
        case 'audio':
            return {
                ...base,
                transcription: '',
                speakers: [],
                keyMoments: [],
                topics: [],
                audioCharacteristics: ''
            };
        case 'pdf':
            return {
                ...base,
                documentType: '',
                sections: [],
                dataHighlights: [],
                conclusions: ''
            };
        case 'document':
            return {
                ...base,
                documentType: '',
                topics: [],
                structure: '',
                importantInfo: []
            };
        case 'spreadsheet':
            return {
                ...base,
                purpose: '',
                structure: '',
                keyMetrics: [],
                trends: [],
                notablePoints: []
            };
        case 'text':
            return {
                ...base,
                contentType: '',
                themes: [],
                style: '',
                importantInfo: []
            };
        default:
            return {
                ...base,
                description: ''
            };
    }
}
