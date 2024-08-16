//HttpRequest.node.ts
import {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData, 
	NodeOperationError,
} from 'n8n-workflow';
import axios, { AxiosRequestConfig, Method } from 'axios'; 

export class HttpRequest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HTTP Request',
		name: 'httpRequest',
		icon: 'fa:cloud',
		group: ['transform'],
		version: 1,
		description: 'Makes an HTTP request and returns the received data',
		defaults: {
			name: 'HTTP Request',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'http://example.com',
				required: true,
				description: 'The URL to make the request to',
			},
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
					{ name: 'DELETE', value: 'DELETE' },
				],
				default: 'GET',
				description: 'The HTTP method to use',
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'json',
				default: '{}',
				placeholder: '{"Content-Type": "application/json"}',
				description: 'The headers to send along with the request',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'json',
				default: '{}',
				placeholder: '{"key": "value"}',
				description: 'The body to send along with the request',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const url = this.getNodeParameter('url', itemIndex) as string;
				const method = this.getNodeParameter('method', itemIndex) as Method;
				const headers = this.getNodeParameter('headers', itemIndex) as object;
				const body = this.getNodeParameter('body', itemIndex) as object;

				const axiosConfig: AxiosRequestConfig = {
					method,
					url,
					headers,
					data: body,
				};

				const response = await axios(axiosConfig);

				returnData.push({
					json: response.data,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
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

		return this.prepareOutputData(returnData);
	}
}
