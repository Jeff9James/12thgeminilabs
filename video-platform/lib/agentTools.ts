import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

/**
 * Tool definitions for the AI File/Folder Management Agent
 */
export const agentTools: FunctionDeclaration[] = [
    {
        name: 'list_items',
        description: 'List all files and folders currently available in the system.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                folderId: {
                    type: SchemaType.STRING,
                    description: 'Optional ID of the folder to list contents for. If omitted, lists root items.',
                }
            }
        }
    },
    {
        name: 'create_folder',
        description: 'Create a new folder in the file system.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                name: {
                    type: SchemaType.STRING,
                    description: 'The name of the new folder.',
                },
                parentId: {
                    type: SchemaType.STRING,
                    description: 'Optional ID of the parent folder where this folder should be created.',
                }
            },
            required: ['name']
        }
    },
    {
        name: 'rename_item',
        description: 'Rename an existing file or folder.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                id: {
                    type: SchemaType.STRING,
                    description: 'The unique ID of the file or folder to rename.',
                },
                newName: {
                    type: SchemaType.STRING,
                    description: 'The new name for the item.',
                },
                type: {
                    type: SchemaType.STRING,
                    description: 'The type of the item being renamed: "file" or "folder".',
                    format: 'enum',
                    enum: ['file', 'folder']
                }
            },
            required: ['id', 'newName', 'type']
        }
    },
    {
        name: 'move_item',
        description: 'Move a file from one folder to another.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                fileId: {
                    type: SchemaType.STRING,
                    description: 'The unique ID of the file to move.',
                },
                folderId: {
                    type: SchemaType.STRING,
                    description: 'The ID of the destination folder. Set to null to move to root.',
                }
            },
            required: ['fileId', 'folderId']
        }
    },
    {
        name: 'delete_item',
        description: 'Delete a file or a folder.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                id: {
                    type: SchemaType.STRING,
                    description: 'The unique ID of the file or folder to delete.',
                },
                type: {
                    type: SchemaType.STRING,
                    description: 'The type of the item being deleted: "file" or "folder".',
                    format: 'enum',
                    enum: ['file', 'folder']
                }
            },
            required: ['id', 'type']
        }
    },
    {
        name: 'update_metadata',
        description: 'Update metadata for a file, such as its title, tags, or description.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                fileId: {
                    type: SchemaType.STRING,
                    description: 'The unique ID of the file.',
                },
                metadata: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING },
                        tags: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING }
                        },
                        description: { type: SchemaType.STRING }
                    },
                    description: 'The metadata fields to update.'
                }
            },
            required: ['fileId', 'metadata']
        }
    }
];
