import { useEffect, useRef, useState } from 'react';
import { phaseSequence } from '../lib/protocols';

/** Ademmotor. Tikt per seconde, wisselt fasen volgens het protocol en roept
 * onPhase(phase) aan bij elke fasewissel (ook bij start). phaseCount telt
 * fasewissels zodat de UI een animatie per fase opnieuw kan starten.
 * De interval wordt altijd opgeruimd: bij stoppen, protocolwissel en unmount. */
export function useBreathing({ protocol, running, onPhase }) {
  const initialPhase = phaseSequence(protocol)[0];
  const [state, setState] = useState({
    phase: initialPhase,
    secondsLeft: protocol[initialPhase],
    phaseCount: 0,
  });

  // Callback via ref, zodat een nieuwe functie-identiteit de timer niet herstart.
  const onPhaseRef = useRef(onPhase);
  useEffect(() => {
    onPhaseRef.current = onPhase;
  }, [onPhase]);

  useEffect(() => {
    const sequence = phaseSequence(protocol);
    if (sequence.length === 0) return undefined;

    if (!running) {
      setState({ phase: sequence[0], secondsLeft: protocol[sequence[0]], phaseCount: 0 });
      return undefined;
    }

    let index = 0;
    let secondsLeft = protocol[sequence[0]];
    let phaseCount = 1;
    setState({ phase: sequence[0], secondsLeft, phaseCount });
    onPhaseRef.current?.(sequence[0]);

    const timer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        index = (index + 1) % sequence.length;
        secondsLeft = protocol[sequence[index]];
        phaseCount += 1;
        onPhaseRef.current?.(sequence[index]);
      }
      setState({ phase: sequence[index], secondsLeft, phaseCount });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, protocol]);

  return state;
}
