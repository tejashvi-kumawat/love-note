import { useEffect, useRef, useState } from 'react'
import './AnimatedBackground.css'

const AnimatedBackground = () => {
  const containerRef = useRef(null)
  const heartsRef = useRef([])
  const animationFrameRef = useRef(null)
  const [hearts, setHearts] = useState([])

  useEffect(() => {
    const initializeHearts = () => {
      const container = containerRef.current
      if (!container) return []

      const containerRect = container.getBoundingClientRect()
      const minDistance = 80 // Minimum distance between hearts when spawning
      const hearts = []
      
      // Create hearts with proper spacing
      for (let i = 0; i < 25; i++) {
        let attempts = 0
        let x, y
        let validPosition = false

        // Try to find a valid position that's not too close to other hearts
        // Mix of random positions and center positions
        while (!validPosition && attempts < 50) {
          // Some hearts spawn from center, some from random positions
          if (i % 3 === 0) {
            // Spawn from center bottom
            x = containerRect.width / 2 + (Math.random() - 0.5) * 200
          } else {
            // Spawn from random positions
            x = Math.random() * containerRect.width
          }
          y = containerRect.height + Math.random() * 200 // Start from bottom
          
          // Check distance from all existing hearts
          validPosition = true
          for (const existingHeart of hearts) {
            const dx = x - existingHeart.x
            const dy = y - existingHeart.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance < minDistance) {
              validPosition = false
              break
            }
          }
          attempts++
        }

        const isBig = i % 5 === 0
        const sizeMultiplier = isBig ? (2 + Math.random() * 1) : (0.9 + Math.random() * 0.3)
        const delay = i * 0.5 + Math.random() * 1

        hearts.push({
          id: i,
          x,
          y,
          baseVy: -0.6 - Math.random() * 0.3, // Constant upward velocity
          vx: (Math.random() - 0.5) * 0.2, // Small horizontal drift
          vy: -0.6 - Math.random() * 0.3,
          size: sizeMultiplier,
          isBig,
          delay,
          opacity: 0,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 1,
          startTime: Date.now() + delay * 1000,
        })
      }

      return hearts
    }

    // Initialize hearts
    const initialHearts = initializeHearts()
    setHearts(initialHearts)
    heartsRef.current = initialHearts

    // Animation loop
    const animate = () => {
      const container = containerRef.current
      if (!container) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const containerRect = container.getBoundingClientRect()
      const currentTime = Date.now()
      const updatedHearts = heartsRef.current.map((heart, index) => {
        // Skip if delay hasn't passed
        if (currentTime < heart.startTime) {
          return heart
        }

        let { x, y, vx, vy, opacity, rotation, baseVy } = heart

        // Restore base upward velocity
        vy = baseVy + (vy - baseVy) * 0.95

        // Collision detection and response
        heartsRef.current.forEach((otherHeart, otherIndex) => {
          if (index === otherIndex || currentTime < otherHeart.startTime) return

          const dx = x - otherHeart.x
          const dy = y - otherHeart.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const collisionRadius = 60 // Distance at which collision starts

          if (distance < collisionRadius && distance > 0) {
            // Calculate repulsion force (stronger when closer)
            const overlap = collisionRadius - distance
            const force = (overlap / collisionRadius) * 0.5
            const angle = Math.atan2(dy, dx)
            
            // Apply horizontal repulsion (main effect)
            const horizontalForce = Math.cos(angle) * force
            vx += horizontalForce
            
            // Apply slight vertical repulsion (less effect to maintain upward movement)
            const verticalForce = Math.sin(angle) * force * 0.2
            vy += verticalForce
            
            // Push other heart away too
            const otherHeartData = heartsRef.current[otherIndex]
            if (otherHeartData && currentTime >= otherHeartData.startTime) {
              otherHeartData.vx -= horizontalForce * 0.7
              otherHeartData.vy -= verticalForce * 0.5
            }
          }
        })

        // Damping - only horizontal velocity
        vx *= 0.96
        
        // Ensure upward movement continues
        vy = Math.max(baseVy * 0.8, vy)

        // Update position
        x += vx
        y += vy
        rotation += heart.rotationSpeed

        // Wrap around horizontally
        if (x < -50) x = containerRect.width + 50
        if (x > containerRect.width + 50) x = -50

        // Reset when off screen top
        if (y < -50) {
          // Find a good spawn position
          let newX, newY
          let attempts = 0
          let validPosition = false

          while (!validPosition && attempts < 30) {
            // Mix of center and random spawns
            if (Math.random() < 0.3) {
              // 30% chance to spawn from center
              newX = containerRect.width / 2 + (Math.random() - 0.5) * 200
            } else {
              newX = Math.random() * containerRect.width
            }
            newY = containerRect.height + Math.random() * 100

            validPosition = true
            heartsRef.current.forEach((otherHeart) => {
              if (otherHeart.id === heart.id) return
              const dx = newX - otherHeart.x
              const dy = newY - otherHeart.y
              const distance = Math.sqrt(dx * dx + dy * dy)
              if (distance < 80) {
                validPosition = false
              }
            })
            attempts++
          }

          x = newX || Math.random() * containerRect.width
          y = newY || containerRect.height + Math.random() * 100
          vx = (Math.random() - 0.5) * 0.2
          vy = baseVy
          opacity = 0
          rotation = Math.random() * 360
        }

        // Fade in
        if (y < containerRect.height - 50 && opacity < 0.7) {
          opacity = Math.min(0.7, opacity + 0.03)
        }

        // Fade out near top
        if (y < 100) {
          opacity = Math.max(0, opacity - 0.02)
        }

        return {
          ...heart,
          x,
          y,
          vx,
          vy,
          opacity,
          rotation,
        }
      })

      heartsRef.current = updatedHearts
      setHearts(updatedHearts)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate)

    // Handle resize
    const handleResize = () => {
      const container = containerRef.current
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      heartsRef.current = heartsRef.current.map(heart => ({
        ...heart,
        x: Math.min(heart.x, containerRect.width),
      }))
      setHearts([...heartsRef.current])
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="animated-background">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className={`floating-heart ${heart.isBig ? 'big-floating-heart' : ''}`}
          style={{
            left: `${heart.x}px`,
            top: `${heart.y}px`,
            '--size-multiplier': heart.size,
            transform: `translate(-50%, -50%) rotate(${heart.rotation}deg)`,
            opacity: heart.opacity,
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="none" strokeWidth="0" fillRule="evenodd"/>
          </svg>
        </div>
      ))}

      {/* Corner hearts */}
      <div className="corner-heart corner-heart-top-left">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="none" strokeWidth="0" fillRule="evenodd"/>
        </svg>
      </div>
      <div className="corner-heart corner-heart-top-right">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="none" strokeWidth="0" fillRule="evenodd"/>
        </svg>
      </div>
      <div className="corner-heart corner-heart-bottom-left">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="none" strokeWidth="0" fillRule="evenodd"/>
        </svg>
      </div>
      <div className="corner-heart corner-heart-bottom-right">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="none" strokeWidth="0" fillRule="evenodd"/>
        </svg>
      </div>
    </div>
  )
}

export default AnimatedBackground
