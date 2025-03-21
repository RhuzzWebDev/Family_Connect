import { SupabaseService } from './supabaseService';

/**
 * Service for handling file uploads and storage in public folder
 */
export class FileStorageService {
  private readonly baseUploadPath = 'public/uploads';

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
   * Upload a file to public/uploads directory via API
   * @param file File to upload
   * @param folderPath Folder path within uploads
   * @returns URL path of the uploaded file
   */
  async uploadFile(file: File, folderPath: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderPath', folderPath);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload file');
      }

      const data = await response.json();
      return data.url;
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
    return `${this.baseUploadPath}/${folderPath}/${fileName}`;
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
