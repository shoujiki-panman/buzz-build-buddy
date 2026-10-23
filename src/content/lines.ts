/**
 * What the assistant says and shows outside the build steps.
 *
 * The owner asked for J.A.R.V.I.S. reproduced from the films (2026-09-28):
 * no body, only a voice and a HUD; polite, a little dry, reports in numbers,
 * speaks first when something needs attention. The name and film imagery are
 * not used here.
 */

export const LINES = {
  intro: 'おはようございます、田沼さん。作業台を探しています。机の上を指してください。',
  pointAtDesk: '机が見えません。机の上を指してください。',
  registerFirst: '机を確認しました。バズの背中、左の銀ネジに触れてください。',
  registerSecond: '左を記録しました。次は右の銀ネジです。',
  /** `{mm}` and `{diff}` are replaced at runtime. */
  registered: '位置合わせ完了。銀ネジの間隔は{mm}ミリ、実測との差は{diff}ミリ。上出来です。',
  registeredFar: '位置合わせは済みましたが、間隔が{mm}ミリで、実測から{diff}ミリずれています。重ねた手本は目安としてご覧ください。',
  nudge: '先に申し上げておくと、',
  done: '全工程を終えました。お疲れさまでした、田沼さん。',
} as const;

export const HUD = {
  standby: '待機中',
  speaking: '応答中',
  cardStep: '工程',
  cardWarning: '警告',
  time: '推定',
  safetyOff: 'ヘッドセットを外す',
  safetyOn: 'このまま作業できます',
  prev: 'もどる',
  next: 'つぎへ',
  checked: '済',
  progress: '進み具合',
  setup: '位置合わせ',
  setupHint: '机の上を指して、左右の銀ネジを順に指でつまむ。',
} as const;

/** The two silver screws on Buzz's back, measured with calipers (2026-08-24). */
export const SCREW_SPACING_MM = 44.2;
/** How far the registered spacing may drift before we say so. */
export const SCREW_TOLERANCE_MM = 8;
/** Seconds on one step before the assistant offers the hint on its own. */
export const NUDGE_AFTER_S = 90;
