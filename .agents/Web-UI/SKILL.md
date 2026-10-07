---
name: web-ui
description: Define and refine the visual styles of the WebAppFlask drone interface, including visual identity, colors, typography, layout, controls, indicators, and mobile adaptation. Use for visual design and interface consistency.
---

# Drone Interface Styles

## Visual Direction

Design a civil aviation tool with a professional, precise, and calm appearance. The interface should let users quickly recognize the drone's status, locate an action, and read flight data.

The flight screen uses the map as the main workspace, filling the available viewport. Arrange connection controls, takeoff altitude, manual flight actions, telemetry, and map tools around its edges. Preserve a clear central area for the drone position and orientation. Artificial intelligence guidance applies when that feature is requested.

Prefer compact controls and information displays so the map remains visible. Use consistent line icons for actions: RF waves for connection, an upward arrow above a ground line for takeoff, and a drone silhouette descending toward a ground line for landing. Distinguish data download with a document silhouette and an arrow. Keep units, numeric values, and short state labels visible. This skill defines presentation and visual experience criteria; keep its guidance focused on appearance, hierarchy, and arrangement.

## Color Palette

Use a light theme by default, with neutral surfaces and blue as the primary accent.

| Element | Reference Color | Use |
| --- | --- | --- |
| General background | `#F4F6F8` | Separate work areas. |
| Surface | `#FFFFFF` | Controls, forms, and panels. |
| Secondary surface | `#F8FAFC` | Grouping and subtle backgrounds. |
| Primary text | `#17202A` | Headings, labels, and important data. |
| Secondary text | `#667085` | Help text and descriptions. |
| Border | `#DDE2E8` | Define areas without excessive visual weight. |
| Primary action | `#2563EB` | Priority actions and selection. |
| Highlighted primary action | `#1D4ED8` | Visual feedback during interaction. |
| Subtle selection | `#EFF6FF` | Background for selected elements. |
| Success | `#16A34A` | Confirmed successful outcomes. |
| Warning | `#F59E0B` | Situations requiring attention. |
| Error | `#DC2626` | Failures or conflicts that prevent progress. |
| Information | `#0891B2` | Informational notices. |

These colors are references: adjust combinations to ensure contrast. Prefer dark text for yellow notices; do not assume white text is readable on every semantic color.

Combine color with a label or icon to communicate status. Reserve red for errors and conflicts; avoid making every operational action look like an alarm. If a dark theme is requested, preserve the same hierarchy and meaning.

## Typography

- Preferred font: Inter. Alternative: a system sans-serif family.
- Weights: regular for body text, medium for labels, and semibold for headings and actions.
- Size references: 24–28 px for screen titles, 18–20 px for section headings, 16 px for body text and controls, and 14 px for secondary information.
- Use comfortable line spacing and avoid all caps in long text.
- Use tabular numerals for altitude, speed, heading, time, and coordinates so updates do not shift the layout.
- Present each measurement with a clearly associated label, value, and unit.

## Spacing and Surfaces

Use a spacing scale of 4, 8, 12, 16, 24, 32, 40, and 48 px. As a reference, allow 16 px of horizontal padding on mobile and increase spacing on larger screens.

Keep related elements closer together and leave more space between different tasks. Align headings, labels, fields, and values. In map overlays, prefer 8–12 px panel padding, short headings, and compact rows. Reduce explanatory prose and decorative headings before reducing touch targets or hiding important state information.

| Resource | Guidance |
| --- | --- |
| Borders | Thin and subtle; the main way to separate surfaces. |
| Corners | Radii of 6–10 px for controls and panels; up to 14 px for elevated elements. |
| Shadows | Soft and limited to menus, dialogs, floating panels, and controls over maps. |
| Panels | Flat surfaces for controls and details. |
| Cards | For summaries, alerts, or list items; avoid cards inside cards. |

Avoid pill shapes on every button, heavy gradients, decorative transparency, and excessive floating containers.

## Control Screen Composition

Organize information into recognizable groups:

1. **Header:** screen name and connection status.
2. **Unified flight panel:** connection, takeoff altitude and action, directional grid, speed selection, central stop action, and accessible landing action. Keep preparation controls visible within this same panel instead of a separate dropdown.
3. **Flight controls:** separate related tasks with subtle spacing or a divider within the unified panel.
4. **Flight data:** status, altitude, and other available measurements.

Emphasize one primary action per group. Keep “Stop” easy to find and distinct from directional controls. Give “Land” a stable position and an icon clearly distinct from the central stop square. Provide its complete accessible name and a brief visible label or an accessible icon legend.

The directional grid should retain its spatial arrangement of three rows and three columns. Use balanced sizes, uniform gaps, and understandable labels. A persistent selection should look different from the momentary pressed state of a button.

On desktop, place compact flight controls at the left edge, telemetry at the right edge, and map tools near an available edge. These panels sit over the map with opaque surfaces and restrained shadows. Keep preparation and manual flight controls together in one compact panel. Activity details and the icon legend may collapse when they compete with the visible map. Preserve the 3 × 3 directional grid using arrow symbols and a central stop square. Keep direction names as accessible names and descriptive tooltips. Distinguish the landing icon from stopping movement.

## Buttons and Fields

- Primary action: blue background, a high contrast line icon, and a specific accessible name. Icon buttons may replace visible text when their meaning is available in descriptive tooltips and a visible, collapsible legend.
- Secondary action: light surface with a border or emphasized text.
- Selected direction: subtle background, persistent border or marker, and a readable label.
- Unavailable action: subdued appearance with sufficient readability and an explanation when needed.
- Keyboard focus: a visible outline distinguishable from selection and the pressed state.
- Action in progress: keep the icon, update its accessible name, and add a subtle activity marker with `aria-busy`. Avoid replacing the SVG with text or changing the button size.

Reference heights: 48 px on mobile and 44 px on desktop. Touch targets should be at least 44 × 44 px; prefer 48 × 48 px for primary actions.

Fields should retain a short visible label, with a complete accessible name when needed. Pair measurement icons with short labels and visible values and units. Place validation errors beside the relevant field; move routine explanations into a collapsible guide or accessible descriptions.

## Indicators and Flight Data

Present statuses with consistent short text, symbols, and colors:

| Visual State | Treatment | Example Label |
| --- | --- | --- |
| Disconnected or missing data | Neutral, with a visible explanation. | “Disconnected” |
| Action in progress | Activity indicator and informational tone. | “Taking off” |
| Confirmed outcome | Success mark and explicit text. | “Landing complete” |
| Attention required | Warning symbol and amber tone. | “Review data” |
| Failure or conflict | Error symbol and red tone. | “Connection error” |

Visually distinguish a request in progress from a completed outcome. For example, “Landing” and “Landing complete” need different labels.

For telemetry, prioritize readable values and retain units. Keep latitude and longitude directly visible in the flight-data grid with labels and degree units, using the same value hierarchy as altitude; do not place coordinates in a dropdown. Use a stable label and value structure; avoid animating every update. Present missing data as “No data” and old data as “Outdated data,” without confusing either with a zero value.

## Device Adaptation

Adaptation should rearrange elements while keeping primary actions available.

- **Mobile:** keep the map as the background workspace. Use a bottom navigation bar to open one flight, telemetry, or map-tools panel at a time. Selecting the active panel again can hide it to free the map. Keep preparation, the directional grid, speed selection, and landing in the same flight panel; do not hide preparation automatically when the drone takes off. Panels must scroll internally when content or enlarged text exceeds the available height.
- **Tablet:** use edge panels when enough map area remains visible; otherwise use the same single-panel navigation as mobile. In short landscape views, a side panel can preserve more usable map area than a bottom panel.
- **Desktop:** use the full viewport map with compact panels aligned to its edges. Keep the map interactive between panels, and bound panel heights with internal scrolling.

Use 768, 1024, and 1440 px as reference layout breakpoints, adjusting them to the content. Also consider widths of 360, 390, and 430 px, landscape orientation, enlarged text, and the on-screen keyboard.

Fixed elements should leave room for content, device safe areas, and the keyboard. Avoid letting a bottom bar cover buttons, messages, or data.

## Maps and Artificial Intelligence Assistance

When these features are part of the screen:

- Use the map as the main surface during flight monitoring and planning. Keep surrounding controls compact and group related options into a few opaque panels. Avoid placing a separate dashboard around a small map card.
- Position map zoom controls and attribution where panels will not cover them. When centering or following the drone, use the visible map area remaining between panels rather than the geometric center of the full viewport. Adapt this area when a panel opens, closes, or resizes.
- Distinguish routes, points, and selections through shape, line thickness, labels, and color. Show a directional drone marker for valid heading and a neutral point when heading is missing. Identify the last known position clearly when telemetry is outdated.
- Provide a visible on/off control for optional trajectory display. Explain that disabling it hides the route and pauses recording while preserving existing points. When recording resumes, start a new segment across omitted intervals; provide a separate clear action.
- Group plan information into sections with headings and label and value pairs.
- Integrate instruction input as a compact bar using the same visual system. Avoid exclusive purple branding for AI and a conversation panel that competes with the map.
- Make proposed changes and fields awaiting review easy to read.
- If voice input is available, clearly present listening, processing, and error states while keeping text input accessible.

## Motion and Visual Accessibility

Use short transitions of 120–240 ms to open panels, show menus, and communicate status changes. Avoid decorative motion, flashes, and constant animation. Respect reduced motion preferences.

Maintain sufficient contrast, visible focus, and comfortable reading when text is enlarged. Do not rely on hovering to reveal essential actions. Icon controls need specific accessible names and descriptive tooltips. Provide a visible collapsible legend so their meaning can be discovered on touch devices without hover. Use local SVGs with a consistent stroke, size, and alignment. Keep the catalog shared between action buttons and the icon legend. Review geometry within the viewBox at actual display sizes, especially relative path segments and arrowheads. Decorative SVGs should be hidden from assistive technology. Preserve visible focus and the selected state of icon switches; do not communicate errors or outdated telemetry solely through color.

## Text Tone

Use clear, concise, professional wording in the interface's existing language. The current interface is in Spanish; writing this skill in English does not require changing the product language. The English labels in this guide illustrate meaning and should be localized consistently.

Prefer specific labels such as “Connect drone,” “Take off,” “Stop,” “Land,” “Save changes,” or “Review plan.”

Messages should describe what happened and, where appropriate, indicate the next step. Avoid promotional exclamations, childish expressions, and promises of success without confirmation.

## Visual Review Criteria

When assessing a proposal, check that:

- The primary action and drone status are quickly recognizable.
- Hierarchy, colors, borders, and typography are consistent.
- Compact icon controls remain distinguishable on mobile, have at least 44 × 44 px touch targets, and expose their meaning through accessible names and an icon legend.
- The directional grid retains its shape and the central stop action is obvious.
- Statuses remain understandable without relying on color.
- There is no clipped content, overlap, or horizontal scrolling.
- The map remains the dominant surface, the drone stays visible between panels during following, and zoom controls and attribution remain accessible.
- Mobile panel switching is understandable, hidden panels leave keyboard navigation, and safe areas and short landscape views do not clip the navigation bar.
- Maps or AI features, when present, follow the same visual language.

Prioritize operational clarity, accessibility, mobile usability, and consistency over decoration.
