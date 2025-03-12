import Airtable from 'airtable';

// Get environment variables
const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

// Check if configuration is valid
export const hasAirtableConfig = Boolean(apiKey && baseId);

// Configure Airtable with API key
if (hasAirtableConfig) {
  Airtable.configure({
    apiKey: apiKey as string,
    endpointUrl: 'https://api.airtable.com',
  });
}

// Export the base instance with proper typing
export const base = hasAirtableConfig 
  ? Airtable.base(baseId as string)
  : undefined;
