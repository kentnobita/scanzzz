import './globals.css'

export const metadata = {
  title: 'Scan Pro Max — Trích Xuất Phiếu Giao Hàng & Kho',
  description: 'Ứng dụng scan và trích xuất dữ liệu phiếu xuất nhập kho chuyên nghiệp bằng AI Vision',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ScanPhiếu',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#2563eb',
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased text-slate-900 bg-slate-50 selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  )
}
