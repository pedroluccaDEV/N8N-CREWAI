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

function getInputs() {
    const inputs = [
        { displayName: 'Input Main', type: NodeConnectionType.Main },
        {
            displayName: 'Agents',
            type: NodeConnectionType.AiAgent,
            required: true,
        },
        {
            displayName: 'Tasks',
            type: NodeConnectionType.AiTool,
            required: true,
        },
    ];

    return inputs;
}

export class Crew implements INodeType {

    description: INodeTypeDescription = {
        displayName: 'CrewAI Crew',
        name: 'crewAICrew',
        group: ['transform'],
        version: 1,
        description: 'Configure and execute a CrewAI crew with autonomous agents, each tailored for specific roles and goals, directly within your n8n workflows. This node provides a structured approach to define agent configurations, facilitating sophisticated AI-driven task execution.',
        defaults: {
            name: 'CrewAI Crew',
        },
        inputs: `={{ ((parameter) => { ${getInputs.toString()}; return getInputs(parameter) })($parameter) }}`,
        outputs: ['main'],
        properties: [
            {
                displayName: 'Allow Delegation',
                name: 'allowDelegation',
                type: 'boolean',
                default: false,
                description: 'If true, the agent can delegate tasks to other agents when necessary.',
            },
            {
                displayName: 'Execution Mode',
                name: 'executionMode',
                type: 'options',
                options: [
                    {
                        name: 'Sequential',
                        value: 'sequential',
                        description: 'Executes tasks sequentially, one after the other.',
                    },
                    {
                        name: 'Parallel',
                        value: 'parallel',
                        description: 'Executes tasks in parallel, based on dependencies and resources.',
                    },
                ],
                default: 'sequential',
                description: 'Choose the execution mode for CrewAI tasks. Sequential mode ensures tasks are handled one at a time, while Parallel mode enables simultaneous execution where applicable.',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();

        let item: INodeExecutionData;
        let myString: string;

        const agents = (await this.getInputConnectionData(
            NodeConnectionType.AiAgent,
            0,
        )) as CrewAIAgent[];

        const tasks = (await this.getInputConnectionData(
            NodeConnectionType.AiTool,
            0,
        )) as CrewAITask[];

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                myString = this.getNodeParameter('myString', itemIndex, '') as string;
                item = items[itemIndex];
                myString = myString;

                console.log('running');

                // Define the path for the JSON file and Python script
                const definitionsDir = path.join(__dirname, '..', '..', 'python', 'agent');
                const filePath = path.join(definitionsDir, 'definitions.json');
                const pythonScriptPath = '/home/est.pedrolucca/Documentos/Testes/n8n-crewai/N8N-CrewAi/python/agent/crewai_openai.py';

                // Ensure the directory exists
                if (!fs.existsSync(definitionsDir)) {
                    fs.mkdirSync(definitionsDir, { recursive: true });
                }

                // Prepare JSON data
                let jsonParams: any = {};
                jsonParams.agents = agents;
                jsonParams.tasks = tasks;

                try {
                    fs.writeFileSync(filePath, JSON.stringify(jsonParams, null, 2));
                    console.log(`Successfully wrote definitions to: ${filePath}`);
                } catch (writeError) {
                    console.error(`Failed to write definitions.json: ${writeError.message}`);
                    throw writeError;  // Re-throw to handle in outer catch
                }

                // Call the Python script with the absolute path
                console.log(`Running Python script with command: python3 ${pythonScriptPath} --file ${filePath}`);

                try {
                    const { stdout, stderr } = await execPromise(`python3 ${pythonScriptPath} --file ${filePath}`);
                    if (stderr) {
                        console.error(`Python script stderr: ${stderr}`);
                    }
                    console.log(`Python script stdout: ${stdout}`);
                    item.json['myString3'] = stdout;
                } catch (execError) {
                    console.error(`Failed to execute Python script: ${execError.message}`);
                    throw execError;  // Re-throw to handle in outer catch
                }

            } catch (error) {
                if (this.continueOnFail()) {
                    items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
                } else {
                    if (error.context) {
                        error.context.itemIndex = itemIndex;
                        throw error;
                    }
                    throw new NodeOperationError(this.getNode(), error, {
                        itemIndex,
                    });
                }
            }
        }

        return this.prepareOutputData(items);
    }
}
