-- ====================================================================
-- HABILITAÇÃO DO SUPABASE REALTIME E REPLICA IDENTITY
-- Painel de Avaliação DeMolay - Sincronização em Tempo Real
-- ====================================================================

-- 1. CONFIGURAR REPLICA IDENTITY COMO "FULL"
-- Isso garante que, ao excluir (DELETE) ou atualizar (UPDATE) um registro, 
-- o payload antigo (old) enviado pelo Realtime contenha todos os dados dos campos 
-- (incluindo chaves estrangeiras, IDs de gestão, etc.) permitindo filtragem local segura.
ALTER TABLE "demolay_members" REPLICA IDENTITY FULL;
ALTER TABLE "demolay_events" REPLICA IDENTITY FULL;
ALTER TABLE "demolay_attendance" REPLICA IDENTITY FULL;
ALTER TABLE "profiles" REPLICA IDENTITY FULL;
ALTER TABLE "demolay_users" REPLICA IDENTITY FULL;
ALTER TABLE "demolay_event_photos" REPLICA IDENTITY FULL;
ALTER TABLE "management_terms" REPLICA IDENTITY FULL;
ALTER TABLE "audit_logs" REPLICA IDENTITY FULL;

-- 2. RECONSTRUIR A PUBLICAÇÃO DO REALTIME
-- Remove e recria de forma segura a publicação "supabase_realtime" do Supabase
-- incluindo todas as tabelas necessárias no sistema.
DROP PUBLICATION IF EXISTS supabase_realtime;

CREATE PUBLICATION supabase_realtime FOR TABLE 
  "demolay_members", 
  "demolay_events", 
  "demolay_attendance", 
  "profiles", 
  "demolay_users",
  "demolay_event_photos",
  "management_terms", 
  "audit_logs";
