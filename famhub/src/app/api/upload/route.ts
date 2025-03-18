import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { AirtableService } from '@/services/airtableService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderPath = formData.get('folderPath') as string;

    if (!file || !folderPath) {
      return NextResponse.json(
        { error: 'File and folder path are required' },
        { status: 400 }
      );
    }

    // Create full directory path
    const uploadDir = join(process.cwd(), 'public', 'uploads', folderPath);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const ext = originalName.split('.').pop();
    const fileName = `${timestamp}.${ext}`;
    const fullPath = join(uploadDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(fullPath, buffer);

    // Generate public URL
    const publicUrl = `/uploads/${folderPath}/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
