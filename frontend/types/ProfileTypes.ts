/**
 * プロフィール型定義
 */

export type Gender = 'male' | 'female' | 'other' | ''

export interface ProfileSummary {
  id: string
  name: string
  gender: Gender
  origin: string
  bio: string
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
}
