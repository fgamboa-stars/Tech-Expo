/**
 * ============================================================================
 * File:        src/components/common/StoryArc.tsx
 * Purpose:     The app's three-part narrative as a small navigation strip:
 *              1. Places already lost → 2. Places that still exist →
 *              3. Places threatened by future hazards.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * Numbered markers are used here because the content really is a sequence
 * (past → present → future). `aria-current="step"` tells screen readers
 * which part of the story the visitor is on.
 */

/** The three parts, with the route each one opens. */
const STEPS: { id: "past" | "present" | "future"; title: string; text: string; href: string }[] = [
  { id: "past", title: "Past loss", text: "Places already lost", href: "#/lost" },
  { id: "present", title: "Present conditions", text: "Places that still exist", href: "#/explore" },
  { id: "future", title: "Future risk", text: "Places threatened by 2050 hazards", href: "#/dashboard" },
];

/**
 * Renders the story arc.
 * @param props.current The step the visitor is on, if any.
 */
export default function StoryArc({ current }: { current?: "past" | "present" | "future" }) {
  return (
    <nav className="story-arc" aria-label="The story in three parts">
      <ol>
        {STEPS.map((s, i) => (
          <li key={s.id} className={current === s.id ? "is-current" : ""}>
            <a href={s.href} aria-current={current === s.id ? "step" : undefined}>
              <span className="story-arc__num">{i + 1}</span>
              <span className="story-arc__title">{s.title}</span>
              <span className="story-arc__text">{s.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
