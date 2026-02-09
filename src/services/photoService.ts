import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
  url: string;
  path: string;
}

class PhotoService {
  private readonly BUCKET_NAME = "chat-photos";
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  /**
   * Initialize storage bucket (call once on app setup)
   */
  async initializeBucket(): Promise<boolean> {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      
      const bucketExists = buckets?.some(b => b.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false,
          fileSizeLimit: this.MAX_FILE_SIZE,
        });
        
        if (error) throw error;
        console.log("✅ Storage bucket created:", this.BUCKET_NAME);
      }
      
      return true;
    } catch (error) {
      console.error("Error initializing bucket:", error);
      return false;
    }
  }

  /**
   * Upload a photo to Supabase Storage
   */
  async uploadPhoto(
    file: File,
    bookingId: string,
    userId: string
  ): Promise<UploadResult | null> {
    try {
      if (!this.validateFile(file)) {
        throw new Error("Invalid file type or size");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${bookingId}/${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error("Error uploading photo:", error);
      return null;
    }
  }

  /**
   * Upload photo from base64 data (for camera captures)
   */
  async uploadBase64Photo(
    base64Data: string,
    bookingId: string,
    userId: string
  ): Promise<UploadResult | null> {
    try {
      const base64Response = await fetch(base64Data);
      const blob = await base64Response.blob();
      
      const file = new File([blob], `photo-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      return this.uploadPhoto(file, bookingId, userId);
    } catch (error) {
      console.error("Error uploading base64 photo:", error);
      return null;
    }
  }

  /**
   * Get signed URL for private photo access
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
  }

  /**
   * Delete a photo
   */
  async deletePhoto(path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting photo:", error);
      return false;
    }
  }

  /**
   * Compress image before upload (reduces file size)
   */
  async compressImage(file: File, maxWidth: number = 1920): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.8
          );
        };
      };
    });
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: File): boolean {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      console.error("Invalid file type:", file.type);
      return false;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      console.error("File too large:", file.size);
      return false;
    }

    return true;
  }

  /**
   * Get all photos for a booking from storage
   */
  async listBookingPhotos(bookingId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(bookingId);

      if (error) throw error;

      return (data || []).map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(`${bookingId}/${file.name}`);
        return publicUrl;
      });
    } catch (error) {
      console.error("Error listing photos:", error);
      return [];
    }
  }
}

export const photoService = new PhotoService();