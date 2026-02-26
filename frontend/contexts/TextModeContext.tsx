'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface TextModeContextType {
  textMode: boolean
  setTextMode: (value: boolean) => void
  toggleTextMode: () => void
}

const TextModeContext = createContext<TextModeContextType>({
  textMode: false,
  setTextMode: () => {},
  toggleTextMode: () => {},
})

export function TextModeProvider({ children }: { children: ReactNode }) {
  const [textMode, setTextMode] = useState(false)

  // localStorage から初期値を読み込む
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mahjong-text-mode')
      if (saved === 'true') {
        setTextMode(true)
      }
    } catch (e) {}
  }, [])

  const toggleTextMode = () => {
    setTextMode(prev => {
      const newVal = !prev
      try {
        localStorage.setItem('mahjong-text-mode', String(newVal))
      } catch (e) {}
      return newVal
    })
  }

  const handleSetTextMode = (value: boolean) => {
    setTextMode(value)
    try {
      localStorage.setItem('mahjong-text-mode', String(value))
    } catch (e) {}
  }

  return (
    <TextModeContext.Provider value={{ textMode, setTextMode: handleSetTextMode, toggleTextMode }}>
      {children}
    </TextModeContext.Provider>
  )
}

export function useTextMode() {
  return useContext(TextModeContext)
}
