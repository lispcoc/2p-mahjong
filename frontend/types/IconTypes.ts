/**
 * プレイヤーアイコンのトリミング情報付きエントリ
 */
export interface IconEntry {
  /** 一意ID (ライブラリ内で識別するため) */
  id: string
  /** 元の画像 data URL (オリジナルサイズ、未クロップ) */
  data: string
  /**
   * ユーザースケール (1.0 = 画像が 3:4 フレームをカバーするベーススケール)
   * 1.0 未満は許可しない (空白が出るため)
   */
  scale: number
  /**
   * 中心からのX方向オフセット (フレーム幅の割合)
   * 0 = 中央, 正 = 右, 負 = 左
   */
  offsetX: number
  /**
   * 中心からのY方向オフセット (フレーム高さの割合)
   * 0 = 中央, 正 = 下, 負 = 上
   */
  offsetY: number
}

/** ライブラリのローカルストレージキー (V2: IconEntry[]) */
export const ICON_LIBRARY_V2_KEY = 'mahjong-icon-library-v2'
/** アクティブアイコンのレンダリング済み data URL キー (後方互換) */
export const ICON_ACTIVE_KEY = 'mahjong-player-icon'
/** アクティブ entry の ID キー */
export const ICON_ACTIVE_ID_KEY = 'mahjong-icon-active-id'
/** 旧ライブラリキー (マイグレーション用) */
export const ICON_LIBRARY_LEGACY_KEY = 'mahjong-icon-library'
