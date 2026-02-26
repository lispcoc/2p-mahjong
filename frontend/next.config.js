/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 静的アセットに長期キャッシュヘッダーを設定（リクエスト節約）
  async headers() {
    return [
      {
        source: '/tiles/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
