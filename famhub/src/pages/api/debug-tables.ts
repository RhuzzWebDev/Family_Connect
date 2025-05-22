import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Set admin context
    const adminEmail = req.query.adminEmail as string || 'admin@example.com';
    await supabase.rpc('set_admin_session', { admin_email: adminEmail });
    await supabase.rpc('set_admin_flag', { admin: true });

    // Get list of all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      return res.status(500).json({ error: tablesError.message, tables: null });
    }

    // Get columns for demographic tables if they exist
    let demographicColumns = null;
    let demographicOptionColumns = null;

    const tableNames = tables.map((t: any) => t.table_name);
    
    if (tableNames.includes('question_demographic')) {
      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'question_demographic');
        
      demographicColumns = error ? { error: error.message } : columns;
    }
    
    if (tableNames.includes('question_demographic_option')) {
      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'question_demographic_option');
        
      demographicOptionColumns = error ? { error: error.message } : columns;
    }

    // Return all the information
    return res.status(200).json({
      tables: tableNames,
      demographicColumns,
      demographicOptionColumns
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
