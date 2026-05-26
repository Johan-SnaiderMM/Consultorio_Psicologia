-- Fix: Skip rango_horario recalculation when fecha_hora and duracion haven't changed
CREATE OR REPLACE FUNCTION actualizar_rango_horario()
RETURNS TRIGGER AS $$
BEGIN
  -- On UPDATE, if fecha_hora and duracion haven't changed, keep existing rango_horario
  IF (TG_OP = 'UPDATE' AND OLD.fecha_hora = NEW.fecha_hora AND OLD.duracion = NEW.duracion) THEN
    NEW.rango_horario := OLD.rango_horario;
    RETURN NEW;
  END IF;

  NEW.rango_horario := tstzrange(
    NEW.fecha_hora,
    NEW.fecha_hora + NEW.duracion::INTERVAL,
    '[)'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
