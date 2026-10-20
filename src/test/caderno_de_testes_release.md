# 📋 Caderno de Testes de Homologação (Pré-Release) — Clínica Escuta

Este documento contém o roteiro completo de testes funcionais, de segurança e de regras de negócio para validação final antes do lançamento da versão em produção.

> [!IMPORTANT]
> **Pré-requisitos para execução da bateria de testes:**
> 1. Backend (`room-harmony-backend`) atualizado e reiniciado apontando para o banco de homologação/teste.
> 2. Frontend (`room-harmony`) com build atualizado apontando para a URL correta no `.env`.
> 3. Possuir pelo menos **1 conta de Administrador** e **1 conta de Locatário (Profissional)** ativas para alternar durante os testes.

---

## Módulo 1: Autenticação, Primeiro Acesso e Perfil (`/` · `/app/reset-first-password` · `/app/perfil`)

| ID | Cenário de Teste | Perfil | Passos para Execução | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **AUT-01** | Login com credenciais válidas | Ambos | 1. Acessar a tela de login.<br>2. Informar e-mail/usuário e senha corretos.<br>3. Clicar em Entrar. | Autentica com sucesso, armazena o token JWT e redireciona para o painel (`/app/dashboard` ou `/app/agenda`). | [ ] |
| **AUT-02** | Login com credenciais inválidas | Ambos | 1. Informar senha incorreta.<br>2. Clicar em Entrar. | Exibe mensagem de erro clara e impede o acesso. | [ ] |
| **AUT-03** | Fluxo obrigatório de Primeiro Acesso (Troca de Senha) | Locatário | 1. Criar um novo profissional ou resetar a senha de um existente.<br>2. Logar com a senha padrão gerada. | O sistema deve interceptar a navegação e exigir a definição de uma nova senha em `/app/reset-first-password` antes de liberar os demais menus. | [ ] |
| **AUT-04** | Tour Guiado de Boas-Vindas (`mustCompleteTour`) | Locatário | 1. Acessar com um usuário recém-criado após trocar a senha inicial. | O tour interativo deve ser exibido e, ao ser concluído, não deve reaparecer nos próximos logins. | [ ] |
| **AUT-05** | Edição de Perfil e Foto | Ambos | 1. Ir em **Meu Perfil** (`/app/perfil`).<br>2. Alterar telefone, endereço/CEP ou foto de perfil e salvar. | Os dados são persistidos com sucesso e o avatar atualizado aparece no cabeçalho e nos cards de reserva. | [ ] |
| **AUT-06** | Bloqueio de rotas de Admin para Locatário | Locatário | 1. Logado como Locatário, verificar a barra lateral e tentar acessar rotas administrativas (`/app/aprovacoes`, `/app/unidades`, `/app/profissionais`, `/app/auditoria`). | Itens exclusivos de Admin não devem permitir ações administrativas; endpoints no backend devem retornar `403 Forbidden` caso acionados diretamente. | [ ] |

---

## Módulo 2: Gestão de Unidades e Horários de Funcionamento (`/app/unidades`)

| ID | Cenário de Teste | Perfil | Passos para Execução | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **UNI-01** | Criação de Unidade | Admin | 1. Acessar **Unidades** (`/app/unidades`).<br>2. Clicar em **Nova unidade**.<br>3. Preencher nome, endereço e configurar horários de funcionamento por dia da semana.<br>4. Salvar. | Unidade é criada, listada como **Ativa** e passa a aparecer nos seletores de salas e reservas. | [ ] |
| **UNI-02** | Edição de Horário de Funcionamento (`business_hours`) | Admin | 1. Editar uma unidade existente.<br>2. Alterar o horário de abertura/fechamento de um dia (ex: Segunda das `08:00` às `18:00`) ou desativar o Sábado/Domingo.<br>3. Salvar. | O formulário de reserva naquela unidade deve respeitar imediatamente os novos horários (bloqueando horários fora do expediente ou dias fechados). | [ ] |
| **UNI-03** | Inativação / Ativação de Unidade | Admin | 1. Clicar em **Inativar** em uma unidade ativa. | Status muda para **Inativa** e ela deixa de aparecer para novas solicitações de reserva de locatários. | [ ] |

---

## Módulo 3: Gestão de Salas e Galeria de Fotos (`/app/salas`)

| ID | Cenário de Teste | Perfil | Passos para Execução | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **SAL-01** | Criação de Sala com Fotos | Admin | 1. Acessar **Salas** (`/app/salas`).<br>2. Clicar em **Nova sala**, vincular a uma Unidade, preencher descrição e anexar até 4 fotos.<br>3. Salvar. | Sala é criada com sucesso. A listagem deve ser rápida (sem trafegar fotos pesadas no `readAll`), carregando as fotos sob demanda ao abrir os detalhes/edição. | [ ] |
| **SAL-02** | Visualização das Fotos da Sala no Modal de Reserva | Locatário | 1. Abrir **Solicitar Reserva**.<br>2. Selecionar a Unidade e a Sala criada.<br>3. Clicar nas miniaturas das fotos da sala. | Exibe a descrição da sala e abre o visualizador de fotos em tamanho ampliado. | [ ] |
| **SAL-03** | Edição e Inativação de Sala | Admin | 1. Editar nome/descrição/fotos de uma sala ou inativá-la. | Alterações salvas; salas inativas não aparecem para novas reservas. | [ ] |

---

## Módulo 4: Gestão de Profissões e Profissionais (`/app/profissoes` · `/app/profissionais`)

| ID | Cenário de Teste | Perfil | Passos para Execução | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **PRO-01** | Cadastro de Profissão | Admin | 1. Acessar **Profissões** (`/app/profissoes`).<br>2. Criar uma nova profissão (ex: Psicologia, Nutrição, Fonoaudiologia). | Profissão aparece disponível no cadastro de profissionais. | [ ] |
| **PRO-02** | Cadastro Individual de Profissional | Admin | 1. Acessar **Profissionais** (`/app/profissionais`).<br>2. Clicar em **Novo profissional**, preencher Nome, E-mail, CPF, Telefone, CRP/Conselho, CEP, Endereço, Profissão e Papel.<br>3. Salvar. | Profissional criado com sucesso e exibido na listagem. | [ ] |
| **PRO-03** | Importação em Massa via CSV | Admin | 1. Clicar em **Cadastro em massa**.<br>2. Enviar arquivo CSV válido com múltiplos profissionais. | Importa os registros, exibe resumo de sucesso/erros e atualiza a lista. | [ ] |
| **PRO-04** | Pesquisa, Ordenação A-Z, Filtro de Inativos e Paginação | Admin | 1. Na tela de Profissionais, buscar por nome, CPF, telefone ou CRP.<br>2. Alternar botões **Ordem: A-Z** e **Ocultando Inativos**.<br>3. Navegar entre páginas (`Anterior` / `Próxima`). | Filtros e paginação (10 por página) funcionam instantaneamente. | [ ] |
| **PRO-05** | Reset de Senha e Inativação/Ativação de Profissional | Admin | 1. Clicar em **Resetar Senha** em um profissional e confirmar.<br>2. Clicar em **Inativar** e depois em **Ativar**. | Senha volta para o padrão (exigindo troca no próximo login); status alterna entre Ativo e Inativo. | [ ] |

---

## Módulo 5: Solicitação e Criação de Reservas (`/app/agenda` · `/app/solicitar` · `/app/reservas`)

| ID | Cenário de Teste | Perfil | Passos para Execução | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **RES-01** | Solicitação de Reserva Avulsa (1h) por Locatário **SEM** comprovante | Locatário | 1. Abrir modal de **Solicitar reserva**.<br>2. Escolher Unidade, Sala, Tipo `Hora avulsa (1h)`, Data e Horário válido.<br>3. Não anexar comprovante. | O botão **Enviar solicitação** permanece **desabilitado**, exibindo o aviso: *"Comprovante de pagamento obrigatório"*. | [ ] |
| **RES-02** | Solicitação de Reserva Avulsa (1h) por Locatário **COM** comprovante | Locatário | 1. No mesmo formulário, anexar uma imagem de comprovante.<br>2. Clicar em **Enviar solicitação**. | Reserva é criada com status **`pendente`**, duração automática de **1h** e notificação enviada ao Telegram (se configurado). | [ ] |
| **RES-03** | Solicitação de Reserva Fixa Mensal (`semanal_mensal`) | Locatário | 1. Selecionar `Hora avulsa fixa (semanal até fim do mês)`.<br>2. Anexar comprovante e enviar. | O backend gera as reservas semanais (1h de duração) da data escolhida até o último dia daquele mês (ignorando domingos). | [ ] |
| **RES-04** | Solicitação de Turno Anual (`semanal_anual` - 4h) | Locatário | 1. Selecionar `Turno (4h - semanal até fim do ano)` e horário inicial (ex: `08:00`).<br>2. Anexar comprovante e enviar. | O horário final ajusta automaticamente para `12:00` (4h de duração) e gera as ocorrências semanais até o fim do ano. | [ ] |
| **RES-05** | Bloqueio de Conflito de Horário | Ambos | 1. Tentar solicitar reserva na mesma Sala, Data e Horário de uma reserva já `aprovada` ou `pendente`. | O formulário exibe alerta de conflito e bloqueia o envio (e o backend também valida via `hasConflict`). | [ ] |
| **RES-06** | Bloqueio Fora do Horário da Unidade | Ambos | 1. Selecionar um dia em que a unidade está fechada (ex: Domingo) ou horário além do expediente. | Exibe alerta de fora do horário de funcionamento e impede o envio. | [ ] |
| **RES-07** | Criação de Reserva Normal por Admin | Admin | 1. Logado como Admin, criar uma reserva para um profissional. | A reserva já nasce com status **`aprovada`** e sem exigir anexo de comprovante. | [ ] |
| **RES-08** | Criação de **Reserva Especial (Admin)** | Admin | 1. Em `/app/reservas` ou no modal de reserva, clicar em **✨ Reserva Especial (Admin)**.<br>2. Definir intervalo de datas ou múltiplos horários/semanas para um administrador.<br>3. Confirmar. | Reservas são criadas imediatamente como **`aprovada`**, com badge **Reserva Especial**, sem exigir comprovante e com duração flexível. | [ ] |

---

## Módulo 6: Fluxo de Aprovações, Negação e Cancelamentos (`/app/aprovacoes` · `/app/minhas-reservas`)

| ID | Cenário de Teste | Perfil | Passos para Execução | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **APR-01** | Pesquisa, Filtro por Datas (`De`/`Até`) e Paginação em **Aprovações Pendentes** | Admin | 1. Acessar **Aprovações pendentes** (`/app/aprovacoes`).<br>2. Testar busca por nome do profissional, CRP, sala ou data.<br>3. Filtrar por período `De` / `Até` e testar botão `Limpar filtros`.<br>4. Testar paginação quando houver > 10 itens. | A lista filtra em tempo real nas 3 abas (*Solicitações de Reserva*, *A Reagendar* e *Solicitações de Cancelamento*) e pagina corretamente. | [ ] |
| **APR-02** | Visualização de Comprovantes em Fila | Admin | 1. Clicar em **Ver comprovante** em um item ou em **Navegar Comprovantes (N)** no topo. | Abre o modal `ReceiptViewerDialog` buscando a imagem sob demanda (`GET /reservations/{id}/receipt`) e permite navegar entre os comprovantes. | [ ] |
| **APR-03** | Aprovação de Reserva Pendente | Admin | 1. Na aba *Solicitações de Reserva*, clicar em **Aprovar** e confirmar. | Status muda para **`aprovada`**, registra o admin aprovador e remove o item da fila de pendências. | [ ] |
| **APR-04** | Negação de Reserva com Motivo Obrigatório | Admin | 1. Clicar em **Negar** em uma reserva pendente.<br>2. Informar o motivo da negação e confirmar. | Status muda para **`negada`**. Na tela **Minhas Reservas** do locatário, o motivo da negação aparece destacado em vermelho. | [ ] |
| **APR-05** | Cancelamento Direto de Reserva **Pendente** pelo Locatário | Locatário | 1. Em **Minhas Reservas** (`/app/minhas-reservas`), localizar uma reserva com status `pendente`.<br>2. Clicar em **Cancelar** e confirmar. | Como ainda estava pendente, ela é cancelada imediatamente (`cancelada`). | [ ] |
| **APR-06** | Solicitação de Cancelamento de Reserva **Aprovada** (> 24h de antecedência) | Locatário | 1. Em **Minhas Reservas**, localizar uma reserva `aprovada` cuja data/hora seja superior a 24h a partir de agora.<br>2. Clicar em **Solicitar cancelamento** e confirmar. | Status muda para **`solicitacao_cancelamento`** e entra na aba *Solicitações de Cancelamento* do Admin. | [ ] |
| **APR-07** | Bloqueio de Cancelamento de Reserva **Aprovada** (< 24h de antecedência) | Locatário | 1. Em **Minhas Reservas**, localizar uma reserva `aprovada` para hoje ou com menos de 24h de antecedência. | O botão fica desabilitado com o aviso *"Prazo de cancelamento expirado (< 24h)"* (e o backend também rejeita se tentado via API). | [ ] |
| **APR-08** | Efetivar ou Recusar Solicitação de Cancelamento | Admin | 1. Em `/app/aprovacoes`, abrir a aba **Solicitações de Cancelamento**.<br>2. Testar **Manter Aprovada** (recusa o cancelamento) ou **Efetivar Cancelamento** (muda para `cancelada` e notifica o locatário). | Status atualiza conforme a decisão; quando efetivado, o locatário recebe alerta de notificação em **Minhas Reservas**. | [ ] |

---

## Módulo 7: Feriados / Bloqueios e Fluxo de Reagendamento (`/app/feriados` · `/app/minhas-reservas` · `/app/aprovacoes`)

| ID | Cenário de Teste | Perfil | Passos para Execução | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **FER-01** | Criação de Feriado/Bloqueio em dia **COM** reserva já aprovada ou pendente | Admin | 1. Garantir que existe uma reserva `aprovada` para o dia `X` na Unidade `Y`.<br>2. Ir em **Feriados e Bloqueios** (`/app/feriados`).<br>3. Criar um feriado/bloqueio para o dia `X` (para a Unidade `Y` ou Global). | O feriado **é criado sem bloqueio**. Automaticamente, a reserva daquele dia preserva seus dados (Unidade, Sala, Profissional) e tem apenas seu status alterado para **`reagendar`** (*A Reagendar*). | [ ] |
| **FER-02** | Bloqueio de Novas Reservas em Data de Feriado | Locatário | 1. Tentar criar uma nova reserva comum na data do feriado recém-criado. | O formulário exibe alerta amarelo informando que a unidade estará fechada devido ao feriado e bloqueia o envio. | [ ] |
| **FER-03** | Visualização da Reserva `reagendar` pelo Locatário | Locatário | 1. Acessar **Minhas Reservas** (`/app/minhas-reservas`).<br>2. Filtrar pela aba **A Reagendar (Feriado)** (ou usar a busca/filtro de datas). | A reserva aparece com a badge roxa **A Reagendar**, aviso explicativo do feriado e o botão roxo **Reagendar Reserva**. | [ ] |
| **FER-04** | Reagendamento pelo Locatário (Apenas Data e Horário) | Locatário | 1. Clicar em **Reagendar Reserva**.<br>2. Verificar que **Unidade**, **Sala**, **Tipo/Recorrência** e **Observações** estão preenchidos com os dados originais da reserva e **bloqueados para edição**.<br>3. Escolher uma **nova Data** (sem feriado) e **novo Horário** livre.<br>4. Verificar que **não** é exigido novo comprovante.<br>5. Clicar em **Enviar solicitação de reagendamento**. | O botão habilita normalmente. Ao enviar, a reserva é atualizada para a nova data/horário e seu status passa automaticamente para **`pendente`**, voltando para a fila de aprovação dos administradores (sem erro `403`). | [ ] |
| **FER-05** | Reagendamento Direto pelo Admin | Admin | 1. Em `/app/aprovacoes`, aba **A Reagendar (Feriado)**, clicar em **Reagendar Reserva**.<br>2. Escolher nova data/horário e salvar. | Como foi feito pelo Admin, a reserva já é reagendada diretamente com status **`aprovada`**. | [ ] |

---

## Módulo 8: Gestão Geral de Reservas e Exclusão em Lote (`/app/reservas` · `/app/minhas-reservas`)

| ID | Cenário de Teste | Perfil | Passos para Execução | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **GER-01** | Pesquisa, Filtro por Datas e Paginação em **Minhas Reservas** | Locatário | 1. Acessar `/app/minhas-reservas`.<br>2. Pesquisar pelo nome da sala, unidade, data ou observação.<br>3. Filtrar por período `De` / `Até`.<br>4. Navegar pela paginação. | Lista filtra corretamente, exibe contador de registros e pagina de 10 em 10 itens. | [ ] |
| **GER-02** | Filtros Combinados em **Todas as Reservas** | Admin | 1. Acessar `/app/reservas`.<br>2. Filtrar por Unidade, Sala, Profissional, Status, Tipo (`Hora avulsa`, `Hora fixa`, `Turno`, `Reserva Especial`) e intervalo `De` / `Até`. | Listagem reflete exatamente a combinação de filtros selecionada. | [ ] |
| **GER-03** | Seleção e Exclusão em Lote | Admin | 1. Em `/app/reservas`, marcar o checkbox de 2 ou mais reservas (ou clicar em *Selecionar todas*).<br>2. Clicar em **Excluir N selecionada(s)** e confirmar. | Todas as reservas selecionadas são removidas com sucesso. | [ ] |

---

## Módulo 9: Histórico de Auditoria (`/app/auditoria`)

| ID | Cenário de Teste | Perfil | Passos para Execução | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **AUD-01** | Rastreio de **Quem Fez a Reserva** vs **Quem Aprovou** | Admin | 1. Realizar uma solicitação de reserva com um Locatário.<br>2. Aprovar essa reserva com um Admin.<br>3. Acessar **Histórico de Auditoria** (`/app/auditoria`).<br>4. Localizar o registro de `Aprovação Reserva` e clicar na linha para abrir o modal de detalhes. | Na tabela e no modal de detalhes devem constar claramente:<br>• **Quem fez a reserva (Reservado por):** Nome e e-mail do Locatário.<br>• **Quem aprovou (Aprovado por):** Nome e e-mail do Admin.<br>• **Local, Data/Horário e Status resultante**. | [ ] |
| **AUD-02** | Classificação Correta das Badges de Ação | Admin | 1. Verificar os registros gerados após: solicitar reserva, criar reserva especial, aprovar, rejeitar, solicitar cancelamento, cancelar, reagendar, criar/editar feriado e ativar/inativar usuário. | Cada operação exibe sua badge específica (`Solicitação Reserva`, `Reserva Especial (Admin)`, `Aprovação Reserva`, `Rejeição Reserva`, `Solicitação Cancelamento`, `Cancelamento Reserva`, `Alteração / Reagendamento`, `Gestão de Feriado`, `Ativação/Inativação Usuário`). | [ ] |
| **AUD-03** | Não gravação de erros `4xx` / `5xx` na Auditoria | Ambos | 1. Tentar forçar um erro de validação (ex: tentar cancelar reserva sem permissão ou criar feriado sem nome).<br>2. Consultar `/app/auditoria`. | Tentativas barradas com erro `400`/`403` **não** devem gerar registros sujos ou com `ID: null` no histórico de auditoria. | [ ] |
| **AUD-04** | Filtros de Auditoria (Busca, Tipo de Recurso e Ação) | Admin | 1. Em `/app/auditoria`, filtrar por Recurso (`Reservas`, `Usuários`, `Salas`, `Unidades`, `Feriados`).<br>2. Filtrar por Ação específica.<br>3. Pesquisar pelo nome do profissional que reservou ou pelo nome do admin que aprovou. | A busca encontra os registros tanto pelo ator quanto pelo profissional titular/aprovador contido nos detalhes, com paginação server-side funcionando. | [ ] |

---

## Módulo 10: Verificação de Performance (Banco Remoto / VPS)

| ID | Cenário de Teste | Perfil | Passos para Execução | Resultado Esperado | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **PERF-01** | Tempo de resposta na listagem de Reservas (`/reservations/readAll`) | Ambos | 1. Abrir a aba *Network* (Rede) do navegador (F12).<br>2. Acessar `/app/agenda`, `/app/minhas-reservas` ou `/app/aprovacoes`. | A requisição `GET /reservations/readAll` deve responder rapidamente (sem efeito N+1 de salas e sem trafegar strings Base64 de comprovantes na listagem). | [ ] |
| **PERF-02** | Tempo de resposta ao Criar/Reagendar Reserva e Cadastrar Feriado | Ambos | 1. Criar ou reagendar uma reserva.<br>2. Criar um feriado em data com reservas. | A validação de conflitos (`hasConflict`) e a transição de feriados consultam apenas a sala/data alvo no banco, respondendo em menos de 1 segundo e sem disparar chamadas redundantes de `GET /rooms/readAll`. | [ ] |
