import supabase from "./supabase"

export type Post = {
  id: string | number
  title: string
  content?: string
  category?: string
  created_at?: string
  user_id?: string
  image_url?: string
}

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id,title,content,category,created_at,user_id,image_url")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data as Post[]) ?? []
}

export async function createPost(title: string, content: string, category: string, imageUrl?: string): Promise<Post> {
  // Ensure we have an authenticated user and attach user_id for RLS
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) throw new Error(userErr.message)
  const uid = userData?.user?.id
  if (!uid) throw new Error("Not authenticated. Please log in.")

  // Insert with minimal returning to avoid RLS 'returning' pitfalls
  const { error: insertError } = await supabase
    .from("posts")
    .insert([{ title, content, category, user_id: uid, image_url: imageUrl }])

  if (insertError) throw new Error(insertError.message)

  // Fetch the most recent post by this user as the created row
  const { data: createdRow, error: fetchError } = await supabase
    .from("posts")
    .select("id,title,content,category,created_at,user_id,image_url")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (fetchError) throw new Error(fetchError.message)
  return createdRow as Post
}

export async function fetchPostById(id: string | number): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('id,title,content,category,created_at,user_id,image_url')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data as Post
}

export async function deletePost(id: string | number): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}
