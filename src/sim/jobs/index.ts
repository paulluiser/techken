// Registers every implemented kit. Add a job here when its file exists (R2 adds the other 15).
import { IMPL } from "../core";
import { KITS } from "../data/kits.gen";
import "./se";
import "./dba";

/** Job indexes that are playable in this build. */
export const implementedJobs = () => KITS.map((_, k) => (IMPL[k] ? k : -1)).filter((k) => k >= 0);
export const JOB_CODES = ["SE", "MD", "QA", "SA", "NA", "DB", "DO", "CE", "TS", "CS", "DS", "AI", "BA", "PM", "UX", "TW", "VC"] as const;
