# Schedula backend

Express + Mongoose API with a deterministic scheduling engine and an optional Groq language layer.
See the [root README](../README.md) for setup, API reference, metrics and the cross-validation method.

```bash
npm install
cp .env.example .env     # add MONGODB_URI, JWT_SECRET, optionally GROQ_API_KEY
npm run dev
npm run check:groq       # verify Groq key + models (never prints the key)
npm test                 # unit/integration tests, no DB or network
npm run eval:scheduler   # scheduling metrics vs baselines + independent rule validator
npm run eval:groq        # live Groq accuracy on hand-labelled gold sets
```
