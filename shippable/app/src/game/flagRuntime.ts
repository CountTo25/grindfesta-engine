import { createFlagMechanics } from "../engine/mechanics/flags";
import type { GeneratedGameState } from "./types";

export const FLAG_RUNTIME = createFlagMechanics<GeneratedGameState, string>({
  getFlags: (state) => state.flags,
});
