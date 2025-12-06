-- Create leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    stage VARCHAR(50) NOT NULL DEFAULT 'new',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create applications table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    program_name VARCHAR(255),
    application_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_applications_lead
        FOREIGN KEY (lead_id) 
        REFERENCES leads(id)
        ON DELETE CASCADE
);

-- Create tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    application_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    due_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_tasks_application
        FOREIGN KEY (application_id) 
        REFERENCES applications(id)
        ON DELETE CASCADE,
    
    -- Check constraint: task type must be one of the allowed values
    CONSTRAINT chk_task_type
        CHECK (type IN ('call', 'email', 'review')),
    
    -- Check constraint: due_at must be >= created_at
    CONSTRAINT chk_due_at_after_created
        CHECK (due_at >= created_at)
);

-- Indexes for leads table
-- Index for fetching leads by tenant and owner
CREATE INDEX idx_leads_tenant_owner ON leads(tenant_id, owner_id);

-- Index for fetching leads by stage
CREATE INDEX idx_leads_stage ON leads(tenant_id, stage);

-- Index for fetching leads by created_at (for sorting/filtering)
CREATE INDEX idx_leads_created_at ON leads(tenant_id, created_at DESC);

-- Composite index for common query patterns
CREATE INDEX idx_leads_owner_stage ON leads(owner_id, stage);

-- Indexes for applications table
-- Index for fetching applications by tenant
CREATE INDEX idx_applications_tenant ON applications(tenant_id);

-- Index for fetching applications by lead (most common query)
CREATE INDEX idx_applications_lead ON applications(lead_id);

-- Composite index for tenant + lead queries
CREATE INDEX idx_applications_tenant_lead ON applications(tenant_id, lead_id);

-- Index for application status queries
CREATE INDEX idx_applications_status ON applications(tenant_id, status);

-- Indexes for tasks table
-- Index for fetching tasks by tenant
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);

-- Index for fetching tasks by application
CREATE INDEX idx_tasks_application ON tasks(application_id);

-- Index for fetching tasks due today (critical for performance)
CREATE INDEX idx_tasks_due_at ON tasks(tenant_id, due_at) WHERE status != 'completed';

-- Index for task status
CREATE INDEX idx_tasks_status ON tasks(tenant_id, status);

-- Composite index for finding pending tasks due today
CREATE INDEX idx_tasks_due_status ON tasks(due_at, status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to leads table
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to applications table
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to tasks table
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE leads IS 'Stores lead information for potential students';
COMMENT ON TABLE applications IS 'Stores application data linked to leads';
COMMENT ON TABLE tasks IS 'Stores tasks related to applications (calls, emails, reviews)';

COMMENT ON CONSTRAINT chk_task_type ON tasks IS 'Ensures task type is one of: call, email, review';
COMMENT ON CONSTRAINT chk_due_at_after_created ON tasks IS 'Ensures task due date is not before creation date';