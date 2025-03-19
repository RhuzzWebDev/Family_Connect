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
  Confirm_Password: string;
  Status: 'Active' | 'Validating' | 'Not Active';
  role: UserRole;
  persona: UserPersona;
}

// Define question fields
export interface QuestionFields extends FieldSet {
  id?: string;
  user_id: string;
  questions: string;
  file_url?: string;
  like_count: number;
  comment_count: number;
  Timestamp: string;
  mediaType: 'image' | 'video' | 'audio';
  folder_path: string;
}

/**
 * Service for interacting with Airtable
 * Handles CRUD operations for user data and questions
 */
export class AirtableService {
  private readonly fileStorageService: FileStorageService;
  private readonly USERS_TABLE = 'Users';
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

  private validateFields(record: Record<FieldSet>, type: 'question' | 'user'): boolean {
    if (type === 'question') {
      const fields = record.fields as Partial<QuestionFields>;
      return !!(fields.user_id && fields.questions && typeof fields.like_count === 'number' && 
                typeof fields.comment_count === 'number' && fields.Timestamp && 
                fields.mediaType && fields.folder_path);
    } else {
      const fields = record.fields as Partial<UserFields>;
      return !!(fields.first_name && fields.last_name && fields.Email && fields.Password && 
                fields.Confirm_Password && fields.Status && fields.role && fields.persona);
    }
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

      const validRecords = records.filter(record => this.validateFields(record, 'question'));
      return validRecords as unknown as Record<QuestionFields>[];
    } catch (error: any) {
      console.error('Failed to get questions:', error);
      throw new Error(`Failed to get questions: ${error.message}`);
    }
  }

  /**
   * Create a new question
   * @param fields The question data to store
   * @returns The created record
   */
  async createQuestion(fields: Partial<QuestionFields>): Promise<Record<QuestionFields>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    if (!fields.user_id || !fields.questions) {
      throw new Error('Missing required fields: user_id and questions are required');
    }

    try {
      // Validate required fields
      if (!fields.user_id || !fields.questions) {
        throw new Error('Missing required fields: user_id and questions are required');
      }

      // Ensure numeric fields are initialized
      fields.like_count = fields.like_count || 0;
      fields.comment_count = fields.comment_count || 0;

      // Set timestamp if not provided
      if (!fields.Timestamp) {
        fields.Timestamp = new Date().toISOString();
      }

      const records = await base(this.QUESTIONS_TABLE).create([{
        fields: {
          user_id: fields.user_id,
          questions: fields.questions,
          file_url: fields.file_url,
          like_count: fields.like_count,
          comment_count: fields.comment_count,
          Timestamp: fields.Timestamp,
          mediaType: fields.mediaType,
          folder_path: fields.folder_path
        } as QuestionFields
      }]);

      const record = records[0];
      if (!this.validateFields(record, 'question')) {
        throw new Error('Created record is missing required fields');
      }
      return record as unknown as Record<QuestionFields>;
    } catch (error: any) {
      console.error('Failed to create question:', error);
      throw new Error(`Failed to create question: ${error.message}`);
    }
  }

  /**
   * Update question like count
   * @param questionId ID of the question to update
   * @returns The updated record
   */
  async incrementLikeCount(questionId: string): Promise<Record<QuestionFields>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      const question = await this.getQuestion(questionId);
      const currentLikes = (question.fields as QuestionFields).like_count || 0;

      const record = await base(this.QUESTIONS_TABLE).update(questionId, {
        like_count: currentLikes + 1
      });

      if (!this.validateFields(record, 'question')) {
        throw new Error('Updated record is missing required fields');
      }
      return record as unknown as Record<QuestionFields>;
    } catch (error: any) {
      console.error('Failed to update like count:', error);
      throw new Error(`Failed to update like count: ${error.message}`);
    }
  }

  /**
   * Update question comment count
   * @param questionId ID of the question to update
   * @returns The updated record
   */
  async incrementCommentCount(questionId: string): Promise<Record<QuestionFields>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      const question = await this.getQuestion(questionId);
      const currentComments = (question.fields as QuestionFields).comment_count || 0;

      const record = await base(this.QUESTIONS_TABLE).update(questionId, {
        comment_count: currentComments + 1
      });

      if (!this.validateFields(record, 'question')) {
        throw new Error('Updated record is missing required fields');
      }
      return record as unknown as Record<QuestionFields>;
    } catch (error: any) {
      console.error('Failed to update comment count:', error);
      throw new Error(`Failed to update comment count: ${error.message}`);
    }
  }

  async getUser(email: string): Promise<Record<UserFields>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      const records = await base(this.USERS_TABLE)
        .select({
          filterByFormula: `{Email} = '${email}'`,
          maxRecords: 1
        })
        .all();

      if (records.length === 0) {
        throw new Error('User not found');
      }

      const record = records[0];
      if (!this.validateFields(record, 'user')) {
        throw new Error('User record is missing required fields');
      }
      return record as unknown as Record<UserFields>;
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  async getQuestion(id: string): Promise<Record<QuestionFields>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      const record = await base(this.QUESTIONS_TABLE).find(id);
      if (!this.validateFields(record, 'question')) {
        throw new Error('Question record is missing required fields');
      }
      return record as unknown as Record<QuestionFields>;
    } catch (error: any) {
      console.error('Failed to fetch question:', error);
      throw new Error(`Failed to fetch question: ${error.message}`);
    }
  }

  async updateQuestion(id: string, fields: Partial<QuestionFields>): Promise<Record<QuestionFields>> {
    if (!base) {
      throw new Error('Airtable base is not available');
    }

    try {
      const record = await base(this.QUESTIONS_TABLE).update(id, fields);
      if (!this.validateFields(record, 'question')) {
        throw new Error('Updated record is missing required fields');
      }
      return record as unknown as Record<QuestionFields>;
    } catch (error: any) {
      console.error('Failed to update question:', error);
      throw new Error(`Failed to update question: ${error.message}`);
    }
  }
}
