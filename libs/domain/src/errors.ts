export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

export class CurrencyMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurrencyMismatchError';
  }
}

export class InvalidMoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoneyError';
  }
}

export class InvalidIdempotencyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidIdempotencyInputError';
  }
}
