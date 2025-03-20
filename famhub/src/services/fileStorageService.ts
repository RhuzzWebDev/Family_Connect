import { supabase } from '@/lib/supabase';
import { SupabaseService } from './supabaseService';

/**
 * Service for handling file uploads and storage using Supabase Storage
 */
export class FileStorageService {
  private readonly bucketName = 'uploads';

  /**
   * Get the folder path for a user based on their role
   * Parent role: /{last_name}/{first_name}/
   * Other roles: /other/{first_name}/
   * @param userEmail User email to get folder path for
   * @returns Folder path for the user
   */
  async getUserFolderPath(userEmail: string): Promise<string> {
    try {
      const user = await SupabaseService.getUserByEmail(userEmail);
      if (!user) {
        throw new Error('User not found');
      }

      // Determine folder path based on role
      if (user.persona === 'Parent') {
        return `${user.last_name}/${user.first_name}`;
      } else {
        return `other/${user.first_name}`;
      }
    } catch (error: any) {
      console.error('Failed to get user folder path:', error);
      // Return a fallback path if we can't determine the user's role
      return `other/${userEmail}`;
    }
  }

  /**
   * Upload a file to Supabase Storage
   * @param file File to upload
   * @param folderPath Folder path within storage
   * @returns URL of the uploaded file
   */
  async uploadFile(file: File, folderPath: string): Promise<string> {
    try {
      // Generate a unique filename with timestamp
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = `${folderPath}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Get the full storage path for a file
   * @param folderPath Folder path within storage
   * @param fileName File name
   * @returns Full storage path
   */
  getStoragePath(folderPath: string, fileName: string): string {
    return `${folderPath}/${fileName}`;
  }

  /**
   * Determine media type from file name
   * @param fileName Name of the file
   * @returns Media type (image, video, audio) or undefined
   */
  getMediaType(fileName: string): 'image' | 'video' | 'audio' | undefined {
    if (fileName.match(/\.(jpg|jpeg|png|gif)$/i)) return 'image';
    if (fileName.match(/\.(mp4|webm|mov)$/i)) return 'video';
    if (fileName.match(/\.(mp3|wav|ogg)$/i)) return 'audio';
    return undefined;
  }
}
