/**
 * Конфигурация Supabase
 * Значения берутся из переменных окружения Vite
 */

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

/**
 * Проверка наличия конфигурации Supabase
 * @returns {boolean} true если Supabase настроен
 */
export function isSupabaseConfigured() {
  return !!(supabaseConfig.url && supabaseConfig.anonKey);
}

/**
 * Валидация конфигурации с логированием
 * @returns {boolean} true если конфигурация валидна
 */
export function validateConfig() {
  if (!supabaseConfig.url) {
    console.warn('[Supabase] VITE_SUPABASE_URL не задан');
    return false;
  }

  if (!supabaseConfig.anonKey) {
    console.warn('[Supabase] VITE_SUPABASE_ANON_KEY не задан');
    return false;
  }

  // Проверяем формат URL
  try {
    new URL(supabaseConfig.url);
  } catch {
    console.error('[Supabase] Некорректный формат URL:', supabaseConfig.url);
    return false;
  }

  console.log('[Supabase] Конфигурация валидна');
  return true;
}
