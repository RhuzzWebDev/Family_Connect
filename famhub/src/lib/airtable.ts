import Airtable from 'airtable';

// Get environment variables
const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

// Check if configuration is valid
export const hasAirtableConfig = Boolean(apiKey && baseId);

// Configure Airtable with API key
if (hasAirtableConfig) {
  // Add the 'pat' prefix if not present
  const fullApiKey = apiKey?.startsWith('pat') ? apiKey : `pat${apiKey}`;
  
  Airtable.configure({
    apiKey: fullApiKey,
    endpointUrl: 'https://api.airtable.com',
  });
}

// Export the base instance with proper typing
export const base = hasAirtableConfig 
  ? Airtable.base(baseId as string)
  : undefined;
