// A small seeded random number generator: the same seed gives the same
// game, which is what makes the screenshot scenes repeatable. Written here
// from the standard splitmix32 recurrence, not copied from any library.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x9e3779b9) | 0;
    let t = Math.imul(a ^ (a >>> 16), 0x21f0aaad);
    t = Math.imul(t ^ (t >>> 15), 0xd35a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

/** Pick an integer in [min, max] from a seeded random function. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}
