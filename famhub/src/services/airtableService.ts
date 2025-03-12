import { base, hasAirtableConfig } from '@/lib/airtable';
import Airtable, { FieldSet, Record, Records } from 'airtable';

// Define our user fields with index signature to make it compatible with FieldSet
export interface UserFields extends FieldSet {
  Name: string;
  Email: string;
  Password: string;
  Confirm_Password?: string; // Added Confirm_Password field
  Status?: string; // Optional Status field with default "Validating"
}

/**
 * Service for interacting with Airtable
 * Handles CRUD operations for user data
 */
export class AirtableService {
  private readonly tableName: string;

  /**
   * Initialize the Airtable service
   * @param tableName The name of the table to use (defaults to 'User')
   */
  constructor(tableName = 'User') {
    if (!hasAirtableConfig) {
      throw new Error('Airtable is not configured. Please check your environment variables.');
    }
    
    this.tableName = tableName;
  }

  /**
   * Create a new user record
   * @param fields The user data to store
   * @returns The created record
   */
  async createRecord(fields: UserFields): Promise<Record<FieldSet>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    // Set default Status if not provided
    if (!fields.Status) {
      fields.Status = 'Validating';
    }

    // Ensure Confirm_Password matches Password if not provided
    if (!fields.Confirm_Password) {
      fields.Confirm_Password = fields.Password;
    }

    try {
      // Get existing records to check the current IDs
      const existingRecords = await this.getRecords();
      console.log('Existing records count:', existingRecords.length);
      
      if (existingRecords.length > 0) {
        // Log the IDs of existing records to understand the sequence
        console.log('Existing record IDs:', existingRecords.map(record => record.id));
      }
      
      const records = await base(this.tableName).create([{ fields }]);
      
      // Log the newly created record ID
      console.log('New record created with ID:', records[0].id);
      
      return records[0];
    } catch (error: any) {
      console.error('Failed to create user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Get user records with optional filter
   * @param filterFormula Optional Airtable formula to filter records
   * @returns Array of matching records
   */
  async getRecords(filterFormula?: string): Promise<Records<FieldSet>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      // Only include filterByFormula if it's provided, otherwise omit it
      const selectOptions = filterFormula ? { filterByFormula: filterFormula } : {};
      
      const records = await base(this.tableName)
        .select(selectOptions)
        .all();
      return records;
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  /**
   * Update an existing user record
   * @param id The ID of the record to update
   * @param fields The fields to update
   * @returns The updated record
   */
  async updateRecord(id: string, fields: Partial<UserFields>): Promise<Record<FieldSet>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    // If Password is updated, update Confirm_Password as well
    if (fields.Password && !fields.Confirm_Password) {
      fields.Confirm_Password = fields.Password;
    }

    try {
      const records = await base(this.tableName).update([{ id, fields }]);
      return records[0];
    } catch (error: any) {
      console.error('Failed to update user:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Delete a user record
   * @param id The ID of the record to delete
   */
  async deleteRecord(id: string): Promise<void> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      await base(this.tableName).destroy([id]);
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
}
