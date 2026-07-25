import { getApiUrl } from './connectionService';

export interface UploadResult {
  success: boolean;
  url?: string;
  imageUrl?: string;
  fileUrl?: string;
  urls?: string[];
  error?: string;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload JPG, PNG, WEBP, GIF, MP4, MOV, or WEBM files.'
    };
  }

  // 50MB max file size
  if (file.size > 50 * 1024 * 1024) {
    return {
      valid: false,
      error: 'File size exceeds the 50MB limit.'
    };
  }

  return { valid: true };
};

export const uploadMediaFile = async (file: File | string, endpoint: string = '/api/upload'): Promise<UploadResult> => {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
    const targetUrl = endpoint.startsWith('http') ? endpoint : `${getApiUrl()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    let response: Response;

    if (typeof file === 'string') {
      // Base64 upload
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ image: file, file })
      });
    } else {
      // Multer Multipart FormData upload
      const validation = validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('image', file);
      formData.append('media', file);

      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          // Content-Type is omitted so browser sets multipart/form-data boundary automatically!
        },
        body: formData
      });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Non-JSON response received from upload endpoint:', response.status);
      return {
        success: false,
        error: `Server error (${response.status}): Expected JSON response but received ${contentType || 'HTML'}.`
      };
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || 'Upload failed'
      };
    }

    return {
      success: true,
      url: data.url || data.imageUrl || data.fileUrl || (data.data && data.data.url),
      imageUrl: data.imageUrl || data.url,
      fileUrl: data.fileUrl || data.url,
      urls: data.urls || (data.url ? [data.url] : [])
    };
  } catch (error: any) {
    console.error('Error in uploadMediaFile:', error);
    return {
      success: false,
      error: error.message || 'Network error during upload.'
    };
  }
};
