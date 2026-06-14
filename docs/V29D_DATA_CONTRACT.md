# V29D Data Contract

## Data Validation Rule

Every generated vocab obstacle must pass validation before being written into `output_text/v29a_obstacles.json`.

Required fields:

- `lemma`
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`
- `translation`

If any required field is missing, the generator must:

- continue dictionary lookup
- continue normalization
- continue enrichment

The generator must not silently output incomplete vocab data.

For example, the following incomplete vocab data is not allowed to be written directly into `output_text/v29a_obstacles.json`:

```json
{
  "word": "interlock",
  "phonetic": "",
  "partOfSpeech": ""
}
```

The generator must continue completing the required fields before outputting the vocab obstacle to the frontend.
