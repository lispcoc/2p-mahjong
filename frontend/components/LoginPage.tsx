'use client'

import React, { useState } from 'react'
import styles from './LoginPage.module.css'

interface LoginPageProps {
  onLogin: (name: string) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [playerName, setPlayerName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = playerName.trim()

    if (!trimmedName) {
      setError('プレイヤー名を入力してください')
      return
    }

    if (trimmedName.length > 20) {
      setError('プレイヤー名は20文字以内にしてください')
      return
    }

    setError('')
    onLogin(trimmedName)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>二人麻雀</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="playerName" className={styles.label}>
              プレイヤー名
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="名前を入力"
              className={styles.input}
              autoFocus
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button}>
            ログイン
          </button>
        </form>
      </div>
    </div>
  )
}
