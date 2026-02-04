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
    contextFolders: any[] = [],
    mode: 'management' | 'learning' | 'hybrid' = 'management'
): Promise<AgentResponse> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        tools: [{ functionDeclarations: agentTools }],
    });

    // Prepare context about current structure
    let systemInstruction = '';

    const fileStateContext = `
CURRENT FILE SYSTEM STATE:
Folders: ${JSON.stringify(contextFolders.map(f => ({ id: f.id, name: f.name, parentId: f.parentId })))}
Files: ${JSON.stringify(contextFiles.map(f => ({ id: f.id, filename: f.filename || f.title, folderId: f.folderId, category: f.category, uploadedAt: f.uploadedAt })))}
`;

    if (mode === 'learning' || mode === 'hybrid') {
        const hybridIntro = mode === 'hybrid'
            ? "You are a Hybrid AI Agent acting as both an AI Tutor and a File Management Specialist."
            : "You are an AI Tutor and Learning Hub Agent.";

        systemInstruction = `${hybridIntro}
Your goal is to help the user master subjects using their uploaded study materials.
You should act as a pedagogical guide, explaining complex concepts, creating study plans, and scaffolding the user's learning process.

${fileStateContext}

When the user asks to perform a learning action or organize study materials, use your tools if needed (e.g., to create a "Study Guides" folder or rename files for better organization).
You MUST propose actions to the user using your tools if you want to organize their files.

PEDAGOGICAL GUIDELINES:
1. Explain concepts simply and use analogies.
2. Link information across multiple files if relevant.
3. Propose practice questions or quizzes.
4. If a user asks a complex question, break it down into smaller, learnable parts (scaffolding).

${mode === 'hybrid' ? `
FILE MANAGEMENT CAPABILITIES:
You can also help the user organize their files and folders, rename them, delete them, and update metadata.
You can call MULTIPLE tools in a single response to perform complex tasks.
If you are creating a folder and want to move files into it immediately, use the virtual ID format 'virtual-folder:[NAME]' for the folderId in the move_item tool.
Always explain both your pedagogical approach and any file management actions you are proposing.` : "Always explain your pedagogical approach in your response."}`;
    } else {
        systemInstruction = `You are a File Management AI Agent. 
You can help the user organize their files and folders, rename them, delete them, and update metadata.
You MUST propose actions to the user using your tools.

${fileStateContext}

When the user asks to perform an action, call the corresponding tool.
You can call MULTIPLE tools in a single response to perform complex tasks.
If you are creating a folder and want to move files into it immediately, use the virtual ID format 'virtual-folder:[NAME]' for the folderId in the move_item tool. This will be resolved during application.

The user will review your proposed actions before they are applied. 
Always explain what you are planning to do.`;
    }

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
