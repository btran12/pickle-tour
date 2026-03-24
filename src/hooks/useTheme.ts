import { useEffect, useState } from 'react'

export function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('pb_theme') === 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '')
    localStorage.setItem('pb_theme', dark ? 'dark' : 'light')
  }, [dark])

  return { dark, toggleTheme: () => setDark(d => !d) }
}
