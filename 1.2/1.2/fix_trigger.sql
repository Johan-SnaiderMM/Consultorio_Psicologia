-- Fix: Skip overlap validation when only the estado is being updated (not fecha_hora or duracion)
-- Also exclude the current row from overlap check on UPDATE
CREATE OR REPLACE FUNCTION validar_espacio_citas()
RETURNS TRIGGER AS $$
BEGIN
  -- On UPDATE, if fecha_hora and duracion haven't changed, skip validation
  IF (TG_OP = 'UPDATE' AND OLD.fecha_hora = NEW.fecha_hora AND OLD.duracion = NEW.duracion) THEN
    RETURN NEW;
  END IF;

  -- Check for overlapping appointments, excluding the current row on UPDATE
  IF EXISTS (
    SELECT 1 FROM Citas
    WHERE terapeuta_id = NEW.terapeuta_id
      AND id_cita != COALESCE(NEW.id_cita, 0)
      AND tstzrange(
            NEW.fecha_hora - INTERVAL '1 hour',
            NEW.fecha_hora + COALESCE(NEW.duracion, INTERVAL '1 hour') + INTERVAL '1 hour',
            '[)'
          )
          && rango_horario
  ) THEN
    RAISE EXCEPTION 'El terapeuta ya tiene una cita cerca de esta hora; debe haber al menos 1 hora de separacion';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
