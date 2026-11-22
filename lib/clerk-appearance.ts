/** Sign-in / sign-up only. Do not pass this to ClerkProvider — it would restyle UserButton. */
export const clerkAuthAppearance = {
  layout: {
    socialButtonsVariant: 'blockButton' as const,
  },
  elements: {
    logoBox: { display: 'none' },
    logoImage: { display: 'none' },
    rootBox: { width: '100%' },
    card: {
      background: 'transparent',
      boxShadow: 'none',
      border: 'none',
    },
    headerTitle: { display: 'none' },
    headerSubtitle: { display: 'none' },
  },
}
