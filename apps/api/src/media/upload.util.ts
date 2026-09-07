import { BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
];

export const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.html', '.htm',
  '.py', '.pl', '.jar', '.asp', '.aspx', '.phtml', '.cgi', '.dll'
];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export function ensureUploadDirExists() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export interface ValidatedFile {
  originalName: string;
  fileName: string;
  filePath: string;
  urlPath: string;
  mimeType: string;
  size: number;
  type: 'IMAGE' | 'VIDEO';
}

export interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export function validateAndSaveFile(file: MulterFile): ValidatedFile {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  ensureUploadDirExists();

  const originalExt = path.extname(file.originalname).toLowerCase();
  
  if (DANGEROUS_EXTENSIONS.includes(originalExt)) {
    throw new BadRequestException(`File extension '${originalExt}' is prohibited for security reasons.`);
  }

  const mimeType = file.mimetype.toLowerCase();
  let fileType: 'IMAGE' | 'VIDEO';

  if (ALLOWED_IMAGE_MIMES.includes(mimeType)) {
    fileType = 'IMAGE';
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException(`Image size exceeds maximum limit of 10MB (Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
    }
  } else if (ALLOWED_VIDEO_MIMES.includes(mimeType)) {
    fileType = 'VIDEO';
    if (file.size > MAX_VIDEO_SIZE) {
      throw new BadRequestException(`Video size exceeds maximum limit of 50MB (Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
    }
  } else {
    throw new BadRequestException(`Unsupported file type: ${mimeType}. Allowed formats: JPEG, PNG, WebP, GIF, SVG, MP4, WebM.`);
  }

  // Generate unique sanitized filename
  const sanitizedBaseName = path.basename(file.originalname, originalExt).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const fileName = `${Date.now()}_${uniqueId}_${sanitizedBaseName}${originalExt}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  // Write file to upload directory
  fs.writeFileSync(filePath, file.buffer);

  const urlPath = `/uploads/${fileName}`;

  return {
    originalName: file.originalname,
    fileName,
    filePath,
    urlPath,
    mimeType,
    size: file.size,
    type: fileType,
  };
}
