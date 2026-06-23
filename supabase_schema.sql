-- ====================================================================
-- PAINEL DE AVALIAÇÃO DEMOLAY - ESQUEMA DE BANCO DE DADOS (SUPABASE)
-- ====================================================================
-- Este arquivo define a arquitetura, constraints, triggers, índices,
-- políticas de RLS (Row Level Security) e dados semente para o sistema.
-- Execute este script no "SQL Editor" do painel de controle do seu Supabase.

-- --------------------------------------------------------------------
-- 1. EXTENSÕES ÚTEIS
-- --------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- --------------------------------------------------------------------
-- 1.5 TABELA DE GESTÕES/SEMESTRES (management_terms)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "management_terms" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL CHECK ("name" ~ '^[0-9]{4}/[1-2]$'),
  "year" INTEGER NOT NULL,
  "semester" INTEGER NOT NULL CHECK ("semester" IN (1, 2)),
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'archived')),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "management_terms_year_semester_unique" UNIQUE ("year", "semester")
);

-- --------------------------------------------------------------------
-- 2. TABELA DE MEMBROS (demolay_members)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "demolay_members" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'inactive')),
  "joinedAt" TEXT,
  "notes" TEXT,
  "degree" TEXT NOT NULL DEFAULT 'iniciatico' CHECK ("degree" IN ('iniciatico', 'demolay')),
  "isNominata" BOOLEAN NOT NULL DEFAULT false,
  "nominataRole" TEXT,
  "isNominataIniciacao" BOOLEAN NOT NULL DEFAULT false,
  "nominataIniciacaoRole" TEXT,
  "isNominataElevacao" BOOLEAN NOT NULL DEFAULT false,
  "nominataElevacaoRole" TEXT,
  "createdAt" TEXT,
  "management_term_id" UUID REFERENCES "management_terms"("id") ON DELETE SET NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "evaluation_start_date" DATE
);

-- --------------------------------------------------------------------
-- 3. TABELA DE EVENTOS (demolay_events)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "demolay_events" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL CHECK ("category" IN (
    'ritualistica', 
    'terca_burocratica', 
    'quinta_burocratica', 
    'filantropia', 
    'limpeza', 
    'ensaio_iniciacao', 
    'ensaio_elevacao', 
    'outros'
  )),
  "date" TEXT NOT NULL,
  "description" TEXT,
  "requiredFor" JSONB NOT NULL DEFAULT '[]'::jsonb, -- Armazena strings ex: ["iniciatico", "demolay"]
  "optionalFor" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "nominataType" TEXT DEFAULT 'none',
  "createdAt" TEXT,
  "management_term_id" UUID REFERENCES "management_terms"("id") ON DELETE SET NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 4. TABELA DE PRESENÇAS / ATTENDANCE (demolay_attendance)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "demolay_attendance" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "demolay_events"("id") ON DELETE CASCADE,
  "memberId" TEXT NOT NULL REFERENCES "demolay_members"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'absent' CHECK ("status" IN (
    'present', 
    'absent', 
    'justified', 
    'not_attended', 
    'not_applicable'
  )),
  "eligibility" TEXT NOT NULL DEFAULT 'not_applicable' CHECK ("eligibility" IN (
    'required', 
    'optional', 
    'not_applicable'
  )),
  "note" TEXT,
  "createdAt" TEXT,
  "management_term_id" UUID REFERENCES "management_terms"("id") ON DELETE SET NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "demolay_attendance_event_member_unique" UNIQUE ("eventId", "memberId")
);

-- --------------------------------------------------------------------
-- 5. TABELA DE USUÁRIOS COMPATÍVEL COM LOCALSTORAGE (demolay_users)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "demolay_users" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL, -- Senha de login semente
  "role" TEXT NOT NULL DEFAULT 'visualizacao' CHECK ("role" IN ('admin', 'diretoria', 'visualizacao')),
  "management_term_id" UUID REFERENCES "management_terms"("id") ON DELETE SET NULL,
  "created_by" TEXT REFERENCES "demolay_users"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir validações por constraint em novas linhas de demolay_users
ALTER TABLE "demolay_users" DROP CONSTRAINT IF EXISTS "demolay_users_management_term_required_for_diretoria";
ALTER TABLE "demolay_users" ADD CONSTRAINT "demolay_users_management_term_required_for_diretoria"
  CHECK ("role" <> 'diretoria' OR "management_term_id" IS NOT NULL);

-- --------------------------------------------------------------------
-- 6. TABELA DE PERFIS AUTENTICADOS (Supabase Auth profiles)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'visualizacao' CHECK ("role" IN ('admin', 'diretoria', 'visualizacao')),
  "management_term_id" UUID REFERENCES "management_terms"("id") ON DELETE SET NULL,
  "created_by" UUID REFERENCES auth.users("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir validações por constraint em novas linhas de profiles
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_management_term_required_for_diretoria";
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_management_term_required_for_diretoria"
  CHECK ("role" <> 'diretoria' OR "management_term_id" IS NOT NULL);

-- --------------------------------------------------------------------
-- 7. TABELA DE CONFIGURAÇÕES DO SISTEMA (system_settings)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" TEXT PRIMARY KEY DEFAULT 'current',
  "plusWeight" NUMERIC NOT NULL DEFAULT 0.5,
  "greenThreshold" INTEGER NOT NULL DEFAULT 70,
  "yellowThreshold" INTEGER NOT NULL DEFAULT 60,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração padrão semente
INSERT INTO "system_settings" ("id", "plusWeight", "greenThreshold", "yellowThreshold")
VALUES ('current', 0.5, 70, 60)
ON CONFLICT ("id") DO NOTHING;

-- --------------------------------------------------------------------
-- 8. TABELA DE LOGS DE AUDITORIA (audit_logs)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId" TEXT, -- Identificador do autor do evento (Nome, Email ou UUID)
  "action" TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'BULK_SYNC'
  "tableName" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "oldData" JSONB,
  "newData" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 9. TABELA DE COMPROVAÇÃO DE PRESENÇA (FOTOS) (demolay_event_photos)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "demolay_event_photos" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL REFERENCES "demolay_events"("id") ON DELETE CASCADE,
  "photo" TEXT NOT NULL, -- Conteúdo da imagem em Base64 WebP (data:image/webp;base64,...)
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ÍNDICES (Alta Performance de Consulta e Junções)
-- ====================================================================
CREATE INDEX IF NOT EXISTS "idx_members_status" ON "demolay_members"("status");
CREATE INDEX IF NOT EXISTS "idx_members_degree" ON "demolay_members"("degree");
CREATE INDEX IF NOT EXISTS "idx_members_nominata" ON "demolay_members"("isNominata");
CREATE INDEX IF NOT EXISTS "idx_members_evaluation_start_date" ON "demolay_members"("evaluation_start_date");
CREATE INDEX IF NOT EXISTS "idx_events_date" ON "demolay_events"("date");
CREATE INDEX IF NOT EXISTS "idx_events_category" ON "demolay_events"("category");
CREATE INDEX IF NOT EXISTS "idx_attendance_eventId" ON "demolay_attendance"("eventId");
CREATE INDEX IF NOT EXISTS "idx_attendance_memberId" ON "demolay_attendance"("memberId");
CREATE INDEX IF NOT EXISTS "idx_attendance_composite" ON "demolay_attendance"("eventId", "memberId");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "demolay_users"("role");
CREATE INDEX IF NOT EXISTS "idx_profiles_role" ON "profiles"("role");
CREATE INDEX IF NOT EXISTS "idx_event_photos_eventId" ON "demolay_event_photos"("eventId");

-- Novos índices para a Gestão de Semestres
CREATE INDEX IF NOT EXISTS "idx_management_terms_year_semester" ON "management_terms"("year", "semester");
CREATE INDEX IF NOT EXISTS "idx_management_terms_status" ON "management_terms"("status");
CREATE INDEX IF NOT EXISTS "idx_profiles_management_term_id" ON "profiles"("management_term_id");
CREATE INDEX IF NOT EXISTS "idx_members_management_term_id" ON "demolay_members"("management_term_id");
CREATE INDEX IF NOT EXISTS "idx_events_management_term_id" ON "demolay_events"("management_term_id");
CREATE INDEX IF NOT EXISTS "idx_attendance_management_term_id" ON "demolay_attendance"("management_term_id");

-- ====================================================================
-- TRIGGERS DE ATUALIZAÇÃO AUTOMÁTICA (updatedAt/updated_at)
-- ====================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função específica para tabelas que utilizam snake_case (como management_terms)
CREATE OR REPLACE FUNCTION update_updated_at_snake_case_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger em todas as tabelas com updatedAt (Removendo previamente se já existir para garantir idempotência)
DROP TRIGGER IF EXISTS trigger_update_members_timestamp ON "demolay_members";
CREATE TRIGGER trigger_update_members_timestamp BEFORE UPDATE ON "demolay_members"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_events_timestamp ON "demolay_events";
CREATE TRIGGER trigger_update_events_timestamp BEFORE UPDATE ON "demolay_events"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_attendance_timestamp ON "demolay_attendance";
CREATE TRIGGER trigger_update_attendance_timestamp BEFORE UPDATE ON "demolay_attendance"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_users_timestamp ON "demolay_users";
CREATE TRIGGER trigger_update_users_timestamp BEFORE UPDATE ON "demolay_users"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_profiles_timestamp ON "profiles";
CREATE TRIGGER trigger_update_profiles_timestamp BEFORE UPDATE ON "profiles"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_settings_timestamp ON "system_settings";
CREATE TRIGGER trigger_update_settings_timestamp BEFORE UPDATE ON "system_settings"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_management_terms_timestamp ON "management_terms";
CREATE TRIGGER trigger_update_management_terms_timestamp BEFORE UPDATE ON "management_terms"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_snake_case_column();

-- ====================================================================
-- RLS (ROW LEVEL SECURITY) & POLÍTICAS
-- ====================================================================
ALTER TABLE "demolay_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "demolay_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "demolay_attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "demolay_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "demolay_event_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "management_terms" ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar erros de duplicidade ao re-executar
DROP POLICY IF EXISTS "Leitura pública livre" ON "demolay_members";
DROP POLICY IF EXISTS "Leitura pública livre" ON "demolay_events";
DROP POLICY IF EXISTS "Leitura pública livre" ON "demolay_attendance";
DROP POLICY IF EXISTS "Leitura pública livre" ON "system_settings";
DROP POLICY IF EXISTS "Leitura pública livre" ON "demolay_event_photos";
DROP POLICY IF EXISTS "Leitura pública livre" ON "management_terms";

DROP POLICY IF EXISTS "Qualquer um lê perfis" ON "profiles";
DROP POLICY IF EXISTS "Usuário gerencia próprio perfil" ON "profiles";

DROP POLICY IF EXISTS "Escrita para autenticados" ON "demolay_members";
DROP POLICY IF EXISTS "Escrita para autenticados" ON "demolay_events";
DROP POLICY IF EXISTS "Escrita para autenticados" ON "demolay_attendance";
DROP POLICY IF EXISTS "Escrita para autenticados" ON "demolay_users";
DROP POLICY IF EXISTS "Escrita para autenticados" ON "demolay_event_photos";
DROP POLICY IF EXISTS "Escrita para autenticados" ON "management_terms";
DROP POLICY IF EXISTS "Configurações atualizáveis por autenticados" ON "system_settings";
DROP POLICY IF EXISTS "Inserção de LOGS para autenticados" ON "audit_logs";
DROP POLICY IF EXISTS "Visualização de LOGS para autenticados" ON "audit_logs";

-- 1. Políticas de Leitura Pública (Perfeitamente adequadas para a classificação pública `/`)
CREATE POLICY "Leitura pública livre" ON "demolay_members" FOR SELECT USING (true);
CREATE POLICY "Leitura pública livre" ON "demolay_events" FOR SELECT USING (true);
CREATE POLICY "Leitura pública livre" ON "demolay_attendance" FOR SELECT USING (true);
CREATE POLICY "Leitura pública livre" ON "system_settings" FOR SELECT USING (true);
CREATE POLICY "Leitura pública livre" ON "demolay_event_photos" FOR SELECT USING (true);
CREATE POLICY "Leitura pública livre" ON "management_terms" FOR SELECT USING (true);

-- 2. Políticas de perfis e autenticação com Supabase Auth (Se usar login real do Supabase)
CREATE POLICY "Qualquer um lê perfis" ON "profiles" FOR SELECT USING (true);
CREATE POLICY "Usuário gerencia próprio perfil" ON "profiles" FOR ALL TO authenticated USING (auth.uid() = id);

-- 3. Políticas de Escrita Seguras para Operações Administrativas
CREATE POLICY "Escrita para autenticados" ON "demolay_members" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Escrita para autenticados" ON "demolay_events" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Escrita para autenticados" ON "demolay_attendance" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Escrita para autenticados" ON "demolay_users" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Escrita para autenticados" ON "demolay_event_photos" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Escrita para autenticados" ON "management_terms" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Configurações atualizáveis por autenticados" ON "system_settings" FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Inserção de LOGS para autenticados" ON "audit_logs" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Visualização de LOGS para autenticados" ON "audit_logs" FOR SELECT TO authenticated USING (true);

-- EXTRA: Caso queira um fallback de teste temporário para desenvolvimento anônimo onde o usuário local 
-- ainda não fez login via Auth Real (Supabase), você pode rodar temporariamente estas linhas extras:
-- CREATE POLICY "Permitir tudo para anon temporário" ON "demolay_members" FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Permitir tudo para anon temporário" ON "demolay_events" FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Permitir tudo para anon temporário" ON "demolay_attendance" FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Permitir tudo para anon temporário" ON "demolay_users" FOR ALL TO anon USING (true) WITH CHECK (true);

-- ====================================================================
-- 10. MIGRAÇÃO SEGURA DE DADOS EXISTENTES (Caso existam dados antigos sem gestão)
-- ====================================================================
DO $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    current_semester INTEGER;
    term_name TEXT;
    term_start DATE;
    term_end DATE;
    default_term_id UUID;
BEGIN
    -- Determina o ano e o mês correntes
    current_year := EXTRACT(YEAR FROM NOW())::INTEGER;
    current_month := EXTRACT(MONTH FROM NOW())::INTEGER;
    
    -- Define o semestre padrão temporário de acordo com a data atual
    IF current_month <= 6 THEN
        current_semester := 1;
        term_name := current_year || '/1';
        term_start := (current_year || '-01-01')::DATE;
        term_end := (current_year || '-06-30')::DATE;
    ELSE
        current_semester := 2;
        term_name := current_year || '/2';
        term_start := (current_year || '-07-01')::DATE;
        term_end := (current_year || '-12-31')::DATE;
    END IF;

    -- Cria a gestão padrão apenas se não houver nenhuma gestão registrada
    IF NOT EXISTS (SELECT 1 FROM "management_terms" LIMIT 1) THEN
        INSERT INTO "management_terms" ("name", "year", "semester", "start_date", "end_date", "status")
        VALUES (term_name, current_year, current_semester, term_start, term_end, 'active')
        ON CONFLICT ("year", "semester") DO NOTHING;
    END IF;

    -- Obtém o ID da gestão ativa ou cadastrada
    SELECT "id" INTO default_term_id 
    FROM "management_terms" 
    ORDER BY "created_at" ASC -- Pega a mais antiga/primeira cadastrada como padrão para herança de legados
    LIMIT 1;

    -- Se encontramos um ID válido, migramos os registros orfãos
    IF default_term_id IS NOT NULL THEN
        UPDATE "demolay_members" SET "management_term_id" = default_term_id WHERE "management_term_id" IS NULL;
        UPDATE "demolay_events" SET "management_term_id" = default_term_id WHERE "management_term_id" IS NULL;
        UPDATE "demolay_attendance" SET "management_term_id" = default_term_id WHERE "management_term_id" IS NULL;
        UPDATE "profiles" SET "management_term_id" = default_term_id WHERE "management_term_id" IS NULL;
    END IF;
END $$;

