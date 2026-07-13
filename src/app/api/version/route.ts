import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const versionPath = path.join(process.cwd(), 'version.json');
    const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
    return NextResponse.json({
      name: data.name,
      version: data.version,
      description: data.description,
      changelog: data.changelog || [],
    });
  } catch {
    return NextResponse.json({ name: 'SisGelfram', version: '0.0.0', description: '', changelog: [] });
  }
}