// src/Task/Task.node.ts
import type {
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
  SupplyData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { CrewAITask } from './interface';

export class Task implements INodeType {
  description: INodeTypeDescription = {
      displayName: 'CrewAI Task',
      name: 'taskNode',
      icon: 'fa:tasks',
      group: ['transform'],
      version: 1,
      description: 'Configure a CrewAI task',
      defaults: {
          name: 'CrewAI Task',
      },
      codex: {
          categories: ['AI'],
          subcategories: {
              AI: ['Tasks'],
          },
          resources: {
              primaryDocumentation: [
                  {
                      url: 'https://docs.crewai.example.com/tasks',
                  },
              ],
          },
      },
      inputs: [],
      outputs: [NodeConnectionType.AiTool],
      outputNames: ['Task'],
      properties: [
          {
              displayName: 'Description',
              name: 'description',
              type: 'string',
              default: '',
              placeholder: 'Identify the next big trend in {topic}.',
              typeOptions: {
                  rows: 4,
              },
          },
          {
              displayName: 'Expected Output',
              name: 'expectedOutput',
              type: 'string',
              default: '',
              placeholder: 'A comprehensive report on the latest AI trends.',
              typeOptions: {
                  rows: 2,
              },
          },
          {
              displayName: 'Agent',
              name: 'agent',
              type: 'string',
              default: '',
              placeholder: 'Marketing Researcher - The name of your agent'
          },
      ],
  };

  async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
      const description = this.getNodeParameter('description', itemIndex) as string;
      const expectedOutput = this.getNodeParameter('expectedOutput', itemIndex) as string;
      const agent = this.getNodeParameter('agent', itemIndex) as string;

      const task: CrewAITask = {
          description,
          expectedOutput,
          agent,
      };

      return {
          response: task,
      };
  }
}
