export interface StepModifierEvent {
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
}

export function getEffectiveStepValue(baseStep: number, event?: StepModifierEvent) {
  if (event?.shiftKey) {
    return baseStep * 10
  }

  if (event?.ctrlKey || event?.metaKey) {
    return baseStep / 10
  }

  return baseStep
}
