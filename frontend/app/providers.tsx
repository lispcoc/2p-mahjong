'use client'

import React from 'react'
import { TextModeProvider } from '../contexts/TextModeContext'
import { WhiteModeProvider } from '../contexts/WhiteModeContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TextModeProvider>
      <WhiteModeProvider>{children}</WhiteModeProvider>
    </TextModeProvider>
  )
}
