import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderPath = formData.get('folderPath') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create full folder path
    const fullFolderPath = path.join(process.cwd(), 'public/uploads', folderPath);
    
    // Ensure directory exists
    await mkdir(fullFolderPath, { recursive: true });

    // Generate unique filename with timestamp
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = path.join(fullFolderPath, fileName);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL path
    const publicPath = `/uploads/${folderPath}/${fileName}`;

    return NextResponse.json({ url: publicPath });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    );
  }
}
