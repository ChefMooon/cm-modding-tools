# UI Rules

These rules capture the shared interaction and visual standards for new UI elements in this app.

## Buttons and actions
- Give buttons a compact, tactile feel with subtle hover lift, clear pressed feedback, and consistent spacing so actions feel responsive without feeling noisy.
- Use a small, fixed vertical lift on hover rather than a larger movement; keep the effect restrained with a light translate shift and a soft ease-out transition.
- Use a subtle press animation of scale 0.96 on active interaction. Keep it consistent across the app and never use a value smaller than 0.95.
- Support reduced-motion preferences by disabling or simplifying animated feedback when motion would be distracting. Provide a shared `static` prop or equivalent pattern for components that should stay visually static.
- Keep button states easy to understand: hover, focus, active, selected, disabled, and destructive states should all remain legible and visually consistent.
- Preserve layout stability by keeping button sizes fixed, avoiding unexpected resizing, and using consistent padding for dense panels.
- Ensure button labels and icon-only actions remain accessible with clear text or ARIA labels, and keep focus styles visible for keyboard users.
- Prefer obvious primary actions and keep destructive or secondary actions visually distinct without relying on color alone.
- Use confirmation or feedback for actions that create, delete, replace, or permanently change data so users understand the outcome.
- Avoid placing too many equally weighted actions next to each other; make the primary action visually dominant and keep the path to completion clear.
- Keep buttons predictable by using consistent labels and placement for recurring actions such as save, cancel, copy, open, and close.
- For time-sensitive or irreversible actions, provide a moment to review or undo when practical, and avoid surprise state changes.

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
