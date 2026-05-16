/** Consumer distributors for Spotify / DSP handoff (deep links). URLs maintained server-side. */

export type DistributorId = "distrokid" | "tunecore" | "amuse" | "cdbaby";

export interface DistributorOption {
  id: DistributorId;
  label: string;
  signupUrl: string;
  /** Short note for UI */
  tagline: string;
}

export const DISTRIBUTORS: DistributorOption[] = [
  {
    id: "distrokid",
    label: "DistroKid",
    signupUrl: "https://distrokid.com/",
    tagline: "Flat yearly fee, unlimited uploads.",
  },
  {
    id: "tunecore",
    label: "TuneCore",
    signupUrl: "https://www.tunecore.com/",
    tagline: "Pay per release or subscription plans.",
  },
  {
    id: "amuse",
    label: "Amuse",
    signupUrl: "https://amuse.io/",
    tagline: "Free tier available; upgrade for splits.",
  },
  {
    id: "cdbaby",
    label: "CD Baby",
    signupUrl: "https://cdbaby.com/",
    tagline: "Per-release fee; physical optional.",
  },
];

export function distributorById(id: string): DistributorOption | undefined {
  return DISTRIBUTORS.find((d) => d.id === id);
}
