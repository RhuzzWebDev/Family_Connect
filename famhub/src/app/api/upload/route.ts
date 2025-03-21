import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const uploadPath = formData.get('path') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create full folder path in public directory
    const fullFolderPath = path.join(process.cwd(), 'public', path.dirname(uploadPath));
    
    // Ensure directory exists
    await mkdir(fullFolderPath, { recursive: true });

    // Save file with provided name
    const filePath = path.join(process.cwd(), 'public', uploadPath);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL path
    return NextResponse.json({ url: `/${uploadPath}` });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    );
  }
}
