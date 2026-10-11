import type { KeyboardEvent } from "react";
import { inEditableField } from "./keyboard";

/**
 * ← and → inside an opened card or a drill-down: put this layer away and open the one belonging to
 * the card beside the one it was opened from.
 *
 * Read off the DOM rather than handed down, because the order a reader sees is already there and
 * nowhere else in one piece: a wall's cards are sorted and cut into runs by `Finished`, a shelf's by
 * the gallery, a strip's by its list, and a card owns its dialog without knowing which of those it
 * was drawn in. A shell drawing cards marks the element holding them (`CARD_LIST`), and each card's
 * press says what it opens (`data-card-opens`), so a step goes to the next card that opens the
 * same kind of layer: an item's card to the next item's, a group's drill-down to the next group's.
 * A card drawn outside any list — the hero, a hover card's, a search hit's mounted off-screen — has
 * no neighbour, and the arrows do nothing there.
 */
export const CARD_LIST = { "data-card-list": "" } as const;

/** What a card's press opens: the item's own expanded card, or a layer standing for a group. */
export type CardOpens = "detail" | "layer";

/**
 * The card whose press is being answered, for a layer opened by a callback rather than by the card
 * itself: a drill-down mounts in the render that press causes and has no other way to learn which
 * card opened it. Held for that one task and dropped after it, so a layer opened from anything
 * else — a worded cut, a search hit — finds no card and offers no step.
 */
let pressed: HTMLElement | null = null;

export const notePress = (card: HTMLElement) => {
  pressed = card;
  setTimeout(() => {
    if (pressed === card) pressed = null;
  });
};

export const pressedCard = () => pressed;

const STEPS: Partial<Record<string, 1 | -1>> = { ArrowRight: 1, ArrowLeft: -1 };

/**
 * Which way a key steps, or `undefined` where it is not a step this layer should take.
 *
 * A press from inside a layer opened over this one — a franchise strip's bead opening another card
 * — reaches this layer's handler too, React bubbling through the portal it is drawn in, and is
 * that layer's to answer: its target is outside this layer's own DOM, which is what tells them
 * apart. A modified arrow and an arrow in a field are the field's.
 */
const stepOf = (event: KeyboardEvent<HTMLElement>): 1 | -1 | undefined => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return undefined;
  if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return undefined;
  if (inEditableField(event.target)) return undefined;
  return STEPS[event.key];
};

/** The card `delta` along from `card` in the list holding it that opens the same kind of layer. */
const neighbourCard = (card: HTMLElement | null, delta: 1 | -1): HTMLElement | undefined => {
  const list = card?.closest("[data-card-list]");
  const opens = card?.dataset.cardOpens;
  if (!card || !list || !opens) return undefined;
  const cards = [...list.querySelectorAll<HTMLElement>(`[data-card-opens="${opens}"]`)];
  const at = cards.indexOf(card);
  return at < 0 ? undefined : cards[at + delta];
};

/**
 * Answers an arrow pressed in a layer opened from `card`: closes the layer and presses the
 * neighbour. Pressed a frame later, once this layer's focus trap has let go, or the trap would take
 * the focus straight back from the card about to open the next one — and focused before it is
 * pressed, so the next layer returns the focus to it on closing and the page has scrolled to it.
 */
export const stepFrom = (event: KeyboardEvent<HTMLElement>, card: HTMLElement | null, close: () => void) => {
  const delta = stepOf(event);
  const next = delta && neighbourCard(card, delta);
  if (!next) return;
  event.preventDefault();
  close();
  requestAnimationFrame(() => {
    next.focus();
    next.click();
  });
};
