-- Register the six Phase 3 model slots. None point at a trained artifact yet.
-- The category ranker is active so the LTR feed has a named model to cite.
-- ROLLBACK: delete from public.ml_models where artifact_uri like 'pending://%';

INSERT INTO public.ml_models (name, version, artifact_uri, framework, metrics, is_active)
VALUES
  ('next_purchase_predictor', '0.0.0', 'pending://not-trained', 'heuristic', '{}'::jsonb, FALSE),
  ('churn_scorer', '0.0.0', 'pending://not-trained', 'heuristic', '{}'::jsonb, FALSE),
  ('category_affinity_ranker', '0.1.0', 'inline://ltr-heuristic-v1', 'heuristic', '{}'::jsonb, TRUE),
  ('price_sensitivity_estimator', '0.0.0', 'pending://not-trained', 'heuristic', '{}'::jsonb, FALSE),
  ('gift_recommender', '0.0.0', 'pending://not-trained', 'heuristic', '{}'::jsonb, FALSE),
  ('accessibility_needs_predictor', '0.0.0', 'pending://not-trained', 'heuristic', '{}'::jsonb, FALSE)
ON CONFLICT (name) DO NOTHING;
