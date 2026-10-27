# Brighter Cards

AnkiDroid-style vocabulary flashcards for Turkish, Russian and Italian, sorted into topic folders (Greetings, Numbers, Colors, Verbs 1, …). Spaced repetition works like Anki, and pronunciation uses the phone's text-to-speech.

`node build.js` combines the core word lists in `vocab.js` with the words and phrases from the Brighter Path lessons (`../../quest-path/content`) and writes `index.html`. Progress is saved in the browser. Settings has a backup file option.

## 2-week plan decks

`plans/italian_flashcards_2w.json`, `plans/turkish_flashcards_2w.json` and `plans/russian_flashcards_2w.json` become the decks Italiano, Türkçe and Русский (`plans.js`).

- To import or update them, replace the JSON files in `plans/` and run `node import-plans.js`. That re-renders `index.html` from `template.html`, keeps every other deck exactly as it is, and doesn't need the Brighter Path sources. `node build.js` does the same as part of a full build. Then commit and push.
- Each card's `id` (it-001, tr-001, ru-001 …) is its key. Re-importing updates cards in place and never touches review history.
- A card opens as new on its language's start date + (day − 1). Set the start dates in Settings → 2-week plans, using the same dates as in my.planner. The first time the plans load, the old Turkish / Russian / Italian decks stop adding new cards; their reviews go on. Long-press a deck to pause or resume its new cards.
- Foreign language first: English → foreign sentence and vocab cards can be asked the other way round, per language. Turn it on in Settings, in a deck's long-press menu, or in the ⋮ menu while reviewing.
