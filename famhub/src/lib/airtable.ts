import Airtable from 'airtable';

// Get environment variables
const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

// Check if configuration is valid
export const hasAirtableConfig = Boolean(apiKey && baseId);

if (!hasAirtableConfig) {
  throw new Error('Airtable configuration is missing. Please check your environment variables.');
}

// Configure Airtable with API key
Airtable.configure({
  apiKey: apiKey as string,
  endpointUrl: 'https://api.airtable.com',
});

// Export the base instance
export const base = Airtable.base(baseId as string);
