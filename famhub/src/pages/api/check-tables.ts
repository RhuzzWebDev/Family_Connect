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

    // Try to access various tables
    const results: Record<string, any> = {};
    
    // Check users table (should definitely exist)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    results.users = {
      success: !usersError,
      error: usersError ? usersError.message : null,
      data: users ? `Found ${users.length} records` : null
    };
    
    // Check questions table (should exist)
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id')
      .limit(1);
    
    results.questions = {
      success: !questionsError,
      error: questionsError ? questionsError.message : null,
      data: questions ? `Found ${questions.length} records` : null
    };
    
    // Check question_demographic table (the one with issues)
    const { data: demographic, error: demographicError } = await supabase
      .from('question_demographic')
      .select('id')
      .limit(1);
    
    results.question_demographic = {
      success: !demographicError,
      error: demographicError ? demographicError.message : null,
      data: demographic ? `Found ${demographic.length} records` : null,
      status: demographicError?.code
    };
    
    // Check if the question_type enum has 'demographic' value
    const { data: types, error: typesError } = await supabase
      .from('pg_enum')
      .select('*')
      .eq('enumlabel', 'demographic');
    
    results.demographic_enum = {
      success: !typesError,
      error: typesError ? typesError.message : null,
      data: types ? `Found ${types.length} records` : null
    };

    return res.status(200).json(results);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
