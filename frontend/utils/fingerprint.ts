/**
 * Browser Fingerprint Generator
 *
 * IPアドレスが変わっても同一デバイス・ブラウザを高精度に識別するための
 * ブラウザフィンガープリントを生成するユーティリティ。
 *
 * 収集するシグナル:
 *   - User-Agent / Platform / Language
 *   - 画面解像度・色深度
 *   - タイムゾーン
 *   - Canvas 2D描画フィンガープリント
 *   - WebGL レンダラー/ベンダー情報
 *   - ハードウェア並列数・デバイスメモリ
 *   - タッチ対応フラグ
 *   - インストール済みプラグイン
 *   - Audio コンテキスト特性
 *
 * 最終的に SHA-256 ハッシュの先頭32文字を返す。
 * （ブラウザの WebCrypto API に依存; 非対応環境では DJB2 フォールバック）
 */

/** Canvas 2D フィンガープリントを文字列で返す */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    // 背景グラデーション
    const grad = ctx.createLinearGradient(0, 0, 240, 60)
    grad.addColorStop(0, '#f0e68c')
    grad.addColorStop(1, '#6495ed')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 240, 60)

    // マルチフォント文字列
    ctx.fillStyle = '#1a1a2e'
    ctx.font = '14px Arial, sans-serif'
    ctx.fillText('Cwm fjord-bank glyphs vext quiz \u9EFB\u308C\u592A\u9f8d \u30C6\u30B9\u30C8', 8, 22)
    ctx.font = 'bold 11px Times New Roman, serif'
    ctx.fillStyle = 'rgba(200,50,80,0.85)'
    ctx.fillText('\u2665 fingerprint \u2660 2026', 8, 45)

    // 幾何図形
    ctx.beginPath()
    ctx.arc(210, 30, 18, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(100,200,100,0.5)'
    ctx.fill()

    return canvas.toDataURL()
  } catch {
    return 'canvas-error'
  }
}

/** WebGL レンダラー/ベンダー文字列を返す */
function getWebGLInfo(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return 'no-webgl'

    const dbgRenderInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!dbgRenderInfo) return 'no-debug-info'

    const vendor = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL) || ''
    const renderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL) || ''
    return `${vendor}::${renderer}`
  } catch {
    return 'webgl-error'
  }
}

/** AudioContext を使った oscillator 特性フィンガープリント */
async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return 'no-audio'

    const ctx = new AudioContext()

    // AudioContext が suspended 状態（ユーザー操作待ち）の場合は resume を試みる
    // 失敗してもフォールバックするので問題なし
    if (ctx.state === 'suspended') {
      try { await ctx.resume() } catch {}
    }

    // resume しても suspended のままなら諦める（ブラウザ制限）
    if (ctx.state === 'suspended') {
      try { ctx.close() } catch {}
      return 'audio-suspended'
    }

    // createScriptProcessor は非推奨だが互換性のため使用
    // 利用不可の場合はフォールバック
    if (typeof ctx.createScriptProcessor !== 'function') {
      try { ctx.close() } catch {}
      return 'no-script-processor'
    }

    const oscillator = ctx.createOscillator()
    const analyser = ctx.createAnalyser()
    const gain = ctx.createGain()
    const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1)

    gain.gain.value = 0 // 音を出さない
    oscillator.type = 'triangle'
    oscillator.frequency.value = 10000

    oscillator.connect(analyser)
    analyser.connect(scriptProcessor)
    scriptProcessor.connect(gain)
    gain.connect(ctx.destination)

    return new Promise<string>((resolve) => {
      let resolved = false

      scriptProcessor.onaudioprocess = (e) => {
        if (resolved) return
        resolved = true
        const buf = e.inputBuffer.getChannelData(0)
        // 最初の 50 サンプルの合計をハッシュ素材にする
        let sum = 0
        for (let i = 0; i < Math.min(50, buf.length); i++) {
          sum += Math.abs(buf[i])
        }
        oscillator.disconnect()
        analyser.disconnect()
        scriptProcessor.disconnect()
        gain.disconnect()
        try { ctx.close() } catch {}
        resolve(sum.toFixed(10))
      }

      oscillator.start(0)
      // 150ms タイムアウト（接続遅延を最小化）
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          try { oscillator.stop(); ctx.close() } catch {}
          resolve('audio-timeout')
        }
      }, 150)
    })
  } catch {
    return 'audio-error'
  }
}

/** プラグイン一覧の簡易ハッシュ文字列を返す */
function getPluginString(): string {
  try {
    const plugins = navigator.plugins
    if (!plugins || plugins.length === 0) return 'no-plugins'
    return Array.from(plugins)
      .map((p) => `${p.name}:${p.filename}`)
      .sort()
      .join('|')
      .slice(0, 256)
  } catch {
    return 'plugins-error'
  }
}

/** DJB2 フォールバックハッシュ（WebCrypto 非対応時） */
function djb2Hash(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
    h = h >>> 0 // unsigned 32-bit
  }
  return h.toString(16).padStart(8, '0').repeat(4) // 32 文字に揃える
}

/** SHA-256 ハッシュを返す（前32文字） */
async function sha256(str: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(str)
    const hashBuf = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32)
  } catch {
    return djb2Hash(str).slice(0, 32)
  }
}

/**
 * ブラウザフィンガープリントを生成して返す。
 *
 * @returns 32文字の16進数ハッシュ文字列
 *
 * @example
 * const fp = await generateFingerprint()
 * // => "a3f12b9c0e8d74521f6bc3a90d284e17"
 */
export async function generateFingerprint(): Promise<string> {
  const nav = navigator

  const signals: Record<string, string | number | boolean> = {
    ua: nav.userAgent || '',
    platform: nav.platform || '',
    language: nav.language || '',
    languages: (nav.languages || []).join(','),
    screenW: screen.width,
    screenH: screen.height,
    screenAvailW: screen.availWidth,
    screenAvailH: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    devicePixelRatio: window.devicePixelRatio || 1,
    timezoneOffset: new Date().getTimezoneOffset(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    hardwareConcurrency: nav.hardwareConcurrency || 0,
    deviceMemory: (nav as any).deviceMemory || 0,
    maxTouchPoints: nav.maxTouchPoints || 0,
    cookieEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack || '',
    plugins: getPluginString(),
    canvas: getCanvasFingerprint(),
    webgl: getWebGLInfo(),
  }

  // Audio は非同期
  const audio = await getAudioFingerprint()
  signals.audio = audio

  const raw = Object.entries(signals)
    .map(([k, v]) => `${k}=${v}`)
    .join('||')

  return sha256(raw)
}
