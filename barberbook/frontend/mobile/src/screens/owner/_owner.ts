/**
 * Owner-side shared utilities.
 *
 * The owner role binds to a single shop. In a real session, the active
 * shop comes from the authenticated user's `owner_user → shop` link;
 * for the scaffold we pin to the canvas's first fixture so every owner
 * screen has data to render in mock mode.
 */
export const ACTIVE_SHOP = 'BB-SHOP-00001';
