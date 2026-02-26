'use client'

import React from 'react'
import { TextModeProvider } from '../contexts/TextModeContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TextModeProvider>{children}</TextModeProvider>
  )
}
