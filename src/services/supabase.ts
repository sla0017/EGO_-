import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ""
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    supabaseAnonKey.length > 20,
)

// Supabase 클라이언트 초기화 (설정값이 없을 때는 안전한 더미 클라이언트 방어)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient("https://placeholder.supabase.co", "placeholder-anon-key")

/**
 * Supabase 연결 상태 테스트 헬퍼 함수
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean
  message: string
}> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      message: ".env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해 주세요.",
    }
  }

  try {
    const { error } = await supabase.from("profiles").select("id").limit(1)
    if (error && error.code !== "PGRST116") {
      return {
        connected: false,
        message: `연결 오류: ${error.message}`,
      }
    }
    return {
      connected: true,
      message: "Supabase 서버와 성공적으로 연결되었습니다!",
    }
  } catch (err: any) {
    return {
      connected: false,
      message: `네트워크 오류: ${err.message || err}`,
    }
  }
}
