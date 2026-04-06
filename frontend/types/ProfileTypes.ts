/**
 * プロフィール型定義
 */

export type Gender = 'male' | 'female' | 'other' | ''

/** 名前＋出身(作品)＋性別のセット */
export interface AliasEntry {
  name: string
  origin: string
  gender: Gender
}

export interface ProfileSummary {
  id: string
  name: string
  gender: Gender
  origin: string
  bio: string
  aliases: AliasEntry[]
  trip: string
  createdAt: string
  updatedAt: string
}

export interface ProfileDetail extends ProfileSummary {
  activeHours: string
  bio2: string
}

export interface ProfileFormData {
  name: string
  password: string
  gender: Gender
  origin: string
  bio: string
  activeHours: string
  bio2: string
  aliases: AliasEntry[]
  trip: string
}
