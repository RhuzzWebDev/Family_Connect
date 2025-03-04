import Airtable from 'airtable';

// Check if we're in a production environment and have the required keys
const hasAirtableConfig = process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID;

// Create a dummy base function if config is missing
let base: any;

if (hasAirtableConfig) {
  // Configure Airtable with the API key
  Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY as string,
  });

  // Initialize base with the base ID
  base = Airtable.base(process.env.AIRTABLE_BASE_ID as string);
} else {
  // Provide a mock base function that returns empty data
  base = (tableName: string) => ({
    select: () => ({
      all: async () => [],
      firstPage: async () => [],
    }),
    create: async () => ({ id: 'mock-id', fields: {} }),
    find: async () => ({ id: 'mock-id', fields: {} }),
    update: async () => ({ id: 'mock-id', fields: {} }),
    destroy: async () => ({ id: 'mock-id', deleted: true }),
  });
  
  // Log a warning in development, but don't crash the app
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Airtable configuration is missing. Using mock Airtable service.');
  }
}

export { base, hasAirtableConfig };
