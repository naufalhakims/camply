/// <reference types="vite/client" />

// Declaring these makes a typo like `VITE_SUPABASE_ANNON_KEY` a compile error
// instead of `undefined` at runtime.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
