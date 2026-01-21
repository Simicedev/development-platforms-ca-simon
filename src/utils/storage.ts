import supabase from "./supabase"

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-")
}

export async function uploadImage(file: File): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) throw new Error(userErr.message)
  const uid = userData?.user?.id
  if (!uid) throw new Error("Not authenticated. Please log in.")

  const bucket = (import.meta as any)?.env?.VITE_STORAGE_BUCKET || "Images"
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
  const base = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image"
  let path = `${uid}/${Date.now()}-${base}.${ext}`
  if ((import.meta as any)?.env?.VITE_SIMPLE_STORAGE_PATH) {
    path = `test-${Date.now()}.${ext}`
  }

  // Debug logging to inspect runtime values
  // eslint-disable-next-line no-console
  console.log('STORAGE_BUCKET:', bucket)
  // eslint-disable-next-line no-console
  console.log('upload path:', path, 'bucket:', bucket)

  const res = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || undefined,
  })
  // eslint-disable-next-line no-console
  console.log('upload res:', res)
  if (res.error) {
    // eslint-disable-next-line no-console
    console.error('upload error full:', res.error)
    if (/Bucket not found/i.test(res.error.message)) {
      throw new Error(`Storage bucket "${bucket}" not found. Create it in Supabase Storage or set VITE_STORAGE_BUCKET to the correct name.`)
    }
    throw new Error(res.error.message)
  }

  // Expect the bucket to be public; otherwise, generate signed URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error("Failed to get public URL for image")
  return data.publicUrl
}
