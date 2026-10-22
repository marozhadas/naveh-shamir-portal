/**
 * Shared state of the LOCAL browser harness for the real SumitCardForm. Everything here is a MOCK: the tokenization (a stand-in for
 * SUMIT's payments.js) and the server action. Nothing talks to SUMIT, to Supabase or to any other host.
 */

export type PendingCall = { id: number; callback: (response: unknown) => void; settledBy: string | null };
export type ActionCall = { topKeys: string[]; payerKeys: string[]; tokenWasProducedByTheMock: boolean; anyDigitRunOfTwelveOrMore: boolean; containsTheTypedCardOrCvv: boolean; consent: unknown; registrationIdShape: boolean };

export type Harness = {
  /** how the next CreateToken behaves: ok (answers after a moment), refused (Status 1), silent (never answers), twice (answers twice) */
  scenario: "ok" | "refused" | "silent" | "twice";
  /** how the mocked server action answers: success, error (Hebrew message), throw (network failure), slow (success after 1.5 s) */
  actionMode: "success" | "error" | "throw" | "slow";
  createTokenCalls: Array<{ cardLengths: Record<string, number>; ogTokenLengthBefore: number; companyId: unknown; publicKeyIsString: boolean; selector: unknown; returned: unknown }>;
  actionCalls: ActionCall[];
  completed: number;
  pending: PendingCall[];
  producedTokens: string[];
  mount: () => void;
  unmount: () => void;
  /** answer a pending (silent) call late with a valid token, like a slow network would */
  answerLate: (id: number) => string;
  jqueryBeforeMount: string;
  setTimeoutScaled: number;
};

export function harness(): Harness {
  return (window as unknown as { __h: Harness }).__h;
}
