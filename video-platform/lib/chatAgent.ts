import { GoogleGenerativeAI, Content, Part } from '@google/generative-ai';
import { agentTools } from './agentTools';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface AgentAction {
    toolName: string;
    args: any;
    id: string;
}

export interface AgentResponse {
    answer: string;
    pendingActions: AgentAction[];
}

export async function runAgentCycle(
    query: string,
    history: any[] = [],
    contextFiles: any[] = [],
    contextFolders: any[] = []
): Promise<AgentResponse> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        tools: [{ functionDeclarations: agentTools }],
    });

    // Prepare context about current structure
    const systemInstruction = `You are a File Management AI Agent. 
You can help the user organize their files and folders, rename them, delete them, and update metadata.
You MUST propose actions to the user using your tools.

CURRENT FILE SYSTEM STATE:
Folders: ${JSON.stringify(contextFolders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId })))}
Files: ${JSON.stringify(contextFiles.map(f => ({ id: f.id, filename: f.filename || f.title, folderId: f.folderId })))}

When the user asks to perform an action, call the corresponding tool.
The user will review your proposed actions before they are applied. 
Always explain what you are planning to do.`;

    const contents: Content[] = [
        {
            role: 'user',
            parts: [{ text: systemInstruction }]
        },
        {
            role: 'model',
            parts: [{ text: "Understood. I have access to the file system state and will help the user manage their files and folders by proposing actions via tools." }]
        }
    ];

    // Add history
    history.forEach(msg => {
        contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.answer || msg.question || msg.content }]
        });
    });

    // Add current query
    contents.push({
        role: 'user',
        parts: [{ text: query }]
    });

    const result = await model.generateContent({ contents });
    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];

    let answer = '';
    const pendingActions: AgentAction[] = [];

    for (const part of parts) {
        if ('text' in part && part.text) {
            answer += part.text;
        }
        if ('functionCall' in part && part.functionCall) {
            pendingActions.push({
                toolName: part.functionCall.name,
                args: part.functionCall.args,
                id: Math.random().toString(36).substring(7)
            });
        }
    }

    return {
        answer: answer || "I've proposed some changes for you to review.",
        pendingActions
    };
}
