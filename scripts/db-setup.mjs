import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Supabase URL and Service Role Key must be defined in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setupDatabase() {
  try {
    console.log('Reading SQL setup file...');
    const sql = await fs.readFile(path.resolve(process.cwd(), 'setup_inventory.sql'), 'utf-8');

    console.log('Executing SQL script via RPC...');
    const { error } = await supabase.rpc('execute_sql', { sql_statement: sql });

    if (error) {
      throw error;
    }

    console.log('Database setup successful!');

  } catch (error) {
    console.error('Error setting up the database:', error);
    process.exit(1);
  }
}

setupDatabase();