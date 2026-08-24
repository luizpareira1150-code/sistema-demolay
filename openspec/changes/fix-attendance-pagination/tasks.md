## 1. Baseline e preparação

- [ ] 1.1 Registrar contagem autorizada de `demolay_attendance` e baseline de ranking, ficha e páginas públicas. → Verificar: conjunto conhecido documentado antes do código.
- [ ] 1.2 Confirmar que o escopo permanece global, sem filtro remoto por gestão. → Verificar: revisão da query proposta.

## 2. Implementação

- [ ] 2.1 Criar helper privado tipado para buscar páginas, encerrar corretamente e falhar em erro/ID duplicado/limite defensivo. → Verificar: cenários controlados de 0, 500, 501 e erro intermediário.
- [ ] 2.2 Criar função privada de domínio para buscar toda attendance ordenada por `id`. → Verificar: Network mostra faixas consecutivas de 500 e nenhuma query com `management_term_id`.
- [ ] 2.3 Substituir somente a consulta global de attendance em `downloadSupabaseToLocal()` e proteger persistência contra resposta stale. → Verificar: assinatura pública e formato `Attendance[]` inalterados; cache anterior sobrevive à falha.

## 3. Validação

- [ ] 3.1 Comparar a contagem carregada com `count: 'exact'` em ambiente autorizado. → Verificar: ambos os totais coincidem para 999, 1.000, 1.001 e 1.207+ linhas.
- [ ] 3.2 Executar matriz funcional de presenças, gestão, períodos, ranking, ficha e páginas públicas. → Verificar: diferenças apenas para dados antes truncados.
- [ ] 3.3 Executar `npm run lint` e `npm run build`. → Verificar: ambos finalizam com sucesso.

## 4. Decisão de deploy

- [ ] 4.1 Aprovar somente após todas as validações e decidir rollback conforme `design.md`. → Verificar: nenhum estado parcial, regressão de ranking ou perda de histórico identificada.
