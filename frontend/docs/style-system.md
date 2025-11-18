# Style System Guide

This project ships with a centralized, English-command driven styling layer. Every layout surface resolves its visual props through the style registry before anything is rendered.

## Quick start

1. **Use the styled primitives** – import `StyledSection`, `StyledFlex`, or `StyledGrid` from `src/ui/primitives` and render them with the `componentKey` that matches a registry entry.
2. **Supply optional commands** – pass `commands="rounded glass panel"` (string or array). These merge with the component's default commands.
3. **Layer ad-hoc overrides** – pass Chakra props as usual or use the `styleOverrides` prop for structured overrides. Both are merged last so they always win.

```tsx
import { StyledSection } from '../ui/primitives';

export const PhoneShell = () => (
  <StyledSection
    componentKey="Phone.Shell"
    commands={["soft glow border", "padded layout"]}
    styleOverrides={{ gap: 6 }}
  >
    {/* content */}
  </StyledSection>
);
```

## How the registry works

- `src/styles/styleRegistryData.ts` lists every component key, a description, and baseline commands.
- `src/styles/styleLibrary.ts` contains the shared `styleCommandLibrary`. Each key maps a natural-language token to a Chakra `SystemStyleObject` fragment.
- `src/styles/styleRegistry.ts` resolves a component's defaults, merges any global overrides, then applies request-scoped commands/overrides.
- `useComponentStyles(componentKey, options)` memoizes that merge so primitives simply spread the result.

## Adding or updating commands

1. **Extend `styleCommandLibrary`** with a new key if the effect does not exist. Keep names short, descriptive, and in lowercase.
2. **Reference the key** inside a component entry's `commands` array in `styleRegistryData.ts`.
3. **Assign the component key** to the UI by wrapping it with one of the styled primitives or calling `useComponentStyles` manually.

Example command definition:

```ts
// styleLibrary.ts
export const styleCommandLibrary = {
  'frosted ribbon': {
    borderRadius: '999px',
    borderWidth: '1px',
    borderColor: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(30px)',
  },
};
```

## Runtime overrides

You can tune visuals without touching component code by using the helper APIs in `styleRegistry.ts`:

- `applyEnglishStyleCommand(componentKey, 'soft glow border + card padding')` parses the text into the matching command tokens and persists them in memory.
- `updateComponentStyle(componentKey, overrides)` merges a raw `SystemStyleObject` on top of everything else.
- `resetComponentOverride(componentKey)` clears both command and manual overrides so the defaults take effect again.

These helpers are perfect for admin tools, A/B experiments, or temporary adjustments while iterating with designers.

## Creating new registry-aware components

1. Decide on a unique `componentKey` and write its default command set in `styleRegistryData.ts`.
2. Reuse an existing primitive or create a thin wrapper similar to `DashboardHeroCard` that renders those primitives internally.
3. Export the wrapper via a barrel (`src/components/index.ts`) so the page code imports the reusable piece instead of repeating layout props.

## Troubleshooting

- **TypeScript complains about spread props** – ensure the computed styles come from `useComponentStyles`; the primitives already cast them for Chakra.
- **Command not applying** – verify the key exists in `styleCommandLibrary` and that the component's command list (default or runtime) references the same string.
- **Overrides feel out of order** – remember the merge order: registry defaults → registry command list → runtime commands → registry manual overrides → component `styleOverrides` → JSX props.

Keep this document updated whenever you add new component keys, command vocabulary, or helper APIs so designers and engineers share the same mental model.
