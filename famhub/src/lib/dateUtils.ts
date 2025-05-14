import { formatDistanceToNow } from "date-fns"

export const formatDate = (date: string) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
