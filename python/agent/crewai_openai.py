import json
import argparse
from crewai import Agent, Crew, Task
from langchain_openai import ChatOpenAI
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import os

# Defina sua API Key do OpenAI aqui
API_KEY = "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"
FINE_TUNED_MODEL = "ft:gpt-3.5-turbo-1106:startup:teste2-0:9qiFZG8o"

# Defina o caminho completo para o arquivo related.json
related_json_path = '/home/est.pedrolucca/Documentos/Testes/n8n-crewai/N8N-CrewAi/python/agent/related.json'

# Carregar dados do treinamento de limites
with open(related_json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

texts = [item['question'] for item in data]
labels = [item['label'] for item in data]

# Dividir dados em conjunto de treino e teste
X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42)

# Criar o pipeline de treinamento com ajustes
model = make_pipeline(
    TfidfVectorizer(ngram_range=(1, 2)),  # Captura unigramas e bigramas
    MultinomialNB(alpha=1.0)  # Suavização padrão
)

model.fit(X_train, y_train)

# Avaliar o modelo
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# Função que identifica se uma pergunta é relacionada ou não
def is_related_question(question):
    return model.predict([question])[0] == 'related'

# Função para criar agentes a partir de definições JSON
def create_agents(agents_json, llm):
    agents = []
    for agent_def in agents_json:
        agent = Agent(
            role=agent_def["role"],
            goal=agent_def["goal"],
            verbose=agent_def.get("verbose", False),
            memory=agent_def.get("memory", False),
            backstory=agent_def["backstory"],
            llm=llm
        )
        agents.append(agent)
    return agents

# Função para processar uma tarefa e gerar uma resposta
def process_task(task, llm):
    if task is None:
        return "Task is None."

    if not hasattr(task, 'description'):
        return "Task description is missing."

    user_prompt = task.description
    print(f"Processing task with description: {user_prompt}")  # Adicione isso para depuração

    conversation_history = [{"role": "user", "content": user_prompt}]
    
    # Adicionar contexto da conversa ao prompt
    context_prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])
    response = get_response_from_model(context_prompt, llm)
    
    if not response:
        return "No response from model."

    conversation_history.append({"role": "agent", "content": response})
    return response

# Função para processar o prompt do usuário e responder com base no modelo
def get_response_from_model(prompt, llm):
    print(f"Prompt sent to model: {prompt}")  # Adicione isso para depuração
    response = llm.invoke(prompt)
    print(f"Model response: {response}")  # Adicione isso para depuração
    if isinstance(response, dict):
        return response.get('content', '')
    elif hasattr(response, 'text'):
        return response.text
    else:
        return str(response)

# Função principal para processar argumentos, carregar JSON e criar agentes e tarefas
def main():
    parser = argparse.ArgumentParser(description="Process CrewAI agent and task definitions.")
    parser.add_argument('--json', type=str, help="JSON string with agent and task definitions")
    parser.add_argument('--file', type=str, help="Path to a JSON file with agent and task definitions")

    args = parser.parse_args()

    if args.json:
        definitions = json.loads(args.json)
    elif args.file:
        with open(args.file, 'r', encoding='utf-8') as json_file:
            definitions = json.load(json_file)
    else:
        raise ValueError("Either --json or --file must be provided.")

    # Adicionar print para verificar definições carregadas
    print("Loaded Definitions:", definitions)

    llm = ChatOpenAI(
        model=FINE_TUNED_MODEL,  
        api_key=API_KEY
    )

    agents = create_agents(definitions["agents"], llm)
    tasks_data = definitions.get("tasks", [])

    # Adicionar print para verificar tarefas carregadas
    print("Loaded Tasks Data:", tasks_data)

    if not agents:
        print("Nenhum agente disponível para interação.")
        return

    agent = agents[0]  # Usar o primeiro agente disponível

    # Criar Crew com o agente e as tarefas
    crew = Crew(agents=[agent], tasks=[])

    # Processar cada tarefa
    for task_data in tasks_data:
        print(f"Processing task data: {task_data}")  # Adicione isso para depuração

        if task_data is None:
            print("Task data is None.")
            continue

        if not isinstance(task_data, dict):
            print("Task data is not a dictionary.")
            continue

        if 'description' not in task_data:
            print("Task description is missing.")
            continue

        task = Task(
            description=task_data.get("description", ""),
            expected_output=task_data.get("expected_output", ""),
            agent=agent
        )
        
        # Adicionar a tarefa ao Crew
        crew.tasks.append(task)
        print(f"Task added to crew: {task.description}")

        # Executar a tarefa
        try:
            crew.kickoff()
            response = process_task(task, llm)
            print(f"Response to task '{task.description}': {response}")
        except ValueError as e:
            print(f"Error during task processing: {e}")

if __name__ == "__main__":
    main()

