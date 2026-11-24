// Registers every kit (GAME_DESIGN.md section 3). Each file is one job: 1 passive + 3 skills.
import { IMPL } from "../core";
import { KITS } from "../data/kits.gen";
import "./se";
import "./md";
import "./qa";
import "./sa";
import "./na";
import "./dba";
import "./do";
import "./ce";
import "./ts";
import "./cs";
import "./ds";
import "./ai";
import "./ba";
import "./pm";
import "./ux";
import "./tw";
import "./vc";

/** Job indexes that are playable in this build. */
export const implementedJobs = () => KITS.map((_, k) => (IMPL[k] ? k : -1)).filter((k) => k >= 0);
export const JOB_CODES = ["SE", "MD", "QA", "SA", "NA", "DB", "DO", "CE", "TS", "CS", "DS", "AI", "BA", "PM", "UX", "TW", "VC"] as const;
