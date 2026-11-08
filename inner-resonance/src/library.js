/**
 * Sound-library loader.
 * New presets should normally be added to data/frequencies.json,
 * not hardcoded into UI components.
 */
export async function loadFrequencyLibrary() {
  const response = await fetch("./data/frequencies.json");
  if (!response.ok) throw new Error("Could not load the frequency library.");
  const data = await response.json();
  return data.frequencies;
}
