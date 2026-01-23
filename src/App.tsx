
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { fetchPosts, createPost, type Post, deletePost, fetchPostById } from './utils/posts'
import { checkAuth, logout, login, register } from './authentication/auth'
import supabase from './utils/supabase'
import { uploadImage } from './utils/storage'


// `Post` type imported from utils/posts

type View = 'browse' | 'create' | 'login' | 'register' | 'single'

function Page() {
  const [posts, setPosts] = useState<Post[]>([])
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [isAuthed, setIsAuthed] = useState<boolean>(false)
  const [view, setView] = useState<View>('browse')
  const [creating, setCreating] = useState<boolean>(false)
  const [createError, setCreateError] = useState<string>("")
  const [createSuccess, setCreateSuccess] = useState<string>("")
  const [title, setTitle] = useState<string>("")
  const [content, setContent] = useState<string>("")  
  const [category, setCategory] = useState<string>("")
  const [myId, setMyId] = useState<string>("")
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [loginEmail, setLoginEmail] = useState<string>("")
  const [loginPassword, setLoginPassword] = useState<string>("")
  const [loginError, setLoginError] = useState<string>("")
  const [loggingIn, setLoggingIn] = useState<boolean>(false)
  const [registerEmail, setRegisterEmail] = useState<string>("")
  const [registerPassword, setRegisterPassword] = useState<string>("")
  const [registerError, setRegisterError] = useState<string>("")
  const [registerSuccess, setRegisterSuccess] = useState<string>("")
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [singlePost, setSinglePost] = useState<Post | null>(null)
  const [singleLoading, setSingleLoading] = useState<boolean>(false)
  const [singleError, setSingleError] = useState<string>("")
  const [deletingId, setDeletingId] = useState<string | number | null>(null)

  useEffect(() => {
    async function getPosts() {
      try {
        const data = await fetchPosts()
        setPosts(data)
      } catch (error: unknown) {
        console.error('Error fetching posts:', error instanceof Error ? error : String(error))
        setErrorMsg('Failed to load posts.')
      }
    }

    async function initAuth() {
      const { isAuthenticated, user } = await checkAuth()
      setIsAuthed(isAuthenticated)
      setMyId(user?.id || "")
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthed(!!session?.user)
      setMyId(session?.user?.id || "")
    })
    initAuth()
    getPosts()
    // Parse query for single post view and handle browser navigation
    function applyLocation() {
      const params = new URLSearchParams(window.location.search)
      const postId = params.get('post')
      if (postId) {
        setSelectedPostId(postId)
        setView('single')
      } else {
        setSelectedPostId(null)
        setView('browse')
      }
    }
    applyLocation()
    const onPop = () => applyLocation()
    window.addEventListener('popstate', onPop)
    return () => {
      sub.subscription.unsubscribe()
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  // Refetch posts when auth state changes (e.g., after login)
  useEffect(() => {
    async function refetchOnAuth() {
      try {
        const data = await fetchPosts()
        setPosts(data)
      } catch (error: unknown) {
        console.error('Error fetching posts after auth:', error instanceof Error ? error : String(error))
        setErrorMsg('Failed to load posts.')
      }
    }
    refetchOnAuth()
  }, [isAuthed])

  // Load a single post when selectedPostId changes
  useEffect(() => {
    async function loadSingle() {
      if (!selectedPostId) {
        setSinglePost(null)
        setSingleError("")
        setSingleLoading(false)
        return
      }
      setSingleLoading(true)
      setSingleError("")
      try {
        const post = await fetchPostById(selectedPostId)
        setSinglePost(post)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load post'
        setSingleError(msg)
      } finally {
        setSingleLoading(false)
      }
    }
    loadSingle()
  }, [selectedPostId])

  async function handleCreatePost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreateError("")
    setCreateSuccess("")
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    const trimmedCategory = category.trim()
    if (!trimmedTitle || !trimmedContent || !trimmedCategory) {
      setCreateError("Please provide a title, content, and category.")
      return
    }
    try {
      setCreating(true)
      let imageUrl: string | undefined
      if (imageFile) {
        imageUrl = await uploadImage(imageFile)
      }
      const created = await createPost(trimmedTitle, trimmedContent, trimmedCategory, imageUrl)
      setCreateSuccess("Post created!")
      setTitle("")
      setContent("")
      setCategory("")
      setImageFile(null)
      setImagePreview("")
      // Prepend the new post to the list without a full refetch
      setPosts((prev) => [created, ...prev])
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Error creating post:', msg)
      setCreateError(msg || 'Failed to create post.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string | number) {
    const confirmDelete = window.confirm('Delete this post?')
    if (!confirmDelete) return
    try {
      setDeletingId(id)
      await deletePost(id)
      setPosts((prev) => prev.filter((p) => p.id !== id))
      if (selectedPostId && String(id) === String(selectedPostId)) {
        // If we deleted the single post we were viewing, go back to browse
        window.history.pushState(null, '', '/')
        setSelectedPostId(null)
        setView('browse')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete'
      alert(msg)
    } finally {
      setDeletingId(null)
    }
  }

  function openPost(id: string | number, newTab = false) {
    const url = '/?post=' + encodeURIComponent(String(id))
    if (newTab) {
      window.open(url, '_blank')
      return
    }
    window.history.pushState(null, '', url)
    setSelectedPostId(String(id))
    setView('single')
  }

  // Deletion not available in this version; router changes reverted.

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoginError("")
    const email = loginEmail.trim()
    const password = loginPassword
    if (!email || !password) {
      setLoginError("Please provide email and password.")
      return
    }
    try {
      setLoggingIn(true)
      const { data, error } = await login(email, password)
      if (error) {
        setLoginError(error.message || 'Login failed.')
        return
      }
      if (data?.user) {
        setIsAuthed(true)
        setLoginEmail("")
        setLoginPassword("")
        setView('browse')
        const postsData = await fetchPosts()
        setPosts(postsData)
      }
    } catch (err: unknown) {
      setLoginError('Unexpected error during login.')
      console.error('Login error:', err instanceof Error ? err : String(err))
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRegisterError("")
    setRegisterSuccess("")
    const emailAddress = registerEmail.trim()
    const passwordValue = registerPassword
    if (!emailAddress || !passwordValue) {
      setRegisterError("Please provide email and password.")
      return
    }
    try {
      const { data, error } = await register(emailAddress, passwordValue)

      // Supabase duplicate email behavior: when an email is already registered,
      // signUp may return user with identities as an empty array and no error.
      const identities = (data as any)?.user?.identities
      const duplicateByIdentities = Array.isArray(identities) && identities.length === 0

      if (duplicateByIdentities) {
        setRegisterError('This email is already in use. Please log in or reset your password.')
        return
      }

      if (error) {
        const errorStatusCode = (error as any)?.status ?? 0
        const errorMessageLower = (error.message || '').toLowerCase()
        const isAlreadyUsed = errorStatusCode === 422 || errorStatusCode === 409 || errorMessageLower.includes('already') || errorMessageLower.includes('exists') || errorMessageLower.includes('registered') || errorMessageLower.includes('in use')
        setRegisterError(isAlreadyUsed ? 'This email is already in use. Please log in or reset your password.' : (error.message || 'Registration failed.'))
        return
      }

      // If no error and not a duplicate, success: Supabase will send a confirmation email
      setRegisterSuccess("Registration successful. Please check your email to confirm your account.")
      setRegisterEmail("")
      setRegisterPassword("")
    } catch (err: unknown) {
      setRegisterError('Unexpected error during registration.')
      console.error('Registration error:', err instanceof Error ? err : String(err))
    }
  }



  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold cursor-pointer" onClick={() => setView('browse')}>Supabase News</h1>
          <button
            className="md:hidden p-2 rounded hover:bg-gray-100 cursor-pointer"
            aria-label="Toggle Menu"
            onClick={() => setIsMenuOpen((v) => !v)}
          >
            <span className="block h-0.5 w-6 bg-gray-800 mb-1" />
            <span className="block h-0.5 w-6 bg-gray-800 mb-1" />
            <span className="block h-0.5 w-6 bg-gray-800" />
          </button>
          <nav className={`md:flex items-center sticky top-0 gap-2 ${isMenuOpen ? 'block' : 'hidden'} md:block`}>
            <button className={`px-3 py-1 rounded hover:bg-gray-100 cursor-pointer ${view==='browse' ? 'font-semibold' : ''}`} onClick={() => { setView('browse'); setIsMenuOpen(false) }}>Browse</button>
            {isAuthed && (
              <button className={`px-3 py-1 rounded hover:bg-gray-100 cursor-pointer ${view==='create' ? 'font-semibold' : ''}`} onClick={() => { setView('create'); setIsMenuOpen(false) }}>Create Article</button>
            )}
            {!isAuthed && (
              <>
                <button className={`px-3 py-1 rounded hover:bg-gray-100 cursor-pointer ${view==='login' ? 'font-semibold' : ''}`} onClick={() => { setView('login'); setIsMenuOpen(false) }}>Login</button>
                <button className={`px-3 py-1 rounded hover:bg-gray-100 cursor-pointer ${view==='register' ? 'font-semibold' : ''}`} onClick={() => { setView('register'); setIsMenuOpen(false) }}>Register</button>
              </>
            )}
            {isAuthed && (
              <button
                className="ml-2 px-3 py-1 rounded bg-gray-900 text-white hover:bg-gray-800 cursor-pointer"
                onClick={async () => {
                  const confirmLogout = window.confirm('Are you sure you want to logout?')
                  if (!confirmLogout) return
                  await logout()
                  setIsAuthed(false)
                  try {
                    const data = await fetchPosts()
                    setPosts(data)
                  } catch (err) {
                    console.error('Failed to reload posts after logout', err)
                  }
                  setView('browse')
                  setIsMenuOpen(false)
                }}
              >
                Logout
              </button>
            )}
          </nav>
        </div>
        {/* Mobile aside menu */}
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/30 md:hidden" onClick={() => setIsMenuOpen(false)} />
            <aside className="fixed right-0 top-0 h-full w-64 bg-white shadow-lg p-4 md:hidden flex flex-col gap-2">
              <button className={`text-left px-3 py-2 rounded hover:bg-gray-100 cursor-pointer ${view==='browse' ? 'font-semibold' : ''}`} onClick={() => { setView('browse'); setIsMenuOpen(false) }}>Browse</button>
              {isAuthed && (
                <button className={`text-left px-3 py-2 rounded hover:bg-gray-100 cursor-pointer ${view==='create' ? 'font-semibold' : ''}`} onClick={() => { setView('create'); setIsMenuOpen(false) }}>Create Article</button>
              )}
              {!isAuthed && (
                <>
                  <button className={`text-left px-3 py-2 rounded hover:bg-gray-100 cursor-pointer ${view==='login' ? 'font-semibold' : ''}`} onClick={() => { setView('login'); setIsMenuOpen(false) }}>Login</button>
                  <button className={`text-left px-3 py-2 rounded hover:bg-gray-100 cursor-pointer ${view==='register' ? 'font-semibold' : ''}`} onClick={() => { setView('register'); setIsMenuOpen(false) }}>Register</button>
                </>
              )}
              {isAuthed && (
                <button className="text-left mt-auto px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 cursor-pointer" onClick={async () => { const ok = window.confirm('Logout?'); if (!ok) return; await logout(); setIsAuthed(false); try { const data = await fetchPosts(); setPosts(data) } catch (err) { console.error('Failed to reload posts after logout', err) } ; setView('browse'); setIsMenuOpen(false) }}>Logout</button>
              )}
            </aside>
          </>
        )}
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {/* Browse view */}
        {view === 'browse' && (
          <section>
            <h2 className="text-lg font-medium mb-4">Latest Articles</h2>
            {errorMsg && <p className="text-red-600 mb-4">{errorMsg}</p>}
            {posts.length === 0 && !errorMsg && <p className="text-gray-600">No posts yet.</p>}
            <div className="grid gap-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="border rounded-lg bg-white p-4 hover:bg-gray-50 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => openPost(post.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') openPost(post.id)
                  }}
                >
                  <h3 className="text-xl font-semibold">
                    <a
                      href={`/?post=${encodeURIComponent(String(post.id))}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openPost(post.id) }}
                      className="hover:underline cursor-pointer"
                    >
                      {post.title}
                    </a>
                  </h3>
                  {post.category && (
                    <div className="mt-1 text-sm text-gray-600">Category: {post.category}</div>
                  )}
                  {post.image_url && (
                    <img src={post.image_url} alt="Article" className="mt-3 max-h-64 w-full object-cover rounded" />
                  )}
                  {post.content && <p className="mt-2 text-gray-700">{post.content}</p>}
                  <div className="mt-3 text-sm text-gray-500">
                    {post.created_at ? new Date(post.created_at).toLocaleString() : ''}
                    {post.user_id ? ` • by ${post.user_id}` : ''}
                  </div>
                  {isAuthed && post.user_id === myId && (
                    <div className="mt-3">
                      <button
                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={(e) => { e.stopPropagation(); handleDelete(post.id) }}
                        disabled={deletingId === post.id}
                      >
                        {deletingId === post.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Single post view */}
        {view === 'single' && (
          <section>
            {singleLoading && <p>Loading…</p>}
            {singleError && <p className="text-red-600">{singleError}</p>}
            {!singleLoading && !singleError && singlePost && (
              <article className="border rounded-lg bg-white p-4">
                <button className="mb-3 text-sm text-blue-600 hover:underline cursor-pointer" onClick={() => { window.history.pushState(null, '', '/'); setSelectedPostId(null); setView('browse') }}>&larr; Back</button>
                <h1 className="text-2xl font-bold">{singlePost.title}</h1>
                {singlePost.category && (
                  <div className="mt-1 text-sm text-gray-600">Category: {singlePost.category}</div>
                )}
                {singlePost.image_url && (
                  <img src={singlePost.image_url} alt="Article" className="mt-3 max-h-96 w-full object-cover rounded" />
                )}
                {singlePost.content && <p className="mt-3 text-gray-800 whitespace-pre-wrap">{singlePost.content}</p>}
                <div className="mt-3 text-sm text-gray-500">
                  {singlePost.created_at ? new Date(singlePost.created_at).toLocaleString() : ''}
                  {singlePost.user_id ? ` • by ${singlePost.user_id}` : ''}
                </div>
                {isAuthed && singlePost.user_id === myId && (
                  <button
                    className="mt-4 px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => handleDelete(singlePost.id)}
                    disabled={deletingId === singlePost.id}
                  >
                    {deletingId === singlePost.id ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </article>
            )}
            {!singleLoading && !singleError && !singlePost && (
              <p>Post not found.</p>
            )}
          </section>
        )}

        {/* Create view (protected) */}
        {view === 'create' && (
          <section className="max-w-xl">
            {!isAuthed ? (
              <p className="text-gray-700">You must be logged in to create an article.</p>
            ) : (
              <form id="create-post-form" onSubmit={handleCreatePost} className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-sm text-gray-700">Title</span>
                  <input
                    className="border rounded px-3 py-2"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Article title"
                    required
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-gray-700">Category</span>
                  <input
                    className="border rounded px-3 py-2"
                    name="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Technology, Sports"
                    required
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-gray-700">Content</span>
                  <textarea
                    className="border rounded px-3 py-2 min-h-32"
                    name="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your article content..."
                    required
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm text-gray-700">Image (optional)</span>
                  <input
                    className="border rounded px-3 py-2"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setImageFile(file)
                      if (file) {
                        const url = URL.createObjectURL(file)
                        setImagePreview(url)
                      } else {
                        setImagePreview("")
                      }
                    }}
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="mt-2 max-h-48 rounded border object-contain" />
                  )}
                </label>
                <button type="submit" disabled={creating} className="mt-2 inline-flex items-center justify-center rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-500 disabled:opacity-50">
                  {creating ? 'Submitting…' : 'Submit'}
                </button>
                {createError && <p className="text-red-600">{createError}</p>}
                {createSuccess && <p className="text-green-700">{createSuccess}</p>}
              </form>
            )}
          </section>
        )}

        {/* Login view */}
        {view === 'login' && !isAuthed && (
          <section className="max-w-sm">
            <form id="login-form" onSubmit={handleLogin} className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-gray-700">Email</span>
                <input
                  className="border rounded px-3 py-2"
                  name="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-gray-700">Password</span>
                <input
                  className="border rounded px-3 py-2"
                  name="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>
              <button type="submit" disabled={loggingIn} className="mt-2 inline-flex items-center justify-center rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-500 disabled:opacity-50">
                {loggingIn ? 'Logging in…' : 'Login'}
              </button>
              {loginError && <p className="text-red-600">{loginError}</p>}
            </form>
          </section>
        )}

        {/* Register view */}
        {view === 'register' && !isAuthed && (
          <section className="max-w-sm">
            <form id="register-form" onSubmit={handleRegister} className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-gray-700">Email</span>
                <input
                  className="border rounded px-3 py-2"
                  name="email"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-gray-700">Password</span>
                <input
                  className="border rounded px-3 py-2"
                  name="password"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>
              <button type="submit" className="mt-2 inline-flex items-center justify-center rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-500">
                Register
              </button>
              {registerError && <p className="text-red-600">{registerError}</p>}
              {registerSuccess && <p className="text-green-700">{registerSuccess}</p>}
            </form>
            <p className="mt-2 text-sm text-gray-600">After registering, check your email to confirm before logging in.</p>
          </section>
        )}
      </main>
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 text-sm text-gray-500">© {new Date().getFullYear()} Supabase News</div>
      </footer>
    </div>
  )
}
export default Page
