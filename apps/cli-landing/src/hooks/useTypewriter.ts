import { useState, useEffect, useRef } from 'react'

export interface TerminalLine {
  type: 'command' | 'output' | 'comment'
  text: string
  delay?: number
}

interface TypewriterState {
  visibleLines: TerminalLine[]
  currentText: string
  isTyping: boolean
}

export function useTypewriter(sequence: TerminalLine[]) {
  const [state, setState] = useState<TypewriterState>({
    visibleLines: [],
    currentText: '',
    isTyping: false,
  })

  const sequenceRef = useRef(sequence)
  sequenceRef.current = sequence

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    let lineIndex = 0
    let charIndex = 0

    const typeNext = () => {
      const seq = sequenceRef.current

      if (lineIndex >= seq.length) {
        // Reset and loop after a pause
        timeoutId = setTimeout(() => {
          setState({ visibleLines: [], currentText: '', isTyping: false })
          lineIndex = 0
          charIndex = 0
          typeNext()
        }, 4000)
        return
      }

      const currentLine = seq[lineIndex]

      if (charIndex === 0) {
        // Apply initial delay for the line
        setState((prev) => ({
          ...prev,
          isTyping: true,
          currentText: '',
        }))

        timeoutId = setTimeout(typeNext, currentLine.delay || 100)
        charIndex = 1
        return
      }

      const text = currentLine.text
      const typingSpeed = currentLine.type === 'command' ? 40 : 8

      if (charIndex <= text.length) {
        setState((prev) => ({
          ...prev,
          currentText: text.substring(0, charIndex),
          isTyping: true,
        }))
        charIndex++
        timeoutId = setTimeout(typeNext, typingSpeed)
      } else {
        // Line complete, add to visible lines
        setState((prev) => ({
          ...prev,
          visibleLines: [...prev.visibleLines, currentLine],
          currentText: '',
          isTyping: false,
        }))
        lineIndex++
        charIndex = 0
        timeoutId = setTimeout(typeNext, 150)
      }
    }

    typeNext()

    return () => clearTimeout(timeoutId)
  }, [])

  return state
}
