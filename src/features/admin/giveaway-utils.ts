export function secureRandomIndex(length: number, randomValues: (array: Uint32Array) => Uint32Array = (array) => crypto.getRandomValues(array)) {
  if (!Number.isInteger(length) || length < 1) throw new Error("O sorteio precisa ter ao menos um participante.");
  const limit = Math.floor(0x1_0000_0000 / length) * length;
  const value = new Uint32Array(1);
  do randomValues(value); while (value[0] >= limit);
  return value[0] % length;
}

export function winnerRotation(currentRotation: number, winnerIndex: number, participantCount: number) {
  const slice = 360 / participantCount;
  const desired = 360 - (winnerIndex + 0.5) * slice;
  const currentNormalized = ((currentRotation % 360) + 360) % 360;
  const adjustment = (desired - currentNormalized + 360) % 360;
  return currentRotation + 8 * 360 + adjustment;
}
