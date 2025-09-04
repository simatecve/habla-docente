-- Create webhooks table for storing webhook configurations
CREATE TABLE webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret_key VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    events TEXT[] DEFAULT ARRAY['agent_updated', 'snippet_created', 'snippet_updated', 'snippet_deleted'],
    headers JSONB DEFAULT '{}',
    retry_attempts INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_logs table for monitoring and debugging
CREATE TABLE webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempt_number INTEGER DEFAULT 1,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_keys table for webhook authentication
CREATE TABLE api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    permissions TEXT[] DEFAULT ARRAY['webhooks:read', 'webhooks:write'],
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_webhooks_agent_id ON webhooks(agent_id);
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active);
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_executed_at ON webhook_logs(executed_at);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Create updated_at trigger for webhooks
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for webhooks
CREATE POLICY "Users can view their own webhooks" ON webhooks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhooks" ON webhooks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks" ON webhooks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks" ON webhooks
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for webhook_logs
CREATE POLICY "Users can view logs of their webhooks" ON webhook_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM webhooks 
            WHERE webhooks.id = webhook_logs.webhook_id 
            AND webhooks.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert webhook logs" ON webhook_logs
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for api_keys
CREATE POLICY "Users can view their own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to get complete agent data for webhooks
CREATE OR REPLACE FUNCTION get_agent_webhook_data(agent_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    agent_data JSONB;
    snippets_data JSONB;
BEGIN
    -- Get agent data
    SELECT to_jsonb(agentes.*) INTO agent_data
    FROM agentes
    WHERE id = agent_uuid;
    
    -- Get snippets data
    SELECT COALESCE(jsonb_agg(to_jsonb(snippets.*)), '[]'::jsonb) INTO snippets_data
    FROM snippets
    WHERE agent_id = agent_uuid;
    
    -- Combine data
    RETURN jsonb_build_object(
        'agent', agent_data,
        'snippets', snippets_data,
        'timestamp', extract(epoch from now()),
        'version', '1.0'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON webhooks TO authenticated;
GRANT ALL ON webhook_logs TO authenticated;
GRANT ALL ON api_keys TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_webhook_data(UUID) TO authenticated;