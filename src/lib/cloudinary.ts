import { supabase } from './supabase'

const allowedFormats = ['jpg', 'png', 'webp'] as const

type UploadSignature = {
  cloudName: string
  apiKey: string
  timestamp: number
  publicId: string
  signature: string
}

type CloudinaryUploadResponse = {
  secure_url?: string
  public_id?: string
  error?: { message?: string }
}

export async function uploadTripCover(file: File): Promise<{ secureUrl: string; publicId: string }> {
  const { data: signature, error: signatureError } = await supabase.functions.invoke<UploadSignature>(
    'sign-cloudinary-upload',
    { method: 'POST' },
  )

  if (signatureError || !signature) {
    throw new Error('Tanda tangan upload tidak tersedia. Pastikan Edge Function dan rahasia Cloudinary sudah dikonfigurasi.')
  }

  const body = new FormData()
  body.set('file', file)
  body.set('api_key', signature.apiKey)
  body.set('timestamp', String(signature.timestamp))
  body.set('public_id', signature.publicId)
  body.set('overwrite', 'false')
  body.set('allowed_formats', allowedFormats.join(','))
  body.set('signature', signature.signature)

  let response: Response
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`, {
      method: 'POST',
      body,
    })
  } catch {
    throw new Error('Cloudinary tidak dapat dijangkau. Periksa koneksi lalu coba lagi.')
  }

  const result = await response.json() as CloudinaryUploadResponse
  if (!response.ok || !result.secure_url || !result.public_id) {
    throw new Error(result.error?.message ?? 'Cloudinary menolak file. Gunakan JPG, PNG, atau WebP.')
  }

  return { secureUrl: result.secure_url, publicId: result.public_id }
}
