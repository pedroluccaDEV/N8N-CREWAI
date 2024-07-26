export interface CrewAIAgent {
	role: string;
	goal: string;
	tool: string;
	verbose: boolean;
	memory: boolean;
	backstory: string;
}