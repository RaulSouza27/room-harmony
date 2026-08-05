# Room Harmony

# Instrução para criação de frontend — Sistema de Gestão de Salas para Clínica de Psicologia

## 1. Contexto e objetivo

Crie o frontend de um sistema web para gestão de salas de uma clínica de psicologia com múltiplas unidades. O sistema relaciona **profissionais (psicólogos)** e **salas**, permitindo que psicólogos solicitem o uso de uma sala em uma unidade e horário específicos, e que um administrador aprove, negue ou gerencie essas reservas.

Stack sugerida (ajuste se já tiver preferência): React + TypeScript, Tailwind CSS, React Router, componentes de UI tipo shadcn/ui, gerenciamento de estado com React Query (para simular chamadas de API) ou Zustand. Se ainda não houver backend, use mocks/local storage estruturados para simular a API — mas desenhe as chamadas como se fossem para uma API REST real, para facilitar a integração futura.

## 2. Autenticação e papéis de usuário

- Tela de login (email + senha). Sem cadastro público — usuários são criados pelo administrador.

- Dois papéis, com rotas e menus totalmente diferentes:

  - **PSICÓLOGO**: acesso restrito às próprias solicitações e à visualização de disponibilidade.

  - **ADMINISTRADOR**: acesso total ao sistema.

- Após login, redirecionar para o dashboard correspondente ao papel.

- Proteger rotas por papel (guard/middleware de rota no frontend).

## 3. Entidades principais (modelo de dados)

- **Usuário**: id, nome, email, senha (hash), papel (psicólogo/administrador), status (ativo/inativo), telefone, especialidade (opcional), unidades vinculadas (opcional).

- **Unidade**: id, nome, endereço, status (ativa/inativa).

- **Sala**: id, nome/número, unidade_id, capacidade, recursos (ex: maca, ar-condicionado, blackout), status (ativa/em manutenção/inativa).

- **Reserva**: id, sala_id, unidade_id, profissional_id, data, hora_início, hora_fim, status (pendente, aprovada, negada, cancelada), criado_em, observações, motivo_negação (opcional), aprovado_por (id admin), recorrência (opcional: única, semanal, etc.).

## 4. Funcionalidades — Perfil PSICÓLOGO

1. **Dashboard**: resumo das minhas próximas reservas aprovadas e pendentes.

2. **Consultar disponibilidade**:

   - Filtrar por unidade e data/período.

   - Visualização tipo grade/agenda (colunas = salas, linhas = horários) mostrando livre/ocupado/pendente.

   - Visualização alternativa em lista, para telas menores.

3. **Solicitar reserva**:

   - Selecionar unidade → sala → data → horário início/fim → observação opcional.

   - Validação de conflito de horário no próprio frontend antes de enviar (feedback imediato).

   - Envio cria reserva com status "pendente".

4. **Minhas reservas**:

   - Lista/histórico com filtro por status (pendente, aprovada, negada, cancelada).

   - Poder cancelar uma reserva própria que ainda não ocorreu.

   - Ver motivo caso tenha sido negada.

5. **Perfil**: editar dados próprios básicos (telefone, foto) — não pode alterar papel nem unidades vinculadas.

## 5. Funcionalidades — Perfil ADMINISTRADOR

1. **Dashboard**: métricas gerais (reservas pendentes de aprovação, taxa de ocupação por unidade, salas mais usadas).

2. **CRUD de Profissionais**: listar, criar, editar, ativar/inativar, definir unidades de acesso.

3. **CRUD de Salas**: listar, criar, editar, definir unidade, capacidade, recursos, status.

4. **CRUD de Unidades** (recomendado incluir, mesmo não pedido explicitamente, já que salas dependem de unidade).

5. **Aprovação de reservas**:

   - Fila de reservas pendentes, com dados do profissional, sala, unidade, data/horário.

   - Aprovar ou negar (negar exige motivo).

   - Notificação/indicador visual de pendências novas.

6. **Gestão completa de reservas**:

   - Ver todas as reservas (de todos os profissionais), com filtros por unidade, sala, profissional, status, período.

   - Editar horário de uma reserva existente.

   - Deletar/cancelar qualquer reserva.

   - Criar reserva manualmente em nome de um profissional (útil para bloqueios administrativos, manutenção etc.).

7. **Visão de agenda geral**: mesma grade de disponibilidade do psicólogo, mas com todas as salas de todas as unidades e ações diretas (aprovar/editar/cancelar) a partir da própria grade.

## 6. Regras de negócio importantes

- Não permitir duas reservas aprovadas com sobreposição de horário na mesma sala.

- Reserva "pendente" reserva o horário provisoriamente (aparece como "pendente" na grade, não como "livre"), para evitar duas solicitações conflitantes simultâneas.

- Ao aprovar uma reserva, se houver outras pendentes conflitantes no mesmo horário/sala, o sistema deve alertar o administrador.

- Psicólogo só vê/solicita salas das unidades às quais tem acesso (se essa regra for aplicada).

- Todas as ações críticas (aprovar, negar, deletar, editar horário) devem ter confirmação (modal) antes de executar.

## 7. Telas necessárias (resumo)

- Login

- Dashboard Psicólogo

- Grade de Disponibilidade (compartilhada, com permissões diferentes)

- Formulário de Solicitação de Reserva

- Minhas Reservas (psicólogo)

- Dashboard Administrador

- Profissionais (lista + form de criação/edição)

- Salas (lista + form de criação/edição)

- Unidades (lista + form de criação/edição)

- Aprovações Pendentes

- Todas as Reservas (com filtros e ações)

- Perfil do usuário logado

## 8. Requisitos de UX/UI

- Interface limpa, profissional, cores neutras/suaves (ambiente de saúde) — evitar excesso de cor.

- Grade de disponibilidade precisa ser o componente mais bem cuidado: cores claras para livre/ocupado/pendente, responsiva, boa leitura em mobile.

- Menu lateral (admin, mais opções) e menu simplificado (psicólogo).

- Estados vazios, de carregamento e de erro tratados em todas as listagens.

- Feedback visual imediato (toasts) após ações como aprovar, negar, criar, cancelar.

## 9. Entregável esperado

Estrutura de projeto organizada por: `pages/`, `components/`, `hooks/`, `services` (chamadas de API mockadas), `types/` (interfaces das entidades acima), `contexts/` ou `store/` (autenticação e papel do usuário). Comece pela autenticação e pela grade de disponibilidade, pois são o núcleo do produto; depois construa os CRUDs administrativos.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3e4c69e9-dc54-4f77-ac41-f7cd9f8b1eb8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
