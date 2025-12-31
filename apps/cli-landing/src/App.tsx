import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { Installation } from '@/components/Installation'
import { Commands } from '@/components/Commands'
import { Footer } from '@/components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-base-300 text-base-content flex flex-col">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Features />
        <Installation />
        <Commands />
      </main>
      <Footer />
    </div>
  )
}

export default App
