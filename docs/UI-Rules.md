# UI Rules

These rules capture the shared interaction and visual standards for new UI elements in this app.

## Dropdowns and pickers
- Use a compact, native-feeling list layout with clear hover and focus states so options are easy to scan quickly.
- Keep the popup width aligned with the trigger and preserve consistent spacing so the control feels anchored to the surrounding form.
- Show a clear selected-state indicator for the current choice so it is obvious at a glance.
- Allow long labels to wrap or truncate gracefully so the control remains tidy in narrower panels.
- Use the same keyboard behavior as the existing dropdowns: open with pointer or keyboard, support arrow-key navigation, and restore focus to the trigger when closed.
- Keep the control visually consistent with the current form styling: rounded borders, subtle shadow, muted text treatment, and accessible focus rings.

## Layout and spacing
- Preserve layout stability by avoiding controls that resize unexpectedly when values change.
- Use consistent padding and gap values so adjacent form controls feel balanced.
- Prefer compact controls for dense panels, but keep enough touch and focus target size for comfortable interaction.

## Accessibility
- Every interactive control should expose clear labels and appropriate ARIA semantics.
- Provide visible focus styles for keyboard users.
- Ensure dropdown options remain easy to understand with screen readers and do not rely on color alone to communicate state.

## Visual tone
- Favor subtle emphasis over heavy decoration.
- Use the app’s existing border, background, and accent colors so new controls feel native rather than bolted on.
- Keep states restrained and polished: hover should feel responsive, selected states should feel confident, and disabled or inactive states should remain legible.
