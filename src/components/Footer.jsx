import { business } from '../data/business.js'

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 py-8 text-center text-[0.85rem] text-inkdim">
      <div className="max-w-[1120px] mx-auto px-7">
        © {new Date().getFullYear()} <span className="text-brand-pink font-bold">{business.name}</span> —{' '}
        {business.instagramHandle}
      </div>
    </footer>
  )
}
