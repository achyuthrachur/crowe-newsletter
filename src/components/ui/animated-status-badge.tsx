"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Check } from "lucide-react"

interface AnimatedStatusBadgeProps {
  trigger: boolean
  onAnimationComplete?: () => void
  className?: string
}

/**
 * Animated status badge — shows "Live" then "Delivered" badge animation.
 * Crowe colors: amber (running) → teal (completed).
 * Adapted from animated-status-badge (isaiahbjork).
 */
export function AnimatedStatusBadge({
  trigger,
  onAnimationComplete,
  className = "",
}: AnimatedStatusBadgeProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  const startAnimation = () => {
    setIsAnimating(true)
    setIsCompleted(false)
    setTimeout(() => {
      setIsAnimating(false)
      setTimeout(() => {
        setIsCompleted(true)
        setTimeout(() => {
          setIsCompleted(false)
          onAnimationComplete?.()
        }, 3000)
      }, 300)
    }, 3000)
  }

  useEffect(() => {
    if (trigger) startAnimation()
  }, [trigger])

  const exitProps = {
    y: [-37, 40] as unknown as number,
    opacity: [1, 1, 0] as unknown as number,
    scale: [1, 0.8, 0.8] as unknown as number,
  }

  return (
    <>
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className={`absolute top-0 right-0 text-xs font-medium px-2.5 py-0.5 rounded flex items-center shadow-md z-10 ${className}`}
            style={{ background: 'rgba(245,168,0,0.15)', color: '#F5A800', border: '1px solid rgba(245,168,0,0.4)' }}
            initial={{ y: 40, opacity: 1 }}
            animate={{ y: -32, opacity: 1 }}
            exit={exitProps}
            transition={{ duration: 0.5, times: [0, 0.2, 1], ease: "easeInOut" }}
          >
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span>Live</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            className={`absolute top-0 right-0 text-xs font-medium px-2.5 py-0.5 rounded flex items-center shadow-md z-10 ${className}`}
            style={{ background: 'rgba(5,171,140,0.15)', color: '#05AB8C', border: '1px solid rgba(5,171,140,0.4)' }}
            initial={{ y: 40, opacity: 1 }}
            animate={{ y: -32, opacity: 1 }}
            exit={exitProps}
            transition={{ duration: 0.5, times: [0, 0.2, 1], ease: "easeInOut" }}
          >
            <Check className="h-3 w-3 mr-1" />
            <span>Delivered</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
