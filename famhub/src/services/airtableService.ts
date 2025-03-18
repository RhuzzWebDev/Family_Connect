import { base, hasAirtableConfig } from '@/lib/airtable';
import Airtable, { FieldSet, Record, Records, Attachment } from 'airtable';
import { FileStorageService } from './fileStorageService';

// Define our user fields with index signature to make it compatible with FieldSet
export interface UserFields extends FieldSet {
  Name: string;
  Email: string;
  Password: string;
  Confirm_Password?: string;
  Status?: string;
  role?: 'parent' | 'child';
  first_name?: string;
  last_name?: string;
}

// Define question fields
export interface QuestionFields extends FieldSet {
  id: string;
  user_id: string;
  questions: string;
  file_url?: string;
  like_count: number;
  comment_count: number;
  Timestamp: string;
  mediaType?: 'image' | 'video' | 'audio';
  folder_path?: string;
}

/**
 * Service for interacting with Airtable
 * Handles CRUD operations for user data and questions
 */
export class AirtableService {
  private readonly tableName: string;
  private readonly fileStorageService: FileStorageService;

  /**
   * Initialize the Airtable service
   * @param tableName The name of the table to use (defaults to 'User')
   */
  constructor(tableName = 'User') {
    if (!hasAirtableConfig) {
      throw new Error('Airtable is not configured. Please check your environment variables.');
    }
    
    this.tableName = tableName;
    this.fileStorageService = new FileStorageService();
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

  /**
   * Get records from the Users table
   * @param filterByFormula Optional filter formula
   * @returns Array of records
   */
  async getUsers(filterByFormula?: string): Promise<Record<UserFields>[]> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      const records = await base('Users')
        .select({
          filterByFormula: filterByFormula || '',
        })
        .all();

      return records as unknown as Record<UserFields>[];
    } catch (error: any) {
      console.error('Failed to get records:', error);
      throw new Error(`Failed to get records: ${error.message}`);
    }
  }

  /**
   * Get questions from the Questions_user table
   * @param filterByFormula Optional filter formula
   * @returns Array of records
   */
  async getQuestions(filterByFormula?: string): Promise<Record<QuestionFields>[]> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      const records = await base('Questions_user')
        .select({
          filterByFormula: filterByFormula || '',
          sort: [{ field: 'Timestamp', direction: 'desc' }]
        })
        .all();

      return records as unknown as Record<QuestionFields>[];
    } catch (error: any) {
      console.error('Failed to get questions:', error);
      throw new Error(`Failed to get questions: ${error.message}`);
    }
  }

  /**
   * Create a new question
   * @param fields Question data
   * @param file Optional file to upload
   * @returns Created question record
   */
  async createQuestion(fields: Partial<QuestionFields>, file?: File): Promise<Record<QuestionFields>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      // Get user info for folder structure
      const userEmail = sessionStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('User not authenticated');
      }

      const userRecords = await this.getUsers(`Email = "${userEmail}"`);
      if (!userRecords || userRecords.length === 0) {
        throw new Error('User not found');
      }

      const user = userRecords[0].fields as UserFields;
      let folderPath = '';

      // Create folder structure based on role
      if (user.role === 'parent' && user.last_name) {
        folderPath = `${user.last_name}/${user.first_name || 'unknown'}`;
      } else {
        // For non-parent users or missing last name
        folderPath = `other/${user.first_name || 'unknown'}`;
      }

      // If file is provided, upload it to appropriate folder
      let file_url: string | undefined;
      if (file) {
        file_url = await this.fileStorageService.uploadFile(file, folderPath);
      }

      // Create question record
      const records = await base('Questions_user').create([{
        fields: {
          ...fields,
          file_url,
          folder_path: folderPath,
          like_count: 0,
          comment_count: 0,
          Timestamp: new Date().toISOString()
        }
      }]);

      return records[0] as unknown as Record<QuestionFields>;
    } catch (error: any) {
      console.error('Failed to create question:', error);
      throw new Error(`Failed to create question: ${error.message}`);
    }
  }

  /**
   * Update question like count
   * @param id Question ID
   * @param likeCount New like count
   */
  async updateQuestionLikes(id: string, likeCount: number): Promise<Record<QuestionFields>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      const records = await base('Questions_user').update([{
        id,
        fields: { like_count: likeCount }
      }]);

      return records[0] as unknown as Record<QuestionFields>;
    } catch (error: any) {
      console.error('Failed to update question likes:', error);
      throw new Error(`Failed to update question likes: ${error.message}`);
    }
  }

  /**
   * Update question comment count
   * @param id Question ID
   * @param commentCount New comment count
   */
  async updateQuestionComments(id: string, commentCount: number): Promise<Record<QuestionFields>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      const records = await base('Questions_user').update([{
        id,
        fields: { comment_count: commentCount }
      }]);

      return records[0] as unknown as Record<QuestionFields>;
    } catch (error: any) {
      console.error('Failed to update question comments:', error);
      throw new Error(`Failed to update question comments: ${error.message}`);
    }
  }
}
