import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class FileUploadService {
  private supabase: SupabaseClient | null;
  private bucket: string;
  private maxSizeMB: number;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    bucket: string,
    maxSizeMB: number = 10
  ) {
    this.supabase = supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey)
      : null;
    this.bucket = bucket;
    this.maxSizeMB = maxSizeMB;
  }

  isAvailable(): boolean {
    return Boolean(this.supabase);
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<string> {
    if (!this.supabase) {
      throw new Error('File upload is unavailable: Supabase is not configured');
    }

    const timestamp = Date.now();
    const path = `files/${timestamp}_${filename}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  }
}
