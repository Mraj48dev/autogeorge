import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * Creates a database backup
 */
export async function POST(request: NextRequest) {
  try {
    const { type = 'full' } = await request.json().catch(() => ({}));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', 'database');

    // Ensure backup directory exists
    await fs.promises.mkdir(backupDir, { recursive: true });

    const backupFile = path.join(backupDir, `autogeorge_backup_${timestamp}.sql`);

    console.log('Starting database backup...');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'Database URL not configured' },
        { status: 500 }
      );
    }

    // Create backup using pg_dump
    const command = `pg_dump "${databaseUrl}" --verbose --clean --if-exists --no-owner --no-privileges --format=plain > "${backupFile}"`;

    await execAsync(command);

    // Compress the backup
    await execAsync(`gzip "${backupFile}"`);
    const compressedFile = `${backupFile}.gz`;

    // Get file stats
    const stats = await fs.promises.stat(compressedFile);

    console.log('Backup completed successfully:', compressedFile);

    return NextResponse.json({
      success: true,
      backup: {
        filename: path.basename(compressedFile),
        path: compressedFile,
        size: stats.size,
        timestamp,
        type
      },
      message: 'Database backup created successfully'
    });

  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json(
      {
        error: 'Backup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Lists available backups
 */
export async function GET(request: NextRequest) {
  try {
    const backupDir = path.join(process.cwd(), 'backups', 'database');

    let files: string[] = [];
    try {
      files = await fs.promises.readdir(backupDir);
    } catch (error) {
      // Directory doesn't exist yet
      return NextResponse.json({
        success: true,
        backups: [],
        message: 'No backups found'
      });
    }

    const backups = await Promise.all(
      files
        .filter(file => file.endsWith('.sql.gz'))
        .map(async (file) => {
          const filePath = path.join(backupDir, file);
          const stats = await fs.promises.stat(filePath);

          return {
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            path: filePath
          };
        })
    );

    // Sort by creation date, newest first
    backups.sort((a, b) => b.created.getTime() - a.created.getTime());

    return NextResponse.json({
      success: true,
      backups,
      total: backups.length
    });

  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}