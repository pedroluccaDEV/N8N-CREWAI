Aqui, adicionar e listar as metas diárias para saber se estamos evoluindo ou estamos estagnados.

## Problemas !: 
- NÃO TEMOS UM OUTPUT, ACHAR UMA MANEIRA DE DAR SAIDA AOS DADOS (TEM UM CAMPO CHAMADO, EDIT FIELDS, ONDE ELE RETORNA ALGO)
- O CÓDIGO É DEPURADO UMA VEZ E PARA, POIS O WHILE QUEBRA A CONTINUIDADE DO CÓDIGO
- ARRUMAR O FATO DE QUE APENAS AS TASKS FUNCIONAIS SÃO AS DO AGENTE PRÉ-DEFINIDO
- 


## Plano de Teste/ Solução:
  # GERAL:
  - PESAR EM IDEIAS DE COMO COMPARTLHAR AS ALTERAÇÕES DENTRO DO WORKFLOW QUE NÃO SÃO INCULIDAS NO GIT
  - INTEGRAR AS SOLUÇÕES DE CHAT E SEÇÃO 
  - TOOLS 
  - EXPLORAR OUTROS APLICATIVOS PARA TESTE DO CHAT
  - MULTIPLO AGENTETES TRABALHANDO EM EQUIPE E COMPARTILHANDO RESULTADOS
  # CHAT
  - LIMPAR MAIS OS DADOS DE SAIDA
  - CHAIN CONTINUA PARA CONVERSAÇÃO MAIS DINAMICA
  # SEÇÃO
  - 


Arthur - 19/08/24
  Evolução:
    - Arrumar o git para pull e push corretamente (não estou conseguindo arrumar a pasta python/agent)
    - 
    -
Pedro - 20/08/24
  Evolução:
   - Indentifiquei o problema do pull e push do python: filtro de segurança do github, não permite o comit por conta da api key
   - Problema do GITHUB: Provavelmente corrigido
   - Tratamento dos dados do output usando o node edit fields
  AMANHA VOU COMEÇAR A FAZER A IDEIA DO CHAT
Pedro - 21/08/24
  Evolução:
 - Comecei a fazer o chat ( input do usuário vira task e agente responde ao input)
 - Usando chat trigger funcionou
 - Tem que ver isso ai cara 🚀: O chatInput depois de processado, é escrito no json e toda vez que o usuário faz uma nova entrada, o json é reescrito com a nova solicitaço
Pedro - 22/08/24
  Evolução:
  - comecei a lidar com  os dados de saida para ter uma resposta 100% limpa
  - A mensagem que aparece dentro do chat trigger, já está limpa, mas o problema é que retorna um json literal
  - comecei a estudar soluções para a chain continua para deixar as respostas mais rapidas e manter um contexto
Pedro - 23/08/24
  Evolução:
  - Fazer o sistema de seção dinamica junto com o contexto de conversação do agente
    - Ajeitar o script para dar a resposta usando o o model certo e manter a chain continua 

