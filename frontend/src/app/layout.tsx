import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { BackgroundProvider } from '@/contexts/BackgroundContext'
import './globals.css'

const playfair = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Chess Guild',
  description: 'Evolua no xadrez com progressão RPG. Jogue contra bots, analise suas partidas e suba de nível.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BackgroundProvider>
          {children}
        </BackgroundProvider>
      </body>
    </html>
  )
}
