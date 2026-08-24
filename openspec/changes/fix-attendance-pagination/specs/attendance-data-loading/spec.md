## ADDED Requirements

### Requirement: Carregamento global completo de presenças

O sistema SHALL carregar todas as linhas visíveis de `demolay_attendance` para o fluxo de sincronização global, sem restringi-las por `management_term_id`, e SHALL entregar o resultado no formato existente `Attendance[]`.

#### Scenario: Conjunto acima do limite de uma resposta

- **WHEN** a tabela possuir mais linhas visíveis que o tamanho de página configurado
- **THEN** o carregador SHALL solicitar páginas consecutivas até confirmar o término
- **AND** o array entregue aos consumidores SHALL conter todas as linhas carregadas

#### Scenario: Período histórico entre gestões

- **WHEN** uma página pública ou de ranking filtrar eventos por um período que atravessa gestões
- **THEN** o fluxo SHALL continuar recebendo as presenças globais necessárias para filtrar por IDs de evento em memória

### Requirement: Ordenação e término determinísticos

O sistema SHALL ordenar as páginas de `demolay_attendance` por `id` ascendente antes de aplicar faixas inclusivas e SHALL verificar uma página adicional vazia quando o total for múltiplo exato do tamanho de página.

#### Scenario: Total múltiplo do tamanho de página

- **WHEN** houver exatamente 500, 1.000 ou 1.500 linhas visíveis
- **THEN** o carregador SHALL consultar a faixa seguinte
- **AND** SHALL encerrar somente quando essa faixa retornar vazia

#### Scenario: Página final curta

- **WHEN** a última página retornar menos linhas que o tamanho de página
- **THEN** o carregador SHALL incluir essas linhas e encerrar sem outra dependência de ordem não determinística

### Requirement: Integridade atômica da sincronização de presenças

O sistema SHALL tratar qualquer erro de página, duplicidade inesperada de `id` ou excedente do limite defensivo como falha de sincronização e SHALL NOT persistir um dataset parcial de attendance.

#### Scenario: Erro em página intermediária

- **WHEN** uma página após a primeira retornar erro
- **THEN** a sincronização SHALL falhar
- **AND** o cache e o estado completos anteriores SHALL permanecer inalterados

#### Scenario: ID inesperadamente duplicado

- **WHEN** duas páginas retornarem o mesmo `id`
- **THEN** a sincronização SHALL sinalizar inconsistência
- **AND** SHALL NOT remover a linha silenciosamente nem publicar o conjunto parcial

### Requirement: Prevenção de persistência stale

O sistema SHALL impedir que o resultado de uma execução antiga de sincronização substitua o resultado de uma execução mais recente iniciada no mesmo cliente.

#### Scenario: Duas cargas concorrentes

- **WHEN** uma segunda sincronização iniciar antes de a primeira concluir
- **THEN** somente a execução mais recente SHALL poder persistir seus resultados
- **AND** a execução superada SHALL NOT sobrescrever o cache local
