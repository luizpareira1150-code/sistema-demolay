-- ====================================================================
-- ESTRUTURA DE BANCO DE DADOS E SEGURANÇA INICIAL: AUDITORIA (audit_logs)
-- Painel de Avaliação DeMolay - Histórico de Ações do Sistema
-- ====================================================================

-- 1. APAGAR TABELA ANTIGA SE JÁ EXISTIR (Para garantir a migração completa para a nova estrutura de colunas)
DROP TABLE IF EXISTS "audit_logs" CASCADE;

-- 2. CRIAR TABELA DE AUDITORIA
CREATE TABLE "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Gestão relacionada à ação
    "management_term_id" UUID REFERENCES "management_terms"("id") ON DELETE SET NULL,
    
    -- Identificação do usuário que realizou a ação
    "user_id" UUID REFERENCES auth.users("id") ON DELETE SET NULL,
    "user_name" TEXT,
    "user_role" TEXT,
    
    -- Detalhes da ação e entidade afetada
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "entity_name" TEXT,
    
    -- Descrição amigável para leitura humana
    "description" TEXT NOT NULL,
    
    -- Snapshots de dados para auditoria detalhada
    "old_data" JSONB,
    "new_data" JSONB,
    "metadata" JSONB,
    
    -- Registro do momento da ação
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CRIAR ÍNDICES DE DESEMPENHO PARA CONSULTAS E FILTROS rápidos
CREATE INDEX IF NOT EXISTS "idx_audit_logs_management_term_id" 
ON "audit_logs"("management_term_id");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" 
ON "audit_logs"("user_id");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" 
ON "audit_logs"("action");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_type" 
ON "audit_logs"("entity_type");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" 
ON "audit_logs"("created_at" DESC);

-- ====================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) PARA "audit_logs"
-- ====================================================================

-- Habilitar RLS na tabela de auditoria
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Limpar quaisquer políticas legadas que possam existir
DROP POLICY IF EXISTS "audit_logs_select_policy" ON "audit_logs";
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON "audit_logs";
DROP POLICY IF EXISTS "audit_logs_update_policy" ON "audit_logs";
DROP POLICY IF EXISTS "audit_logs_delete_policy" ON "audit_logs";

-- A. LEITURA (SELECT): Apenas Admin e Diretoria Admin podem visualizar
--    - Admin: Acesso total irrestrito aos logs de todas as gestões.
--    - Diretoria Admin: Acesso limitado apenas aos logs da própria gestão.
--    - Diretoria comum e Visualização: Bloqueados (não possuem política de leitura).
CREATE POLICY "audit_logs_select_policy" ON "audit_logs"
  FOR SELECT
  TO authenticated
  USING (
    -- 1. Se o usuário ativo for Administrador (admin)
    (SELECT "role" FROM "profiles" WHERE "id" = auth.uid()) = 'admin'
    OR
    -- 2. Se o usuário ativo for Diretoria Admin (diretoria_admin) pertencente à mesma gestão do log
    (
      (SELECT "role" FROM "profiles" WHERE "id" = auth.uid()) = 'diretoria_admin'
      AND "management_term_id" = (SELECT "management_term_id" FROM "profiles" WHERE "id" = auth.uid())
    )
  );

-- B. INSERÇÃO (INSERT): Qualquer usuário autenticado pode registrar suas próprias ações
CREATE POLICY "audit_logs_insert_policy" ON "audit_logs"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Garante que o user_id gravado no log corresponde estritamente ao UID do usuário autenticado no momento
    "user_id" = auth.uid()
  );

-- C. ATUALIZAÇÃO (UPDATE) E EXCLUSÃO (DELETE): ABSOLUTAMENTE BLOQUEADOS
-- Como habilitamos RLS e NÃO criamos políticas para UPDATE ou DELETE,
-- o PostgreSQL bloqueia inerentemente qualquer tentativa de modificar ou remover logs,
-- garantindo a integridade e imutabilidade dos dados de auditoria (histórico intocável).
