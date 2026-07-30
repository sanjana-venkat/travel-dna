# Outdone

Ever felt like AI keeps recommending the same things? I'm a designer, and in one of my trips to Las Vegas, it kept thinking "Oh, you're a designer, so you must like art museums." 

I got an aha moment, and coded this! Outdone is an AI-assisted travel planner that turns your destination into a curated set of places based on what you want _right now._ Tell us your vibe and get 12 curated suggestions food and activities that are auto-arranged in an itinerary based on distance and time. BONUS! Instant booking links and Google maps with all the stops added, so all you gotta do is go :)

# The design thinking

Wanted to build an intent-classification model so I aggregated all possible vibes into 9 archetypes that are uniquely distinct and all encompassing. These vibe signals were then repeatedly tested to see if Gemini can then classify intent into specific activities, map it to the right suggestions based on distance, time and user preferences and return a filtered response that matches user preferences

![outdone itinerary builder](docs/readme-hero.png)

## What It Does

- Generates 12 real place suggestions for a trip, including restaurants, activities, sights, and bookable experiences.
- Uses a card-stack flow so users can add stops to their plan or skip them.
- Builds a final itinerary timeline from selected stops.
- Enriches stops with Google Places data such as ratings, addresses, photos, maps links, and opening status.
- Includes Google Maps route links, calendar export, sharing, regeneration, and vibe editing.
- Supports Google sign-in with public Privacy Policy and Terms of Use pages.

## Tech Stack

- React
- Vite
- Vercel serverless functions
- Google Places API / Places API New
- Google Maps links
- Gemini API

## Project Structure

```text
api/
  generate.js
  place-autocomplete.js
  place-photo.js
  save-itinerary.js

public/
  privacy.html
  terms.html

src/
  main.jsx
  styles.css

docs/
  readme-hero.png
```

## Environment Variables

Create these in Vercel before deploying:

```text
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
VITE_GOOGLE_CLIENT_ID=...
```

Recommendations use the stable `gemini-2.5-flash-lite` model. `GEMINI_API_KEY`
must be a key owned by the Google Cloud or Google AI Studio project authorized
for this deployment; never reuse an employer-issued or otherwise third-party key.

For `GOOGLE_MAPS_API_KEY`, use a server-safe key for the Vercel API routes. Do not use website referrer restrictions on this server key, because the requests come from Vercel, not directly from the browser.

Recommended Google APIs:

- Places API
- Places API (New)
- Geocoding API
- Maps JavaScript API, only if using a separate browser key

## Local Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Legal Pages

The Google OAuth consent screen can use these public URLs after deployment:

```text
https://your-domain.vercel.app/privacy.html
https://your-domain.vercel.app/terms.html
```

The source files live in:

```text
public/privacy.html
public/terms.html
```

## Notes

Outdone is a prototype. Generated recommendations should be checked before travel, especially opening hours, prices, booking requirements, safety conditions, and transportation details.

© 2026 Sanjana Venkat. All rights reserved.
