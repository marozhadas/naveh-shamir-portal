/**
 * Shared state of the LOCAL browser harness for the real SumitCardForm. Everything here is a MOCK: the tokenization (a stand-in for
 * SUMIT's payments.js) and the server action. Nothing talks to SUMIT, to Supabase or to any other host.
 */

export type PendingCall = { id: number; callback: (response: unknown) => void; settledBy: string | null };
export type ActionCall = { tokenLooksLikeUuid: boolean; topKeys: string[]; payerKeys: string[]; tokenWasProducedByTheMock: boolean; anyDigitRunOfTwelveOrMore: boolean; containsTheTypedCardOrCvv: boolean; consent: unknown; registrationIdShape: boolean };

export type Harness = {
  /** how the next CreateToken behaves: ok (answers after a moment), refused (Status 1), silent (never answers), twice (answers twice) */
  scenario: "ok" | "refused" | "silent" | "twice";
  /** how the mocked server action answers: success, error (Hebrew message), throw (network failure), slow (success after 1.5 s) */
  actionMode: "success" | "error" | "throw" | "slow";
  createTokenCalls: Array<{ cardLengths: Record<string, number>; ogTokenLengthBefore: number; companyId: unknown; publicKeyIsString: boolean; selector: unknown; returned: unknown }>;
  actionCalls: ActionCall[];
  completed: number;
  /** the mocked SERVER's memory: has the card of this registration been saved? (set by a successful mocked save) */
  cardSaved: boolean;
  /** how the mocked "is it saved?" check answers: normal (from cardSaved), error (status error), throw (network failure) */
  savedCheckMode: "normal" | "error" | "throw";
  savedCheckCalls: number;
  pending: PendingCall[];
  producedTokens: string[];
  mount: () => void;
  unmount: () => void;
  /** answer a pending (silent) call late with a valid token, like a slow network would */
  answerLate: (id: number) => string;
  /** REAL mode only: SHA-256 of the token in SUMIT's answer and of the token the action received - compared, never shown or stored */
  realTokenHashes: string[];
  actionTokenHashes: string[];
  realXhr: Array<{ host: string; path: string; status: number | null }>;
  realProps: { companyId: number; apiPublicKey: string } | null;
  jqueryBeforeMount: string;
  setTimeoutScaled: number;
};

export function harness(): Harness {
  return (window as unknown as { __h: Harness }).__h;
}
