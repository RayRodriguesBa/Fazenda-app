'use client'

import { useState } from 'react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const isFormValid = email.trim() !== '' && password.trim() !== ''

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isFormValid) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao fazer login')
        setPassword('')
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      setError('Algo deu errado. Tente novamente.')
      setPassword('')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center flex flex-col items-center">
        <img src="/imagens/LogoPecuariaF3.jpeg" alt="Logo Pecuária F3" className="w-128 h-auto object-contain mb-4 rounded-xl" />
        <h1 className="text-3xl font-bold text-[var(--primary)] font-merriweather hidden">
          Pecuária F3
        </h1>
      </div>

      <h2 className="text-2xl font-semibold text-[var(--text)] mb-6 font-poppins text-center">
        Bem-vindo de volta
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[var(--text)] mb-2 font-poppins"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            disabled={isLoading}
            className="w-full px-4 py-2 border-2 border-[var(--primary)] rounded-lg text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 font-poppins transition"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--text)] mb-2 font-poppins"
          >
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            className="w-full px-4 py-2 border-2 border-[var(--primary)] rounded-lg text-[var(--text)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 font-poppins transition"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-[var(--error)] rounded-lg text-[var(--error)] text-sm font-poppins">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="w-full py-2 px-4 rounded-lg font-semibold font-poppins transition duration-200 flex items-center justify-center gap-2
              disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed
              enabled:bg-[var(--primary)] enabled:text-white enabled:hover:bg-[#1a3009]"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Autenticando...
            </>
          ) : (
            'Entrar'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6 font-poppins">
        Produto Pecuária F3 © 2026
      </p>
    </div>
  )
}
