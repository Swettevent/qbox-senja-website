import type { Metadata } from 'next'
import { Roboto, Lora } from 'next/font/google'
import './globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-roboto',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Qbox Senja',
  description: 'Schema för Qbox konferensresa Stockholm–Senja, 16–20 september',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={`${roboto.variable} ${lora.variable}`}>{children}</body>
    </html>
  )
}
