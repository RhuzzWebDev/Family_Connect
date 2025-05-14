/**
 * Utility function to get the appropriate icon name based on media type
 * @param mediaType - The type of media (image, video, audio, or document)
 * @returns A string representing the icon type
 */
export const getMediaTypeIcon = (mediaType: string | null): string => {
  switch (mediaType) {
    case 'image':
      return 'image'
    case 'video':
      return 'video'
    case 'audio':
      return 'audio'
    default:
      return 'document'
  }
}
