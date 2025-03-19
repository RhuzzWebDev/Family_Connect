/**
 * Service for handling file uploads and storage
 * Currently using local storage, but can be extended to use cloud storage
 */
export class FileStorageService {
  private readonly baseStoragePath = 'public/uploads';

  /**
   * Get the folder path for a user based on their role
   * Parent role: /{last_name}/{first_name}/
   * Other roles: /other/{first_name}/
   * @param userId User ID to get folder path for
   * @returns Folder path for the user
   */
  async getUserFolderPath(userId: string): Promise<string> {
    try {
      // Fetch user details from Airtable
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      const user = data.user;

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
      return `other/${userId}`;
    }
  }

  /**
   * Upload a file to storage
   * @param file File to upload
   * @param folderPath Folder path within storage
   * @returns URL of the uploaded file
   */
  async uploadFile(file: File, folderPath: string): Promise<string> {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderPath', folderPath);

      // Make API call to upload endpoint
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
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
    return `${this.baseStoragePath}/${folderPath}/${fileName}`;
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
