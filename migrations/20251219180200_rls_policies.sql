-- ============================================================================
-- PostgreSQL Row Level Security (RLS) for Multi-Tenant Data Isolation
-- ============================================================================
-- This migration enables RLS on tenant-scoped tables and creates policies
-- that enforce data isolation at the database level.
--
-- The policies use session variables set by the application middleware:
-- - rls.org_id: The current organization context
-- 
-- This provides defense-in-depth: even if application code has bugs,
-- the database will never return rows from a different organization.
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON TENANT-SCOPED TABLES
-- ============================================================================
-- Note: RLS is deny-by-default once enabled. Superusers bypass RLS.

-- Projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

-- Custom fields table
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields FORCE ROW LEVEL SECURITY;

-- Project templates table (nullable org_id for public templates)
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates FORCE ROW LEVEL SECURITY;

-- Dashboard widgets table
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets FORCE ROW LEVEL SECURITY;

-- Notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- Async jobs table
ALTER TABLE async_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE async_jobs FORCE ROW LEVEL SECURITY;

-- Organization members (special policy - users can see their own memberships)
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members FORCE ROW LEVEL SECURITY;

-- Organization invitations
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR PROJECTS
-- ============================================================================
-- Enforces that users can only access projects within their current organization

DROP POLICY IF EXISTS projects_org_isolation ON projects;
CREATE POLICY projects_org_isolation ON projects
  FOR ALL
  USING (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar)
  WITH CHECK (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar);

-- ============================================================================
-- RLS POLICIES FOR CUSTOM FIELDS
-- ============================================================================

DROP POLICY IF EXISTS custom_fields_org_isolation ON custom_fields;
CREATE POLICY custom_fields_org_isolation ON custom_fields
  FOR ALL
  USING (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar)
  WITH CHECK (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar);

-- ============================================================================
-- RLS POLICIES FOR PROJECT TEMPLATES
-- ============================================================================
-- Allow access to templates in current org OR public templates (null org_id)

DROP POLICY IF EXISTS project_templates_org_isolation ON project_templates;
CREATE POLICY project_templates_org_isolation ON project_templates
  FOR SELECT
  USING (
    organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar
    OR (is_public = TRUE AND organization_id IS NULL)
  );

DROP POLICY IF EXISTS project_templates_org_insert ON project_templates;
CREATE POLICY project_templates_org_insert ON project_templates
  FOR INSERT
  WITH CHECK (
    organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar
    OR organization_id IS NULL
  );

DROP POLICY IF EXISTS project_templates_org_update ON project_templates;
CREATE POLICY project_templates_org_update ON project_templates
  FOR UPDATE
  USING (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar)
  WITH CHECK (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar);

DROP POLICY IF EXISTS project_templates_org_delete ON project_templates;
CREATE POLICY project_templates_org_delete ON project_templates
  FOR DELETE
  USING (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar);

-- ============================================================================
-- RLS POLICIES FOR DASHBOARD WIDGETS
-- ============================================================================

DROP POLICY IF EXISTS dashboard_widgets_org_isolation ON dashboard_widgets;
CREATE POLICY dashboard_widgets_org_isolation ON dashboard_widgets
  FOR ALL
  USING (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar)
  WITH CHECK (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar);

-- ============================================================================
-- RLS POLICIES FOR NOTIFICATIONS
-- ============================================================================

DROP POLICY IF EXISTS notifications_org_isolation ON notifications;
CREATE POLICY notifications_org_isolation ON notifications
  FOR ALL
  USING (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar)
  WITH CHECK (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar);

-- ============================================================================
-- RLS POLICIES FOR ASYNC JOBS
-- ============================================================================

DROP POLICY IF EXISTS async_jobs_org_isolation ON async_jobs;
CREATE POLICY async_jobs_org_isolation ON async_jobs
  FOR ALL
  USING (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar)
  WITH CHECK (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar);

-- ============================================================================
-- RLS POLICIES FOR ORGANIZATION MEMBERS
-- ============================================================================
-- Users can see memberships for their current organization

DROP POLICY IF EXISTS org_members_isolation ON organization_members;
CREATE POLICY org_members_isolation ON organization_members
  FOR ALL
  USING (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar)
  WITH CHECK (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar);

-- ============================================================================
-- RLS POLICIES FOR ORGANIZATION INVITATIONS
-- ============================================================================

DROP POLICY IF EXISTS org_invitations_isolation ON organization_invitations;
CREATE POLICY org_invitations_isolation ON organization_invitations
  FOR ALL
  USING (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar)
  WITH CHECK (organization_id = NULLIF(current_setting('rls.org_id', TRUE), '')::varchar);

-- ============================================================================
-- SPECIAL BYPASS ROLE FOR ADMINISTRATIVE OPERATIONS
-- ============================================================================
-- Create a role that bypasses RLS for administrative operations
-- This should be used sparingly and only for cross-tenant admin tasks

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_admin') THEN
    CREATE ROLE rls_admin NOINHERIT;
  END IF;
END
$$;

-- Grant the rls_admin role to bypass RLS on all tables
ALTER TABLE projects OWNER TO rls_admin;
ALTER TABLE custom_fields OWNER TO rls_admin;
ALTER TABLE project_templates OWNER TO rls_admin;
ALTER TABLE dashboard_widgets OWNER TO rls_admin;
ALTER TABLE notifications OWNER TO rls_admin;
ALTER TABLE async_jobs OWNER TO rls_admin;
ALTER TABLE organization_members OWNER TO rls_admin;
ALTER TABLE organization_invitations OWNER TO rls_admin;

-- Reset ownership to current user but grant usage
DO $$
DECLARE
  current_owner text;
BEGIN
  SELECT current_user INTO current_owner;
  
  -- Reset ownership
  EXECUTE format('ALTER TABLE projects OWNER TO %I', current_owner);
  EXECUTE format('ALTER TABLE custom_fields OWNER TO %I', current_owner);
  EXECUTE format('ALTER TABLE project_templates OWNER TO %I', current_owner);
  EXECUTE format('ALTER TABLE dashboard_widgets OWNER TO %I', current_owner);
  EXECUTE format('ALTER TABLE notifications OWNER TO %I', current_owner);
  EXECUTE format('ALTER TABLE async_jobs OWNER TO %I', current_owner);
  EXECUTE format('ALTER TABLE organization_members OWNER TO %I', current_owner);
  EXECUTE format('ALTER TABLE organization_invitations OWNER TO %I', current_owner);
END
$$;

-- ============================================================================
-- HELPER FUNCTION TO GET CURRENT ORGANIZATION
-- ============================================================================

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS varchar AS $$
BEGIN
  RETURN NULLIF(current_setting('rls.org_id', TRUE), '')::varchar;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- COMMENT DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY projects_org_isolation ON projects IS 
  'Enforces organization-level data isolation for projects';

COMMENT ON POLICY custom_fields_org_isolation ON custom_fields IS 
  'Enforces organization-level data isolation for custom fields';

COMMENT ON POLICY dashboard_widgets_org_isolation ON dashboard_widgets IS 
  'Enforces organization-level data isolation for dashboard widgets';

COMMENT ON POLICY notifications_org_isolation ON notifications IS 
  'Enforces organization-level data isolation for notifications';

COMMENT ON POLICY async_jobs_org_isolation ON async_jobs IS 
  'Enforces organization-level data isolation for async jobs';

COMMENT ON FUNCTION current_org_id() IS 
  'Returns the current organization ID from the session context. Used by RLS policies.';

