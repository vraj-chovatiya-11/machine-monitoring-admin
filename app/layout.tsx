import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Machine Monitoring System',
  description: 'Real-time machine monitoring and log viewer',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

