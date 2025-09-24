# QR Billing Module

This folder contains a web adaptation of the mobile (Expo/React Native) "Bolt" project tab screens, integrated into the existing Invexis frontend (Create React App + React 18).

## Included Screens (Web Components)
- `MenuPage` – Product/menu browsing with categories, filters, quantity controls & modal details.
- `CartPage` – Cart management, quantity update, order summary, confirmation modal.
- `OrdersPage` – Live order progress UI with timeline and status animation logic (simplified).
- `QrBillingApp` – Shell container providing tab switching (Menu / Cart / Orders) & shared cart state.

## Integration
- Added navigation entry: `🧾 QR Billing` (id: `qr-billing`) inside `Navigation.js` under the Operations category.
- In `App.js`, when `screen === 'qr-billing'`, the `QrBillingApp` component renders.

## Tech Stack Alignment
Original Bolt code used React Native + Expo components (e.g., `View`, `Text`, `StyleSheet`, `expo-router`). This adaptation:
- Replaces RN primitives with semantic HTML elements + CSS in `qrBilling.css`.
- Uses `lucide-react` icons (already present in project dependencies) instead of `lucide-react-native`.
- Preserves core logic: filtering, sorting, quantity management, modal details, order tracking timeline, profile toggles.

## Styling
All styles are consolidated in `qrBilling.css`. It intentionally mirrors the dark theme and accent color (#fbbf24) from the mobile design.

## Extending
- To hook real backend data, replace the static `initialItems` array in `MenuPage.js` with fetched data (e.g., via `useEffect` + `axios`).
- Wire cart checkout (`onCheckout`) to backend order creation before clearing cart.
- Replace hard-coded order simulation in `OrdersPage` with polling or WebSocket subscription.
- Add user authentication context for personalized features.

## Future Enhancements
1. Persist cart state to localStorage/session for refresh resilience.
2. Add responsive print view for generated bills / receipts.
3. Integrate QR code scanner (web) for table/session association.
4. Real-time order status via socket events.
5. Multi-currency & tax configuration from settings service.

## Usage
From any screen (after login), open the floating navigation menu and choose "🧾 QR Billing".

## License
Internal module for Invexis Beta.
