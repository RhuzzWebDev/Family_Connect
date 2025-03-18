import { base, hasAirtableConfig } from '@/lib/airtable';
import Airtable, { FieldSet, Record, Records, Attachment } from 'airtable';
import { FileStorageService } from './fileStorageService';

export type UserRole = 
  | 'Father'
  | 'Grandfather'
  | 'Grandmother'
  | 'Middle Brother'
  | 'Middle Sister'
  | 'Mother'
  | 'Older Brother'
  | 'Older Sister'
  | 'Youngest Brother'
  | 'Youngest Sister';

export type UserPersona = 'Parent' | 'Children';

// Define our user fields with index signature to make it compatible with FieldSet
export interface UserFields extends FieldSet {
  id?: string;
  first_name: string;
  last_name: string;
  Email: string;
  Password: string;
  Confirm_Password?: string;
  Status?: string;
  role: UserRole;
  persona: UserPersona;
}

// Define question fields
export interface QuestionFields extends FieldSet {
  id?: string;
  user_id: string;
  question: string;
  file_url?: string;
  like_count: number;
  comment_count: number;
  Timestamp: string;
}

/**
 * Service for interacting with Airtable
 * Handles CRUD operations for user data and questions
 */
export class AirtableService {
  private readonly fileStorageService: FileStorageService;
  private readonly USERS_TABLE = 'User';
  private readonly QUESTIONS_TABLE = 'Questions_user';

  /**
   * Initialize the Airtable service
   */
  constructor() {
    if (!hasAirtableConfig) {
      throw new Error('Airtable is not configured. Please check your environment variables.');
    }
    
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

    try {
      // Check if email already exists
      const existingUsers = await this.getRecords(`Email = "${fields.Email}"`);
      if (existingUsers && existingUsers.length > 0) {
        throw new Error('Email already exists');
      }

      // Set default Status if not provided
      if (!fields.Status) {
        fields.Status = 'Validating';
      }

      // Ensure Confirm_Password matches Password if not provided
      if (!fields.Confirm_Password) {
        fields.Confirm_Password = fields.Password;
      }

      const records = await base(this.USERS_TABLE).create([{ fields }]);
      
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
      
      const records = await base(this.USERS_TABLE)
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
      const records = await base(this.USERS_TABLE).update([{ id, fields }]);
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
      await base(this.USERS_TABLE).destroy([id]);
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
      const records = await base(this.USERS_TABLE)
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
      const records = await base(this.QUESTIONS_TABLE)
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
      if (user.persona === 'Parent' && user.last_name) {
        folderPath = `${user.last_name}/${user.first_name || 'unknown'}`;
      } else {
        folderPath = `other/${user.first_name || 'unknown'}`;
      }

      // If file is provided, upload it to appropriate folder
      let file_url: string | undefined;
      if (file) {
        file_url = await this.fileStorageService.uploadFile(file, folderPath);
      }

      // Create question record
      const records = await base(this.QUESTIONS_TABLE).create([{
        fields: {
          ...fields,
          file_url,
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
      const records = await base(this.QUESTIONS_TABLE).update([{
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
      const records = await base(this.QUESTIONS_TABLE).update([{
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
