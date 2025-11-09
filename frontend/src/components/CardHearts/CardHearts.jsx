import './CardHearts.css'

const CardHearts = ({ opacity = 0.25, count = 8 }) => {
  return (
    <div className="card-hearts" style={{ '--heart-opacity': opacity }}>
      {[...Array(count)].map((_, i) => {
        const delay = Math.random() * 5
        const duration = 8 + Math.random() * 6
        const startX = Math.random() * 100
        const startY = 80 + Math.random() * 20 // Start from bottom (80-100%)
        // Mix of sizes: some small, some 2-4x bigger
        const isBig = i % 3 === 0 || i % 4 === 0 // More big hearts (every 3rd or 4th)
        const sizeMultiplier = isBig ? (2.5 + Math.random() * 1.5) : (0.8 + Math.random() * 0.4) // Big: 2.5-4x, Small: 0.8-1.2x
        return (
          <div
            key={i}
            className={`card-heart ${isBig ? 'big-heart' : ''}`}
            style={{
              left: `${startX}%`,
              bottom: `${100 - startY}%`,
              '--animation-delay': `${delay}s`,
              '--animation-duration': `${duration}s`,
              '--start-y': `${startY}%`,
              '--size-multiplier': sizeMultiplier,
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </div>
        )
      })}
    </div>
  )
}

export default CardHearts

