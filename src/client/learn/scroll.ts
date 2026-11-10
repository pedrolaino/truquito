/** On short screens, bring the move the learner is pointed to into view. */
export function scrollToSuggestion() {
  const target = document.querySelector('.suggested')
  if (!target) return
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
}
