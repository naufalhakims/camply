import { createClient } from '@supabase/supabase-js'

/**
 * Reads a required public config value.
 *
 * Only `VITE_`-prefixed variables live in `import.meta.env`, and every one of
 * them ships inside the browser bundle. Secret keys belong in Supabase Edge
 * Function secrets, never here.
 *
 * Failing loudly beats failing silently: without this, a missing variable
 * surfaces as a confusing network error much later.
 */
function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`)
  }
  return value
}

export const supabase = createClient(
  required('VITE_SUPABASE_URL'),
  required('VITE_SUPABASE_PUBLISHABLE_KEY'),
)
