-- Add UPDATE policy for event hosts to update their announcements
CREATE POLICY "Event hosts can update announcements"
  ON public.announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = announcements.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Add DELETE policy for event hosts to delete their announcements
CREATE POLICY "Event hosts can delete announcements"
  ON public.announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = announcements.event_id
      AND events.user_id = auth.uid()
    )
  );