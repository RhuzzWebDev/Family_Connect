import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Configure API route to handle larger file uploads (25MB)
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '30mb',
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const lastName = formData.get('lastName') as string;
    const firstName = formData.get('firstName') as string;
    const role = formData.get('role') as string;
    const persona = formData.get('persona') as string;
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size (25MB limit)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 25MB limit' },
        { status: 400 }
      );
    }

    if (!lastName || !firstName || !role || !persona || !fileName) {
      return NextResponse.json(
        { error: 'Missing required user information' },
        { status: 400 }
      );
    }

    // Determine the folder path based on user role and persona
    let folderPath = '';
    
    // Base path is always public/uploads
    const basePath = 'uploads';
    
    if (persona === 'Parent') {
      // For parents: /uploads/{last_name}/{role}/
      folderPath = path.join(basePath, lastName, role);
    } else {
      // For others: /uploads/other/{first_name}/
      folderPath = path.join(basePath, 'other', firstName);
    }

    // Create full folder path in public directory
    const fullFolderPath = path.join(process.cwd(), 'public', folderPath);
    
    // Ensure directory exists
    await mkdir(fullFolderPath, { recursive: true });

    // Full path for the file
    const uploadPath = path.join(folderPath, fileName);
    const filePath = path.join(process.cwd(), 'public', uploadPath);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL path
    return NextResponse.json({ 
      url: `/${uploadPath}`,
      folderPath: folderPath
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    );
  }
}
