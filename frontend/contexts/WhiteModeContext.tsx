'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface WhiteModeContextType {
  whiteMode: boolean
  setWhiteMode: (value: boolean) => void
  toggleWhiteMode: () => void
}

const WhiteModeContext = createContext<WhiteModeContextType>({
  whiteMode: false,
  setWhiteMode: () => {},
  toggleWhiteMode: () => {},
})

export function WhiteModeProvider({ children }: { children: ReactNode }) {
  const [whiteMode, setWhiteMode] = useState(false)

  // localStorage から初期値を読み込む
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mahjong-white-mode')
      if (saved === 'true') {
        setWhiteMode(true)
        document.documentElement.setAttribute('data-theme', 'white')
      }
    } catch (e) {}
  }, [])

  // whiteMode の変更時に data-theme 属性を更新
  useEffect(() => {
    if (whiteMode) {
      document.documentElement.setAttribute('data-theme', 'white')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [whiteMode])

  const toggleWhiteMode = () => {
    setWhiteMode(prev => {
      const newVal = !prev
      try {
        localStorage.setItem('mahjong-white-mode', String(newVal))
      } catch (e) {}
      return newVal
    })
  }

  const handleSetWhiteMode = (value: boolean) => {
    setWhiteMode(value)
    try {
      localStorage.setItem('mahjong-white-mode', String(value))
    } catch (e) {}
  }

  return (
    <WhiteModeContext.Provider value={{ whiteMode, setWhiteMode: handleSetWhiteMode, toggleWhiteMode }}>
      {children}
    </WhiteModeContext.Provider>
  )
}

export function useWhiteMode() {
  return useContext(WhiteModeContext)
}
