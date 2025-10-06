import { Inter } from ‘next/font/google’
import ‘./globals.css’

const inter = Inter({ subsets: [‘latin’] })

export const metadata = {
title: ‘NFL Fantasy Trade Analyzer’,
description: ‘Analyze and find the best fantasy football trades for your league’,
keywords: ‘NFL, fantasy football, trade analyzer, fantasy trades’,
}

export default function RootLayout({ children }) {
return (
<html lang="en">
<body className={inter.className}>
<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
<nav className="bg-white shadow-lg border-b border-gray-200">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div className="flex justify-between h-16 items-center">
<div className="flex items-center">
<span className="text-2xl font-bold text-primary-600">🏈</span>
<span className="ml-2 text-xl font-bold text-gray-900">
NFL Fantasy Trade Analyzer
</span>
</div>
<div className="hidden md:flex items-center space-x-4">
<a
href="/"
className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
>
Analyzer
</a>
<a
href="/setup"
className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
>
League Setup
</a>
</div>
</div>
</div>
</nav>
<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
{children}
</main>
<footer className="bg-white border-t border-gray-200 mt-12">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
<p className="text-center text-gray-500 text-sm">
© 2025 NFL Fantasy Trade Analyzer. Data provided by ESPN API.
</p>
</div>
</footer>
</div>
</body>
</html>
)
}
