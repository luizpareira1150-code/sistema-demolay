# Plano técnico: paginação global de `demolay_attendance`

## 1. RESUMO EXECUTIVO

A correção fica restrita à leitura de `demolay_attendance` dentro de `downloadSupabaseToLocal()`. Um helper pequeno executará páginas de 500 linhas com ordem ascendente por `id`; uma função de domínio montará cada consulta de attendance e devolverá o mesmo `Attendance[]` completo. Apenas depois de todas as páginas passarem por validação o fluxo atual converterá, salvará e publicará os dados.

## 2. CONFIRMAÇÃO DO ESCOPO

Será alterada somente a forma de obter as linhas de `demolay_attendance` em `src/utils/supabaseService.ts`.

Não serão alterados schema, índices, RLS, Max Rows, triggers, subscriptions, DELETE + INSERT, regras de presença, ranking, ficha, formatos de cache, seleção de gestão ou filtros por período. Em particular, a primeira correção não aplicará `.eq('management_term_id', ...)` à leitura central.

## 3. ARQUITETURA ESCOLHIDA

Será usada a combinação de helper pequeno mais função de domínio:

- `fetchPaginatedRows<T>`: mecanismo interno que recebe uma função de carregar uma página e um extrator de `id`; controla faixa, acúmulo, erro, duplicidade e limite defensivo.
- `fetchAllAttendance`: função privada de domínio que define `demolay_attendance`, `select('*')`, `order('id', { ascending: true })` e chama o helper.

Essa divisão mantém a consulta Supabase e a decisão de domínio em um único arquivo, sem uma abstração genérica para o projeto inteiro. A assinatura pública de `downloadSupabaseToLocal()` permanece inalterada.

## 4. FLUXO ATUAL

```text
Supabase
→ demolay_attendance.select('*') sem ordem
→ attendancesRes.data possivelmente truncado
→ mapeamento para Attendance[]
→ saveAttendances(localStorage)
→ estado global de App
→ AttendancePage, ranking, relatórios, perfil e página pública
```

O cache é escrito nas linhas 568–576 de `src/utils/supabaseService.ts`, depois das consultas. O problema é que o retorno truncado não é erro para o Supabase e chega a esse ponto como se fosse integral.

## 5. FLUXO PROPOSTO

```text
Supabase
→ páginas ordenadas de attendance
→ validação de cada página, IDs e conclusão
→ Attendance[] integral em memória
→ mapeamento atual
→ cache e estado atuais
→ mesmos consumidores sem alteração
```

Não haverá filtro remoto por gestão. Ranking público, filtros temporais e histórico continuarão recebendo o conjunto global que recebem hoje, apenas sem o truncamento.

## 6. ARQUIVOS QUE SERÃO ALTERADOS

| Arquivo | Motivo | Risco |
|---|---|---|
| `src/utils/supabaseService.ts` | Criar o carregador paginado de attendance e usá-lo no download central | Médio-baixo: é o único ponto que produz o array compartilhado; o retorno e o mapeamento devem permanecer iguais |

Não há motivo técnico para alterar `App.tsx`, `AttendancePage.tsx`, `calculations.ts`, `MemberProfileModal.tsx` ou `RealtimeContext.tsx` nesta mudança. Todos recebem ou interpretam `Attendance[]` e não precisam saber como ele foi carregado.

## 7. FUNÇÕES QUE SERÃO ALTERADAS

### `downloadSupabaseToLocal`

- **Atual:** executa `supabase.from(ATTENDANCES).select('*')` uma vez e mapeia `attendancesRes.data`.
- **Novo:** solicita o array completo à função privada `fetchAllAttendance`; somente esse array validado será mapeado e persistido junto das demais tabelas.
- **Assinatura antes/depois:** permanece `Promise<{ success: boolean; message: string; data?: ... }>`; não há mudança de consumidor.

O restante das consultas da função não muda nesta proposta.

## 8. FUNÇÕES NOVAS

### `fetchPaginatedRows<T>`

- **Responsabilidade:** carregar sequencialmente páginas estáveis e produzir uma lista integral ou lançar erro.
- **Parâmetros conceituais:** função `loadPage(from, to)`, `pageSize`, `getId(row)` e limite máximo de páginas.
- **Retorno:** `Promise<T[]>` somente quando todas as páginas forem bem-sucedidas.
- **Erros:** falha do Supabase, página excedendo o tamanho previsto, ID vazio/duplicado ou estouro do limite defensivo. Nenhum desses casos retorna lista parcial.

### `fetchAllAttendance`

- **Responsabilidade:** encapsular a query de domínio de attendance sem expor paginação aos consumidores.
- **Parâmetros:** nenhum nesta primeira versão, pois a leitura precisa preservar o escopo global atual.
- **Retorno:** `Promise<AttendanceRow[]>` com todas as linhas remotas, antes do mapeamento atual para o tipo da aplicação.
- **Erros:** propaga a falha contextualizada para `downloadSupabaseToLocal`.

## 9. ALGORITMO DE PAGINAÇÃO

- **PAGE_SIZE:** 500. É metade do limite padrão relatado de 1.000, deixa margem para configuração e resulta em 3 requisições para 1.207 linhas, 10 para 5.000 e 20 para 10.000.
- **Ordenação:** `.order('id', { ascending: true })`. O schema define `demolay_attendance.id` como chave primária, portanto único e suficiente para uma ordem total determinística. Não foi encontrado consumidor dependente da ordem atual: os usos são `filter`, `some` e `find` por IDs; a restrição única `(eventId, memberId)` sustenta essa premissa.
- **Ranges:** página `n` usa `from = n * 500` e `to = from + 499`; os limites de `.range()` são inclusivos.
- **Término:** uma página vazia encerra; uma página com menos de 500 linhas encerra após ser acumulada. Para totais exatos de 500, 1.000 ou 1.500, a página seguinte vazia confirma o término.
- **Loop defensivo:** contador máximo explícito de 10.000 páginas. Atingi-lo é erro explícito, nunca retorno parcial.
- **Duplicidade:** manter `Set` de IDs enquanto acumula. Qualquer repetição falha a carga; não haverá deduplicação silenciosa.
- **Erro intermediário:** qualquer erro interrompe e é propagado; o array acumulado permanece local à função e é descartado.

As páginas serão sequenciais, não paralelas, para manter previsibilidade e não ampliar a carga contra o Supabase.

## 10. ATOMICIDADE DO CARREGAMENTO

O helper acumula apenas na memória. `fetchAllAttendance` não escreverá cache nem estado. A persistência atual de `saveLocalAttendances(fetchedAttendances)` continuará ocorrendo somente na etapa final de `downloadSupabaseToLocal`, depois que members, events, attendance, users e termos forem todos lidos e mapeados com sucesso.

Se a página 2 falhar, `downloadSupabaseToLocal` retorna `success: false` antes de qualquer `saveLocal*`; o cache completo anterior e o estado React já existente permanecem intactos.

## 11. CONCORRÊNCIA E STALE REQUESTS

Múltiplas requisições da mesma função são possíveis: carga inicial, seleção de gestão, gestão administrativa e sincronização manual usam `downloadSupabaseToLocal()`.

Será usado um contador de geração privado no módulo. Cada execução captura sua geração no início; imediatamente antes de persistir resultados, confirma que ainda é a geração mais recente. Uma resposta superada não escreve `localStorage` nem substitui a carga mais nova e retorna uma falha/resultado explicitamente descartado ao chamador. Essa proteção é pequena, fica no mesmo arquivo e não exige mudar `App.tsx`.

Não será introduzido `AbortController`, mutex global ou snapshot de banco: esses mecanismos aumentariam a superfície da alteração. A paginação cliente não é snapshot transacional; INSERT/DELETE durante a leitura pode ser refletido na próxima sincronização. Esta limitação será mantida como risco residual conhecido.

## 12. COMPATIBILIDADE COM PÁGINAS PÚBLICAS

`PublicRankingPage` recebe `members`, `events` e `attendances` do estado global de `App`. Fora de um período, seleciona a gestão ativa pública; com intervalo de datas, seleciona eventos sem restringir gestão. Como o novo carregador continua global e devolve o mesmo `Attendance[]`, ambos os caminhos continuam semanticamente idênticos, apenas completos.

O mesmo vale para a página pública de perfil: `MemberProfileModal` recebe os arrays já filtrados pela própria página e não conhece a consulta Supabase.

## 13. COMPATIBILIDADE COM RANKING

`RankingPage` e `ReportsPage` filtram em memória por gestão ou por IDs dos eventos do período. `calculateMemberStats` considera um evento finalizado quando encontra uma presença e considera ausente o membro sem registro naquele evento finalizado. Logo, nenhuma regra será alterada; a alteração elimina a entrada incompleta que fazia essas regras trabalharem sobre um subconjunto.

A barreira de deploy será comparar, em uma gestão/período conhecido, posição, porcentagem final, frequência obrigatória, opcionais, justificativas, eventos considerados e desempates. Diferenças só são aceitáveis quando forem explicadas por linhas que antes estavam truncadas.

## 14. COMPATIBILIDADE COM FICHA DOS MEMBROS

`MemberProfileModal` filtra eventos que possuem qualquer attendance e localiza a linha do membro por `(eventId, memberId)`. O carregador não muda esses campos, o mapeamento ou a ordem de eventos exibida — a ficha ordena por data. Ela passa a enxergar os eventos que estavam ausentes por truncamento, sem perder nem duplicar eventos.

## 15. COMPATIBILIDADE COM PRESENÇAS

`AttendancePage` calcula o selo por `attendances.filter(a => a.eventId === ev.id).length > 0`. A regra não será modificada. Ao receber todas as linhas, um evento que possui presença no banco voltará a ser classificado como “Frequência Salva”; evento realmente sem linhas continuará “Pendente”.

O fluxo de salvamento — estado otimista, DELETE por evento, INSERT/UPSERT da lista atual — permanece intacto.

## 16. COMPATIBILIDADE COM GESTÕES E PERÍODOS

As telas administrativas filtram a gestão ativa em memória; ranking, relatórios e ranking público podem trocar para filtros temporais que atravessam gestões. Por isso, a query central continuará sem `.eq('management_term_id', ...)`.

Essa decisão preserva os dados históricos e evita excluir linhas legadas com `management_term_id` nulo ou relações históricas que ainda não tenham sido auditadas. Otimizações por gestão, evento ou membro são propostas futuras independentes.

## 17. REALTIME

Realtime fica fora do escopo. O `RealtimeContext` possui debounce mas não está montado no `App`, e o listener ativo de `App` registra eventos em console sem atualizar o estado compartilhado. A nova leitura paginada não altera subscriptions, debounce ou o padrão DELETE + INSERT. Uma futura integração de Realtime deverá chamar o mesmo carregador paginado, mas não faz parte desta mudança.

## 18. OUTRAS TABELAS

| Classificação | Tabelas | Decisão |
|---|---|---|
| Não alterar agora | `demolay_users`, `management_terms`, health checks | Volume esperado baixo e não há indício de truncamento funcional |
| Monitorar | `demolay_members`, `demolay_events` | São globais e podem crescer, mas não justificam ampliar a correção atual |
| Implementação futura | `audit_logs` | Filtro por gestão já existe; precisará paginação de UI, com ordem estável por `created_at` e `id` |
| Implementação futura | `demolay_event_photos` | Preferir busca por `eventId`, evitando download global de imagens Base64 |
| Risco real imediato | `demolay_attendance` | Única tabela com truncamento confirmado e impacto direto na regra exibida |

## 19. ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1

**Objetivo:** introduzir o helper interno tipado de paginação.

**Arquivo:** `src/utils/supabaseService.ts`.

**Função:** nova `fetchPaginatedRows<T>`.

**Mudança:** implementar ranges inclusivos, acúmulo privado, limite defensivo, propagação de erro e detecção de IDs duplicados.

**Risco:** erro de limite ou término pode causar request extra ou omissão; nenhum consumidor será tocado.

**Validação:** cenários de 0, menor que 500, 500, 1.000, 1.001 e falha de segunda página com carregador controlado/manual.

**Rollback:** remover a função nova, sem migração de dados.

### ETAPA 2

**Objetivo:** especializar a leitura global de attendance.

**Arquivo:** `src/utils/supabaseService.ts`.

**Função:** nova `fetchAllAttendance`.

**Mudança:** aplicar `select('*')`, ordem por `id` e o helper, sem filtro de gestão.

**Risco:** selecionar coluna ou ordem errada; schema confirma `id` como chave primária.

**Validação:** comparar a contagem recebida contra uma contagem exata autorizada pelo Supabase e inspecionar o Network para verificar páginas consecutivas.

**Rollback:** voltar apenas a chamada única existente.

### ETAPA 3

**Objetivo:** conectar o resultado integral ao fluxo de sync com proteção contra stale request.

**Arquivo:** `src/utils/supabaseService.ts`.

**Função:** alterar `downloadSupabaseToLocal`.

**Mudança:** consumir a função de domínio no lugar da consulta direta e descartar geração obsoleta antes de persistir.

**Risco:** mudança acidental de retorno ou escrita antecipada de cache.

**Validação:** simular falha na página 2, duas cargas próximas e comparar `localStorage` antes/depois.

**Rollback:** reverter somente este arquivo; a estrutura `Attendance[]` já persistida é compatível com a versão anterior.

### ETAPA 4

**Objetivo:** validar regressão funcional e build antes de deploy.

**Arquivo:** nenhum arquivo de aplicação adicional.

**Função:** fluxos existentes de attendance, ranking, perfil, público e gestão.

**Mudança:** nenhuma de produto; execução de checklist.

**Risco:** dados já truncados de uma versão anterior mascararem a comparação.

**Validação:** matriz manual descrita neste plano, `npm run lint` e `npm run build`.

**Rollback:** não aplicável.

## 20. IMPLEMENTATION ORDER

1. Confirmar ambiente de teste e registrar baseline de contagem, ranking e fichas.
2. Criar o helper paginado interno.
3. Criar a função privada de leitura global de attendance.
4. Substituir exclusivamente a leitura de attendance dentro de `downloadSupabaseToLocal`.
5. Inserir a proteção de geração antes da persistência.
6. Executar validação de erro/duplicidade/término.
7. Executar validação funcional e build.
8. Somente então aprovar deploy.

## 21. TESTES AUTOMATIZADOS POSSÍVEIS

Não há framework de testes configurado. Não será introduzido Vitest, Jest ou outra infraestrutura nesta mudança. Caso o ambiente já permita executar TypeScript isolado sem nova dependência, o helper puro poderá receber testes pequenos com carregador simulado; caso contrário, a cobertura obrigatória será manual, estática e por Network. Não criar testes é preferível a acoplar esta correção a uma implantação de framework.

## 22. TESTES MANUAIS

- 999, 1.000, 1.001, 1.207 e vários milhares de linhas.
- Página vazia, página final curta e totais exatos de 500, 1.000 e 1.500, confirmando a página vazia seguinte.
- Falha artificial na página 2; confirmar que cache e interface anteriores não foram substituídos.
- ID repetido no carregador controlado; confirmar falha explícita.
- Duas sincronizações quase simultâneas; confirmar que a mais nova é a única persistida.
- Evento que estava pendente apesar de ter linhas; evento realmente vazio; novo evento; salvar e editar frequência; justificativa; membro sem linha em evento finalizado.
- Troca de gestão, reload, logout/login e inspeção de `localStorage`.
- Filtro temporal dentro da gestão e atravessando gestões.
- Páginas públicas sem sessão administrativa.

## 23. VALIDAÇÃO DO RANKING

Antes da mudança, registrar em uma gestão/período conhecido: ordem, porcentagem final, frequência obrigatória, opcionais, justificativas, eventos considerados e histórico de membros representativos. Depois, repetir a coleta. Qualquer divergência não atribuível às linhas antes omitidas bloqueia o deploy.

## 24. VALIDAÇÃO DA FICHA DO MEMBRO

Comparar membros com muitas presenças, faltas, justificativas, eventos antigos e eventos recentes. A ficha deve manter identificação, status, relevância e observação de cada evento, sem duplicação ou mistura de gestão/membro. Eventos antes omitidos pela resposta truncada devem passar a aparecer.

## 25. VALIDAÇÃO DAS PÁGINAS PÚBLICAS

Sem sessão administrativa, validar ranking público da gestão ativa, perfil individual aberto pelo ranking e filtro de datas que englobe eventos de mais de uma gestão. A comparação usa o mesmo baseline funcional, assegurando que a carga global permanece disponível.

## 26. VALIDAÇÃO DA CONTAGEM DE ATTENDANCE

Em ambiente autorizado, obter a contagem exata de `demolay_attendance` por uma consulta de validação com `count: 'exact'` e comparar com `data.attendances.length` após sincronização. Essa verificação é de QA/desenvolvimento, respeita RLS e não deve virar `console.log` permanente de produção. Para 1.207 linhas, ambos os valores devem ser 1.207.

## 27. BUILD / TYPESCRIPT / LINT

Comandos reais já definidos no `package.json`:

- `npm run lint` — executa `tsc --noEmit`.
- `npm run build` — executa `vite build`.

Não há script de lint ESLint nem script de testes automatizados.

## 28. ROLLBACK

1. Reverter exclusivamente as alterações de `src/utils/supabaseService.ts` desta proposta.
2. Não há migration, alteração no banco ou mudança de formato de `Attendance[]`.
3. Não é necessária limpeza de `localStorage`: cache integral criado pela versão nova é compatível com a versão anterior.
4. Reconhecer a limitação: depois do rollback, uma nova sincronização pela versão antiga volta a poder truncar dados. Assim, rollback é recuperação temporária de uma falha nova, não solução sustentável para o defeito original.

## 29. RISCOS RESIDUAIS

| Nível | Risco | Mitigação |
|---|---|---|
| Crítico | Dataset parcial substituir cache | Falhar antes de qualquer persistência |
| Alto | Filtro por gestão eliminar dados históricos | Não aplicar filtro remoto nesta mudança |
| Médio | INSERT/DELETE durante páginas não forma snapshot | Ordem estável, próxima sincronização e manter Realtime fora do escopo |
| Médio | Resposta obsoleta sobrescrever resposta nova | Geração privada antes de persistir |
| Baixo | Ordenação mudar comportamento oculto | Auditoria confirmou consumidores baseados em IDs, não em ordem |
| Baixo | Maior número de requests para muitos registros | Página de 500, sequência simples e escopo global intencional |

## 30. CRITÉRIOS DE APROVAÇÃO PARA IMPLEMENTAÇÃO

- A proposta continua limitada a `src/utils/supabaseService.ts`.
- Não contém filtro remoto por `management_term_id`.
- Mantém assinatura e formato `Attendance[]`.
- Especifica ordem por `id`, paginação inclusiva, página seguinte para total exato, duplicidade, erro e limite defensivo.
- Garante que cache/estado não recebem dataset parcial ou stale.
- Possui baseline de ranking, ficha e páginas públicas para comparação.
- `npm run lint` e `npm run build` estiverem previstos como gates posteriores.

## 31. VEREDITO FINAL DO PLANO

**PLANO SEGURO COM RESSALVAS.**

A mudança é mínima, transparente aos consumidores e preserva a leitura global exigida pelas páginas públicas e períodos históricos. As ressalvas são inerentes à paginação por múltiplas requisições — não há snapshot transacional — e à ausência de testes automatizados. As proteções de atomicidade, geração, validação de IDs e checklist de regressão reduzem esses riscos sem ampliar o escopo para Realtime, banco ou filtros por gestão.
