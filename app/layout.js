import './globals.css'

export const metadata = {
  title: 'NFL Trade Analyzer',
  description: 'Analyze fantasy football trades with real NFL data',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
