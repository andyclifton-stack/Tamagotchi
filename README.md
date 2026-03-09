# Tamagotchi

Mobile-first virtual pet game built with React, Vite, Firebase Realtime Database, and generated Web Audio effects.

## Features

- Create, save, and load multiple pets for the current browser profile
- Real-time progression while the app is closed
- Egg to adult growth with care-based adult branch selection
- Three themes: Modern Soft 3D, Retro Pixel-Art Polished, Cute Playful
- Optional per-pet PIN plus master parent PIN `999`
- Parent tools for rescue, stat fixes, rename, delete, and force-stage testing
- Public read-only pet sharing with WhatsApp support
- Firebase-backed persistence with isolated namespace `tamagotchi/v1`

## Local development

```bash
npm install
npm run dev
```

The local dev server runs on `http://localhost:5175/`.

## Build and test

```bash
npm run test
npm run build
```

## Firebase setup

This app uses the same Firebase project already used by the sibling apps in this workspace.

### 1. Enable Anonymous Auth

In Firebase Console:

1. Open `Authentication`
2. Go to `Sign-in method`
3. Enable `Anonymous`

### 2. Realtime Database namespace

This app writes only under:

- `tamagotchi/v1/pets`
- `tamagotchi/v1/ownerPets`
- `tamagotchi/v1/publicPets`
- `tamagotchi/v1/events`

### 3. Recommended Realtime Database rules

This app assumes public share pages are readable by everyone, while owner pet data and summaries are writable only by the anonymous owner account.

```json
{
  "rules": {
    "tamagotchi": {
      "v1": {
        "pets": {
          "$petId": {
            ".read": "auth != null && auth.uid === data.child('ownerUid').val()",
            ".write": "auth != null && ( (!data.exists() && newData.child('ownerUid').val() === auth.uid) || data.child('ownerUid').val() === auth.uid )"
          }
        },
        "ownerPets": {
          "$ownerUid": {
            ".read": "auth != null && auth.uid === $ownerUid",
            ".write": "auth != null && auth.uid === $ownerUid"
          }
        },
        "publicPets": {
          "$shareToken": {
            ".read": true,
            ".write": "auth != null && ( (!data.exists() && newData.child('ownerUid').val() === auth.uid) || data.child('ownerUid').val() === auth.uid )"
          }
        },
        "events": {
          "$petId": {
            ".read": "auth != null",
            ".write": "auth != null"
          }
        }
      }
    }
  }
}
```

If you want tighter rules later, the next step would be an authenticated family account model or a small server component for owner-signed public mirror writes.

## GitHub Pages

This repo is configured for GitHub Pages at:

`https://fingergame.co.uk/Tamagotchi/`

The public share view uses query params to avoid GitHub Pages route issues:

`https://fingergame.co.uk/Tamagotchi/?view=public&share=TOKEN`

