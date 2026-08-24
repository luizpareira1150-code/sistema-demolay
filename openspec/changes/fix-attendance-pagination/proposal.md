# Change: Paginar o carregamento global de presenças

## Why

`downloadSupabaseToLocal()` lê `demolay_attendance` em uma única consulta sem ordenação ou paginação. Quando a resposta excede o limite de linhas do Supabase, o retorno truncado é aceito como completo e substitui o cache local. Isso faz eventos com registros omitidos aparecerem como pendentes e compromete ranking, relatórios e ficha individual.

## What Changes

- Adicionar carregamento paginado, ordenado e completo exclusivamente para `demolay_attendance`.
- Manter a semântica de leitura global e o retorno `Attendance[]` consumido hoje pelas telas.
- Recusar dados incompletos, páginas com erro e duplicidade inesperada de identificador sem substituir estado ou `localStorage`.
- Proteger a persistência contra uma resposta antiga que conclua depois de uma carga mais recente.
- Documentar validação manual e rollback sem introduzir framework de testes, mudanças de banco, RLS ou Realtime.

## Impact

- Affected specs: `attendance-data-loading` (nova capacidade documentada).
- Affected code: `src/utils/supabaseService.ts`, especialmente `downloadSupabaseToLocal()`.
- Unchanged code: `src/App.tsx`, `src/pages/AttendancePage.tsx`, `src/utils/calculations.ts`, `src/components/MemberProfileModal.tsx`, `src/contexts/RealtimeContext.tsx`, schema e políticas do Supabase.
- Breaking changes: nenhuma. O formato persistido e entregue continua sendo `Attendance[]`.
