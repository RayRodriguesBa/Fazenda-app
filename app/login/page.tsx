import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import LoginForm from '@/app/components/LoginForm'

export const metadata = {
  title: 'Login - Pecuária F3',
  description: 'Faça login na sua conta Pecuária F3',
}

export default async function LoginPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getSession()

  if (data?.session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-[450px] bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-gray-100">
        <LoginForm />
      </div>
    </div>
  )
}
