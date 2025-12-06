-- Simplify RLS policies for demo (no authentication required)
-- use these for demo
DROP POLICY IF EXISTS leads_select_policy ON leads;
CREATE POLICY leads_select_policy ON leads FOR SELECT USING (true);

DROP POLICY IF EXISTS applications_select_policy ON applications;
CREATE POLICY applications_select_policy ON applications FOR SELECT USING (true);

DROP POLICY IF EXISTS tasks_select_policy ON tasks;
CREATE POLICY tasks_select_policy ON tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS tasks_update_policy ON tasks;
CREATE POLICY tasks_update_policy ON tasks FOR UPDATE USING (true);



-- production RLS policies requires auth


CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'counselor')),
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_teams (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, team_id)
);

-- Add team_id to leads table if it doesn't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Enable Row Level Security on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS leads_select_policy ON leads;
DROP POLICY IF EXISTS leads_insert_policy ON leads;

-- SELECT Policy: Counselors can see leads they own OR leads assigned to their team
-- Admins can see all leads in their tenant
CREATE POLICY leads_select_policy ON leads
    FOR SELECT
    USING (
        -- Admin can see all leads in their tenant
        (
            auth.jwt() ->> 'role' = 'admin' 
            AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
        )
        OR
        -- Counselor can see leads they own
        (
            auth.jwt() ->> 'role' = 'counselor'
            AND owner_id = (auth.jwt() ->> 'user_id')::UUID
            AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
        )
        OR
        -- Counselor can see leads assigned to their team
        (
            auth.jwt() ->> 'role' = 'counselor'
            AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
            AND team_id IN (
                SELECT team_id 
                FROM user_teams 
                WHERE user_id = (auth.jwt() ->> 'user_id')::UUID
            )
        )
    );

-- INSERT Policy: Counselors and admins can insert leads under their tenant
CREATE POLICY leads_insert_policy ON leads
    FOR INSERT
    WITH CHECK (
        -- Must be admin or counselor
        auth.jwt() ->> 'role' IN ('admin', 'counselor')
        AND
        -- Lead must belong to user's tenant
        tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
        AND
        -- For counselors: they must be the owner or the lead must be in their team
        (
            auth.jwt() ->> 'role' = 'admin'
            OR
            (
                auth.jwt() ->> 'role' = 'counselor'
                AND (
                    owner_id = (auth.jwt() ->> 'user_id')::UUID
                    OR
                    team_id IN (
                        SELECT team_id 
                        FROM user_teams 
                        WHERE user_id = (auth.jwt() ->> 'user_id')::UUID
                    )
                )
            )
        )
    );

-- UPDATE Policy: Users can update leads they can see
CREATE POLICY leads_update_policy ON leads
    FOR UPDATE
    USING (
        -- Same logic as SELECT policy
        (
            auth.jwt() ->> 'role' = 'admin' 
            AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
        )
        OR
        (
            auth.jwt() ->> 'role' = 'counselor'
            AND owner_id = (auth.jwt() ->> 'user_id')::UUID
            AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
        )
        OR
        (
            auth.jwt() ->> 'role' = 'counselor'
            AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
            AND team_id IN (
                SELECT team_id 
                FROM user_teams 
                WHERE user_id = (auth.jwt() ->> 'user_id')::UUID
            )
        )
    );

-- DELETE Policy: Only admins can delete leads
CREATE POLICY leads_delete_policy ON leads
    FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'admin' 
        AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    );

-- Enable RLS on applications and tasks tables as well
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Basic SELECT policy for applications (can see if they can see the related lead)
CREATE POLICY applications_select_policy ON applications
    FOR SELECT
    USING (
        lead_id IN (
            SELECT id FROM leads
            -- Will use the leads RLS policy automatically
        )
    );

-- Basic INSERT policy for applications
CREATE POLICY applications_insert_policy ON applications
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'counselor')
        AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    );

-- Basic SELECT policy for tasks (can see if they can see the related application)
CREATE POLICY tasks_select_policy ON tasks
    FOR SELECT
    USING (
        application_id IN (
            SELECT id FROM applications
            -- Will use the applications RLS policy automatically
        )
    );

-- Basic INSERT policy for tasks
CREATE POLICY tasks_insert_policy ON tasks
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'counselor')
        AND tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    );

-- UPDATE policy for tasks (mark complete)
CREATE POLICY tasks_update_policy ON tasks
    FOR UPDATE
    USING (
        application_id IN (
            SELECT id FROM applications
        )
    );

-- Comments for documentation
COMMENT ON POLICY leads_select_policy ON leads IS 
    'Admins see all tenant leads; Counselors see leads they own or leads in their teams';

COMMENT ON POLICY leads_insert_policy ON leads IS 
    'Admins and counselors can insert leads in their tenant (counselors only for leads they own or in their teams)';

COMMENT ON POLICY applications_select_policy ON applications IS 
    'Users can see applications if they can see the related lead';

COMMENT ON POLICY tasks_select_policy ON tasks IS 
    'Users can see tasks if they can see the related application';