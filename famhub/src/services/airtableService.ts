import { base } from '@/lib/airtable';

export interface Record {
  id: string;
  fields: any;
}

export class AirtableService {
  private table: string;

  constructor(tableName: string) {
    this.table = tableName;
  }

  async getRecords(filterFormula?: string): Promise<Record[]> {
    try {
      const records = await base(this.table)
        .select({
          filterByFormula: filterFormula,
        })
        .all();

      return records.map((record) => ({
        id: record.id,
        fields: record.fields,
      }));
    } catch (error) {
      console.error('Error fetching records:', error);
      throw error;
    }
  }

  async createRecord(fields: any): Promise<Record> {
    try {
      const record = await base(this.table).create([{ fields }]);
      return {
        id: record[0].id,
        fields: record[0].fields,
      };
    } catch (error) {
      console.error('Error creating record:', error);
      throw error;
    }
  }

  async updateRecord(id: string, fields: any): Promise<Record> {
    try {
      const record = await base(this.table).update([
        {
          id,
          fields,
        },
      ]);
      return {
        id: record[0].id,
        fields: record[0].fields,
      };
    } catch (error) {
      console.error('Error updating record:', error);
      throw error;
    }
  }

  async deleteRecord(id: string): Promise<void> {
    try {
      await base(this.table).destroy([id]);
    } catch (error) {
      console.error('Error deleting record:', error);
      throw error;
    }
  }
}
