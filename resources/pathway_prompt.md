# USER INPUT
Clinical Question: {{question}}

Clinical Notes:
{{notes}}

# RESPONSE FORMAT
Answer with the 3 following sections:

* Assessment
  * List clinically relevant facts drawn *only* from the input.
  * State working diagnosis or differential

* Recommendations and Rationale
  * Bullet actionable recommendations, each on its own line:
    - `Recommendation`

* Contingency Plan
  * Explicit thresholds or red-flags that should trigger re-evaluation or escalation.
  * Include fallback options if initial plan fails.
