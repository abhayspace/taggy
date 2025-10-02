-- Create message_reads table to track per-user read timestamps per conversation
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, conversation_id)
);

-- Enable RLS
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own records
CREATE POLICY "Users can view their own message read states"
ON public.message_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own message read states"
ON public.message_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message read states"
ON public.message_reads
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_message_reads_updated_at'
  ) THEN
    CREATE TRIGGER trg_message_reads_updated_at
    BEFORE UPDATE ON public.message_reads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;