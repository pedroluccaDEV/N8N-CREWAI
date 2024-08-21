import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType,
    NodeOperationError,
} from 'n8n-workflow';

import { exec } from 'child_process';
import { promisify } from 'util';
import { CrewAIAgent } from "../Agents/interface";
import { CrewAITask } from "../Task/interface";
import * as fs from 'fs';
import * as path from 'path';

const execPromise = promisify(exec);

export class Crew implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'CrewAI Crew',
        name: 'crewAICrew',
        group: ['transform'],
        version: 1,
        description: 'Configure and execute a CrewAI crew with autonomous agents, each tailored for specific roles and goals, directly within your n8n workflows.',
        defaults: {
            name: 'CrewAI Crew',
        },
        inputs: [
            { displayName: 'Input Main', type: 'main', required: true },
            { displayName: 'Agents', type: 'ai_agent', required: true },
            { displayName: 'Tasks', type: 'ai_tool', required: false }, // Set as optional
        ],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Chat Input',
                name: 'chatInput',
                type: 'string',
                default: '',
                description: 'Input text to be used as the task if no task node is connected.',
            },
            {
                displayName: 'Allow Delegation',
                name: 'allowDelegation',
                type: 'boolean',
                default: false,
            },
            {
                displayName: 'Execution Mode',
                name: 'executionMode',
                type: 'options',
                options: [
                    { name: 'Sequential', value: 'sequential' },
                    { name: 'Parallel', value: 'parallel' },
                ],
                default: 'sequential',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const chatInput = this.getNodeParameter('chatInput', 0) as string;

        if (!chatInput) {
            throw new NodeOperationError(this.getNode(), 'Chat Input is required.');
        }

        const agents = (await this.getInputConnectionData(NodeConnectionType.AiAgent, 0)) as CrewAIAgent[];
        let tasks: CrewAITask[] | undefined;

        // Check if there's a connection to the task node
        try {
            tasks = (await this.getInputConnectionData(NodeConnectionType.AiTool, 0)) as CrewAITask[];
        } catch (error) {
            // No connection to tasks, use chatInput as the task
            if (!chatInput) {
                throw new NodeOperationError(this.getNode(), 'A Tasks sub-node must be connected or a chat input must be provided.');
            }
        }

        // Log the loaded agents and tasks
        console.log('Loaded Agents:', agents);
        console.log('Loaded Tasks:', tasks);

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const item = items[itemIndex];
                // Use chat input if no tasks are defined
                const task = (tasks && tasks.length > 0) ? tasks[0] : { name: 'Custom Task', description: chatInput }; 

                // Log the task being used
                console.log('Task Being Used:', task);

                if (!task) {
                    throw new NodeOperationError(this.getNode(), 'Task is undefined.');
                }

                // Define the path for the JSON file and Python script
                const definitionsDir = path.join(__dirname, '..', '..', 'python', 'agent');
                const filePath = path.join(definitionsDir, 'definitions.json');
                const pythonScriptPath = '/home/est.pedrolucca/Documentos/Testes/n8n-crewai/N8N-CrewAi/python/agent/crewai_openai.py';

                if (!fs.existsSync(definitionsDir)) {
                    fs.mkdirSync(definitionsDir, { recursive: true });
                }

                // Prepare JSON data
                const jsonParams: any = { agents, tasks: [task] };

                try {
                    fs.writeFileSync(filePath, JSON.stringify(jsonParams, null, 2));
                    console.log(`Successfully wrote definitions to: ${filePath}`);
                } catch (writeError) {
                    throw new NodeOperationError(this.getNode(), `Failed to write definitions.json: ${writeError.message}`);
                }

                if (!fs.existsSync(pythonScriptPath)) {
                    throw new NodeOperationError(this.getNode(), `Python script not found at path: ${pythonScriptPath}`);
                }

                // Execute Python script
                try {
                    const { stdout, stderr } = await execPromise(`python3 ${pythonScriptPath} --file ${filePath}`);
                    if (stderr) {
                        console.error(`Python script stderr: ${stderr}`);
                    }
                    if (stdout && item && item.json) {
                        item.json['agentResponse'] = stdout;

                        // Check if task is of type { name: string; description: string }
                        if ('name' in task && 'description' in task) {
                            console.log(`Agent response for task '${task.name}': ${stdout}`);
                        } else {
                            console.log(`Agent response for task with description: ${task.description}`);
                        }
                    } else {
                        throw new NodeOperationError(this.getNode(), 'Failed to retrieve a valid response from the Python script.');
                    }
                } catch (execError) {
                    throw new NodeOperationError(this.getNode(), `Failed to execute Python script: ${execError.message}`);
                }

            } catch (error) {
                if (this.continueOnFail()) {
                    items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
                } else {
                    throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
                }
            }
        }

        return this.prepareOutputData(items);
    }
}
