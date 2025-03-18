/**
 * Service for handling file uploads and storage
 * Currently using local storage, but can be extended to use cloud storage
 */
export class FileStorageService {
  private readonly baseStoragePath = 'public/uploads';

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
}
