/*
  # Create Vendor Download Recipes System

  1. New Tables
    - `vendor_recipes`
      - `id` (uuid, primary key) - unique recipe identifier
      - `user_id` (text, not null) - the user who owns this recipe
      - `vendor_name` (text, not null) - name of the vendor (e.g., "name.com", "Contabo")
      - `login_url` (text) - the URL where to login to download invoices
      - `description` (text) - human-readable description of what this recipe does
      - `credentials_email` (text) - stored login email for the vendor portal
      - `credentials_note` (text) - notes about credentials (not the password itself)
      - `is_active` (boolean, default true) - whether this recipe is active
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `recipe_steps`
      - `id` (uuid, primary key) - unique step identifier
      - `recipe_id` (uuid, foreign key) - references vendor_recipes
      - `step_order` (integer, not null) - order of execution
      - `step_type` (text, not null) - type: navigate, click, fill_input, wait, select_option, download_pdf, screenshot
      - `selector` (text) - CSS selector or XPath for the target element
      - `value` (text) - value to input, URL to navigate to, etc.
      - `description` (text) - human-readable description of this step
      - `wait_seconds` (integer, default 2) - seconds to wait after this step
      - `is_optional` (boolean, default false) - whether failure of this step should stop execution
      - `created_at` (timestamptz, default now())

    - `recipe_runs`
      - `id` (uuid, primary key) - unique run identifier
      - `recipe_id` (uuid, foreign key) - references vendor_recipes
      - `user_id` (text, not null) - the user who triggered this run
      - `status` (text, default 'pending') - pending, running, success, failed
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `result_message` (text) - success/error message
      - `downloaded_files` (integer, default 0) - number of files downloaded
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Users can only access their own recipes, steps, and runs
*/

CREATE TABLE IF NOT EXISTS vendor_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  vendor_name text NOT NULL,
  login_url text DEFAULT '',
  description text DEFAULT '',
  credentials_email text DEFAULT '',
  credentials_note text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipes"
  ON vendor_recipes FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own recipes"
  ON vendor_recipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own recipes"
  ON vendor_recipes FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own recipes"
  ON vendor_recipes FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES vendor_recipes(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 0,
  step_type text NOT NULL DEFAULT 'navigate',
  selector text DEFAULT '',
  value text DEFAULT '',
  description text DEFAULT '',
  wait_seconds integer DEFAULT 2,
  is_optional boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view steps of own recipes"
  ON recipe_steps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_recipes
      WHERE vendor_recipes.id = recipe_steps.recipe_id
      AND vendor_recipes.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert steps for own recipes"
  ON recipe_steps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendor_recipes
      WHERE vendor_recipes.id = recipe_steps.recipe_id
      AND vendor_recipes.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update steps of own recipes"
  ON recipe_steps FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_recipes
      WHERE vendor_recipes.id = recipe_steps.recipe_id
      AND vendor_recipes.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendor_recipes
      WHERE vendor_recipes.id = recipe_steps.recipe_id
      AND vendor_recipes.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete steps of own recipes"
  ON recipe_steps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vendor_recipes
      WHERE vendor_recipes.id = recipe_steps.recipe_id
      AND vendor_recipes.user_id = auth.uid()::text
    )
  );

CREATE TABLE IF NOT EXISTS recipe_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES vendor_recipes(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  status text DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  result_message text DEFAULT '',
  downloaded_files integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recipe_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own runs"
  ON recipe_runs FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own runs"
  ON recipe_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own runs"
  ON recipe_runs FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own runs"
  ON recipe_runs FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE INDEX IF NOT EXISTS idx_vendor_recipes_user_id ON vendor_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_order ON recipe_steps(recipe_id, step_order);
CREATE INDEX IF NOT EXISTS idx_recipe_runs_recipe_id ON recipe_runs(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_runs_user_id ON recipe_runs(user_id);
