import { cn } from '@renderer/lib/utils'
import { getFileIconSpec } from '@renderer/lib/file-icons'

interface FileTypeIconProps {
  name: string
  className?: string
}

export function FileTypeIcon({ name, className }: FileTypeIconProps) {
  const { icon: Icon, colorClass } = getFileIconSpec(name)
  return <Icon size={14} className={cn('shrink-0', colorClass, className)} />
}
