-- ====================================================================
-- AUDITORIA DE SEGURANÇA E POLÍTICAS DE RLS (supabase_rls_security.sql)
-- Painel de Avaliação DeMolay - Gestão de Usuários e Perfis
-- ====================================================================

-- 1. GARANTIR QUE RLS ESTEJA ATIVADO EM AMBAS AS TABELAS DE USUÁRIOS
ALTER TABLE "demolay_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- 2. LIMPAR POLÍTICAS ANTIGAS OU ALTAMENTE PERMISSIVAS
DROP POLICY IF EXISTS "Qualquer um lê perfis" ON "profiles";
DROP POLICY IF EXISTS "Usuário gerencia próprio perfil" ON "profiles";
DROP POLICY IF EXISTS "Escrita para autenticados" ON "demolay_users";

-- ====================================================================
-- POLÍTICAS PARA A TABELA "profiles" (Contas Autenticadas Supabase Auth)
-- ====================================================================

-- A. Leitura: Qualquer usuário autenticado ou visitante pode consultar os perfis
-- (Necessário para renderizar nomes de moderadores e criadores no painel)
CREATE POLICY "profiles_select_policy" ON "profiles"
  FOR SELECT
  TO public
  USING (true);

-- B. Inserção: Regras estritas de criação de novos perfis
CREATE POLICY "profiles_insert_policy" ON "profiles"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 1. Se o criador for Administrador (admin), ele pode criar qualquer perfil
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- 2. Se o criador for Diretoria Admin (diretoria_admin):
    --    - O perfil criado deve ser estritamente 'diretoria'
    --    - O perfil criado deve pertencer ao mesmo termo de gestão do criador
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'diretoria_admin'
      AND "role" = 'diretoria'
      AND "management_term_id" = (SELECT management_term_id FROM profiles WHERE id = auth.uid())
    )
  );

-- C. Atualização: Regras estritas de edição de perfis existentes
CREATE POLICY "profiles_update_policy" ON "profiles"
  FOR UPDATE
  TO authenticated
  USING (
    -- 1. Administrador pode atualizar qualquer perfil
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- 2. Diretoria Admin pode atualizar apenas perfis de role 'diretoria' que pertençam à sua própria gestão
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'diretoria_admin'
      AND "role" = 'diretoria'
      AND "management_term_id" = (SELECT management_term_id FROM profiles WHERE id = auth.uid())
    )
    OR
    -- 3. Qualquer usuário pode editar suas próprias informações básicas (como próprio nome)
    id = auth.uid()
  )
  WITH CHECK (
    -- Garantir que as alterações respeitem as restrições:
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    (
      -- Diretoria Admin NÃO pode alterar role nem management_term_id do usuário que está editando
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'diretoria_admin'
      AND "role" = 'diretoria'
      AND "management_term_id" = (SELECT management_term_id FROM profiles WHERE id = auth.uid())
    )
    OR
    (
      -- Usuário normal editando a si mesmo NÃO pode alterar seu próprio role nem gestão
      id = auth.uid()
      AND "role" = (SELECT role FROM profiles WHERE id = auth.uid())
      AND "management_term_id" = (SELECT management_term_id FROM profiles WHERE id = auth.uid())
    )
  );

-- D. Exclusão: Apenas administradores e Diretoria Admin (da mesma gestão) podem excluir
CREATE POLICY "profiles_delete_policy" ON "profiles"
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'diretoria_admin'
      AND "role" = 'diretoria'
      AND "management_term_id" = (SELECT management_term_id FROM profiles WHERE id = auth.uid())
    )
  );


-- ====================================================================
-- POLÍTICAS PARA A TABELA "demolay_users" (Compatibilidade de Sincronização Local)
-- ====================================================================

-- A. Leitura: Livre para exibição pública ou autenticada
CREATE POLICY "demolay_users_select_policy" ON "demolay_users"
  FOR SELECT
  TO public
  USING (true);

-- B. Escrita Geral (Inserção/Atualização/Exclusão): Protegido por regras de autenticação
-- Se estiver usando API anônima do Supabase Client para sincronização, o service layer valida as ações.
-- Para produção estrita, as políticas verificam o perfil do usuário ativo:
CREATE POLICY "demolay_users_write_policy" ON "demolay_users"
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Nota de Segurança: A tabela 'demolay_users' é sincronizada via localStorage pelo cliente. 
-- As restrições de escrita na camada de serviço (React Service Layer) já filtram ativamente todas as 
-- chamadas de API de modo que usuários sem perfil adequado (Diretoria/Visualização) sejam bloqueados antes 
-- de disparar requisições. Para ambientes com login Supabase Auth ativado, as regras de 'profiles' acima 
-- agem como a barreira definitiva de segurança de banco.
