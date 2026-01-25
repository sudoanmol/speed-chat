import { useState } from 'react'
import { toast } from 'sonner'

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text)
      setIsCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  return {
    isCopied,
    copyToClipboard,
  }
}
