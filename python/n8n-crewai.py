import json
from flask import Flask, request, jsonify
from crewai import Agent, Crew, Task
from langchain_openai import ChatOpenAI
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Configuração da API do OpenAI
API_KEY = "YOU-API-KEY"
FINE_TUNED_MODEL = "FINE-TUNNING-OUTPUT-MODEL"

# Carregar dados do treinamento de limites
with open('related.json', 'r', encoding='utf-8') as f:
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

# Função para criar tarefas a partir de solicitações dinâmicas do usuário
def create_task_from_prompt(agent, user_prompt):
    # Criar uma nova tarefa com base no prompt do usuário
    task_description = f"Responder à solicitação do usuário: {user_prompt}"
    task = Task(
        description=task_description,
        expected_output="Resposta personalizada para a solicitação do usuário.",
        agent=agent
    )
    return task

# Função para processar o prompt do usuário e responder com base no modelo
def get_response_from_model(prompt, llm):
    response = llm.invoke(prompt)
    if isinstance(response, dict):
        return response.get('content', '')
    elif hasattr(response, 'text'):
        return response.text
    else:
        return str(response)

# Função para gerar uma saudação personalizada
def generate_welcome_message(agent):
    return f"Eu sou o {agent.role}, seu assistente de vendas aqui na loja ABC. Estou aqui para ajudar com informações sobre nossos produtos, promoções e políticas. Como posso ajudar você hoje?"

# Função para gravar feedback em related.json
def save_feedback(feedback):
    try:
        with open('related.json', 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
            if not isinstance(existing_data, list):
                existing_data = []
    except FileNotFoundError:
        existing_data = []
    except json.JSONDecodeError:
        existing_data = []
    
    existing_data.append({"question": feedback, "label": "related"})
    
    with open('related.json', 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=4)

# Função para inicializar agentes e Crew
def initialize_crew(definitions):
    llm = ChatOpenAI(
        model=FINE_TUNED_MODEL,
        api_key=API_KEY
    )
    agents = create_agents(definitions["agents"], llm)
    tasks = []
    crew = Crew(agents=agents, tasks=tasks)
    return crew, agents

# Inicializar o Flask
app = Flask(__name__)

# Armazenar o histórico de conversas e crew global
conversation_history = []
crew, agents = None, None
agent = None

@app.route('/initialize', methods=['POST'])
def initialize():
    global crew, agents, agent
    definitions = request.json
    crew, agents = initialize_crew(definitions)
    agent = agents[0] if agents else None
    return jsonify({"message": "Crew initialized", "agents": len(agents), "tasks": 0})

@app.route('/message', methods=['POST'])
def message():
    global conversation_history, agent, crew
    user_prompt = request.json.get("message")

    if user_prompt.lower() == 'feedback':
        feedback = request.json.get("feedback")
        save_feedback(feedback)
        return jsonify({"response": "Obrigado pelo seu feedback!"})

    conversation_history.append({"role": "user", "content": user_prompt})

    if is_related_question(user_prompt):
        task = create_task_from_prompt(agent, user_prompt)
        crew.tasks.append(task)

        try:
            crew.kickoff()
            crew.tasks.clear()
        except ValueError as e:
            return jsonify({"error": str(e)})

        context_prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])
        response = get_response_from_model(context_prompt, agent.llm)
        conversation_history.append({"role": "agent", "content": response})
    else:
        response = "Desculpe, eu só posso responder perguntas relacionadas a nossa loja e aos nossos produtos."
        conversation_history.append({"role": "agent", "content": response})

    return jsonify({"response": response})

@app.route('/welcome', methods=['GET'])
def welcome():
    global agent
    if agent:
        return jsonify({"message": generate_welcome_message(agent)})
    else:
        return jsonify({"message": "Nenhum agente disponível para interação."})

if __name__ == "__main__":
    app.run(port=8910)
