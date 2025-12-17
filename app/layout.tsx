import './globals.css'
import type { Metadata } from 'next'
import { CartProvider } from '@/contexts/CartContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { Toaster } from '@/components/ui/sonner'
 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : undefined

export const metadata: Metadata = {
  title: 'Prinon',
  description: 'A modern web application',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="description" content="Prinon — A modern web application" />
        <meta httpEquiv="x-dns-prefetch-control" content="on" />
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
      </head>
      <body suppressHydrationWarning>
        <FavoritesProvider>
          <CartProvider>
            <main>{children}</main>
            <Toaster />
          </CartProvider>
        </FavoritesProvider>
      </body>
    </html>
  )
}
