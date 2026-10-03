import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is not configured.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
}

const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export const JOB_APPLICATIONS_BUCKET = 'job-applications';

export const ALLOWED_JOB_DOCUMENT_TYPES = {
  cv: [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ],
  qualification: [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ],
  nationalId: [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ],
  photo: [
    'image/jpeg',
    'image/png',
  ],
} as const;

export type JobDocumentType = keyof typeof ALLOWED_JOB_DOCUMENT_TYPES;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function validateDocumentType(
  documentType: JobDocumentType,
): void {
  if (!(documentType in ALLOWED_JOB_DOCUMENT_TYPES)) {
    throw new Error(`Unsupported document type: ${documentType}`);
  }
}

function validateFile(
  documentType: JobDocumentType,
  file: Buffer,
  contentType: string,
): void {
  validateDocumentType(documentType);

  if (!Buffer.isBuffer(file) || file.length === 0) {
    throw new Error('Uploaded file is empty or invalid.');
  }

  if (file.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 10 MB maximum size.');
  }

  const allowedTypes =
    ALLOWED_JOB_DOCUMENT_TYPES[documentType];

  if (!allowedTypes.some(
    (allowedType) => allowedType === contentType,
  )) {
    throw new Error(
      `File type ${contentType} is not allowed for ${documentType}.`,
    );
  }
}

function extensionFromContentType(
  contentType: string,
): string {
  switch (contentType) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      throw new Error(
        `Unsupported content type: ${contentType}`,
      );
  }
}

export async function uploadJobApplicationDocument(
  applicationId: string,
  documentType: JobDocumentType,
  file: Buffer,
  contentType: string,
): Promise<{
  bucket: string;
  path: string;
  size: number;
  contentType: string;
}> {
  if (!applicationId.trim()) {
    throw new Error('Application ID is required.');
  }

  validateFile(documentType, file, contentType);

  const extension = extensionFromContentType(contentType);

  const safeApplicationId = applicationId
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');

  if (!safeApplicationId) {
    throw new Error('Invalid application ID.');
  }

  const path =
    `${safeApplicationId}/${documentType}.${extension}`;

  const { error } = await supabase.storage
    .from(JOB_APPLICATIONS_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true,
      cacheControl: '3600',
    });

  if (error) {
    throw new Error(
      `Supabase upload failed: ${error.message}`,
    );
  }

  return {
    bucket: JOB_APPLICATIONS_BUCKET,
    path,
    size: file.length,
    contentType,
  };
}

export async function createJobApplicationSignedUrl(
  path: string,
  expiresInSeconds = 300,
): Promise<string> {
  if (!path.trim()) {
    throw new Error('Storage path is required.');
  }

  if (
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds < 60 ||
    expiresInSeconds > 3600
  ) {
    throw new Error(
      'Signed URL expiry must be between 60 and 3600 seconds.',
    );
  }

  const { data, error } = await supabase.storage
    .from(JOB_APPLICATIONS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Supabase signed URL failed: ${
        error?.message ?? 'No URL returned.'
      }`,
    );
  }

  return data.signedUrl;
}

export async function deleteJobApplicationDocument(
  path: string,
): Promise<void> {
  if (!path.trim()) {
    throw new Error('Storage path is required.');
  }

  const { error } = await supabase.storage
    .from(JOB_APPLICATIONS_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(
      `Supabase delete failed: ${error.message}`,
    );
  }
}

