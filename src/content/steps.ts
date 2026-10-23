/**
 * Build steps for PROJECT BUZZ.
 *
 * Source of truth: outputs/buzz-build-plan-2026-09-23.md (section 4, steps 7-23).
 * Titles and times are copied from the plan; hints are shortened from each
 * step's "やること". Warning steps follow Dynamics 365 Guides' rule of putting
 * a hazard in its own step right before the work; their text comes from the
 * plan's section D note and the soldering steps.
 *
 * `headsetOff` (take the headset off for this step) is the assistant's safety
 * judgement, not something written in the plan.
 */

/** Node names in public/models/buzz-on-bee35.glb (exported from bee35_on_buzz.blend). */
export type PartId =
  | 'buzz_body'
  | 'bottom_plate'
  | 'stack'
  | 'battery'
  | 'ducts'
  | 'props';

export type BuildStep = {
  readonly kind: 'work' | 'warning';
  /** Plan step number. Warning steps carry the number of the step they guard. */
  readonly no: number;
  readonly title: string;
  /** One sentence, verb first (Guides' step card rule). */
  readonly hint: string;
  /** Time from the plan's 担当・時間 line. Empty for warnings. */
  readonly time: string;
  readonly headsetOff: boolean;
  /** Per-motor checks (M1-M4) on the card. */
  readonly motorChecks: boolean;
  /** Which parts the lock-on reticle points at. */
  readonly focus: readonly PartId[];
  /** What the assistant says when the step opens. */
  readonly voice: string;
};

export const BUILD_STEPS: readonly BuildStep[] = [
  {
    kind: 'work',
    no: 7,
    title: '骨組みを組む',
    hint: 'ネジを説明書の部品図の横に並べて数を確かめ、「やる」のページだけ順に組む。',
    time: '1時間',
    headsetOff: false,
    motorChecks: false,
    focus: ['bottom_plate', 'ducts'],
    voice: '工程7、骨組みです。推定作業時間は1時間。まずネジを部品図の横へ。数が合えば、あとは「やる」のページだけです。',
  },
  {
    kind: 'work',
    no: 8,
    title: 'モーターを付ける',
    hint: '腕の厚みを測ってネジの長さを決め、4つの穴がそろうか当ててから締める。',
    time: '45分',
    headsetOff: false,
    motorChecks: true,
    focus: ['ducts'],
    voice: '工程8、モーターです。推定45分。説明書の指定はM2×6ミリ。腕の厚み＋2ミリと合わなければ、締める前に止めましょう。',
  },
  {
    kind: 'work',
    no: 9,
    title: '仮置き（はんだ付けせずに並べてみる）',
    hint: 'スタック、受信機とアンテナ、電池を置き、モーター線と電源線の長さを決める。',
    time: '45分',
    headsetOff: false,
    motorChecks: false,
    focus: ['stack', 'battery'],
    voice: '工程9、仮置きです。推定45分。アンテナ2本は互いに90度、モーターや電池から1.5センチ以上離してください。',
  },
  {
    kind: 'warning',
    no: 10,
    title: 'ここから、はんだ',
    hint: 'ヘッドセットを外し、録画を始めてから作業する。電気は入れない。',
    time: '',
    headsetOff: true,
    motorChecks: false,
    focus: ['stack'],
    voice: '念のため申し上げます。ここから先は、はんだです。ヘッドセットを外して、録画を始めてから。',
  },
  {
    kind: 'work',
    no: 10,
    title: 'はんだ本番① 受信機の3本',
    hint: 'SBUSに信号、4V5に＋、Gに−。挿す前に3本の並びと線の色を照らし合わせる。',
    time: '30分',
    headsetOff: true,
    motorChecks: false,
    focus: ['stack'],
    voice: '工程10、受信機の3本です。推定30分。逆に挿すと焼ける、と取説にあります。挿す前に、並びをもう一度。',
  },
  {
    kind: 'work',
    no: 11,
    title: '受信機をS.BUS（モードB）にする',
    hint: '受信機の設定をS.BUSのモードBにする。',
    time: '10分',
    headsetOff: false,
    motorChecks: false,
    focus: [],
    voice: '工程11、受信機をモードBに。推定10分です。',
  },
  {
    kind: 'work',
    no: 12,
    title: '送信機と受信機をリンクする',
    hint: 'T6Lと受信機をリンクする。',
    time: '15分',
    headsetOff: false,
    motorChecks: false,
    focus: [],
    voice: '工程12、リンクです。推定15分。',
  },
  {
    kind: 'work',
    no: 13,
    title: 'Betaflightで受信機を設定する',
    hint: '変える前に今の設定を保存し、スロットル1250、1500、1750の位置に印を付ける。',
    time: '1時間',
    headsetOff: false,
    motorChecks: false,
    focus: [],
    voice: '工程13、Betaflightです。推定1時間。設定を変える前に、今の設定を保存しておきましょう。',
  },
  {
    kind: 'work',
    no: 14,
    title: 'はんだ本番② モーター線12か所',
    hint: '電気もUSBも抜いたまま、決めた順番と長さで付ける。',
    time: '1〜2時間',
    headsetOff: true,
    motorChecks: true,
    focus: ['stack', 'ducts'],
    voice: '工程14、モーター線12か所です。推定1時間から2時間。USBが抜けていることを確かめてから始めてください。',
  },
  {
    kind: 'work',
    no: 15,
    title: 'はんだ本番③ コンデンサと電源線',
    hint: 'コンデンサの白帯（マイナス）をマイナス側へ。赤はBAT＋、黒はBAT−。',
    time: '1時間',
    headsetOff: true,
    motorChecks: false,
    focus: ['stack'],
    voice: '工程15、コンデンサと電源線です。推定1時間。向きを間違えやすいところです。落ち着いてどうぞ。',
  },
  {
    kind: 'warning',
    no: 16,
    title: 'ここから、電気を入れる',
    hint: '毎回始める前に電源の順番を声に出して確かめる。プロペラは工程21まで付けない。',
    time: '',
    headsetOff: true,
    motorChecks: false,
    focus: ['battery'],
    voice: 'ここからは通電です。始める前に、電源の順番を声に出して確かめましょう。プロペラは、まだ付けません。',
  },
  {
    kind: 'work',
    no: 16,
    title: '初めてバッテリーをつなぐ',
    hint: 'プロペラが無いことを確かめ、スモークストッパー越しにバッテリーをつなぐ。',
    time: '15分',
    headsetOff: true,
    motorChecks: false,
    focus: ['battery'],
    voice: '工程16、初めての通電です。推定15分。プロペラが付いていないこと、確認済みですね。',
  },
  {
    kind: 'work',
    no: 17,
    title: '機体の向きを確かめる',
    hint: 'Betaflightで機体の向きが合っているか見る。',
    time: '15分',
    headsetOff: false,
    motorChecks: false,
    focus: ['stack'],
    voice: '工程17、機体の向きです。推定15分。',
  },
  {
    kind: 'work',
    no: 18,
    title: 'モーターの回転を確かめる',
    hint: '4つのモーターの回る向きを確かめる。',
    time: '30分',
    headsetOff: true,
    motorChecks: true,
    focus: ['ducts'],
    voice: '工程18、モーターの回転です。推定30分。回している間はヘッドセットを外してください。',
  },
  {
    kind: 'work',
    no: 19,
    title: 'アーム、ANGLE、フェイルセーフ、出力上限を決めて設定する',
    hint: 'アーム、ANGLEモード、フェイルセーフ、モーター出力の上限を設定する。',
    time: '1時間',
    headsetOff: false,
    motorChecks: false,
    focus: [],
    voice: '工程19、飛ぶ前の安全設定です。推定1時間。',
  },
  {
    kind: 'work',
    no: 20,
    title: '最終確認と設定の保存',
    hint: '設定を確かめて保存する。',
    time: '45分',
    headsetOff: false,
    motorChecks: false,
    focus: [],
    voice: '工程20、最終確認と保存です。推定45分。',
  },
  {
    kind: 'work',
    no: 21,
    title: 'プロペラを付ける',
    hint: '回る向きに合ったプロペラを、合ったモーターに付ける。',
    time: '15分',
    headsetOff: true,
    motorChecks: true,
    focus: ['props'],
    voice: '工程21、プロペラです。推定15分。向きを取り違えやすいので、外して手元をよく見てください。',
  },
  {
    kind: 'work',
    no: 22,
    title: '素体でホバリングする（バズなし）',
    hint: '屋内だけ、Futabaだけ。ANGLEモードで床から30cm以内、テザーを決めてから。',
    time: '1時間半',
    headsetOff: true,
    motorChecks: false,
    focus: ['bottom_plate', 'ducts', 'props'],
    voice: '工程22、初めてのホバリングです。条件が1つでも欠けていたら、今日は飛ばしません。',
  },
  {
    kind: 'work',
    no: 23,
    title: '264gのおもりを載せて試す',
    hint: 'バズと同じ重さのおもりを載せて浮くか試す。',
    time: '1時間',
    headsetOff: true,
    motorChecks: false,
    focus: ['buzz_body'],
    voice: '工程23、264グラムで試します。推定1時間。',
  },
];

/**
 * Motors in Betaflight's quad-X order, mapped to the duct nodes of the GLB.
 * Axis reading (assumption): +X is Buzz's right, Blender +Y (glTF -Z) is the head.
 */
export const MOTORS = [
  { label: 'M1', node: 'duct_1_-1', place: '右後ろ' },
  { label: 'M2', node: 'duct_1_1', place: '右前' },
  { label: 'M3', node: 'duct_-1_-1', place: '左後ろ' },
  { label: 'M4', node: 'duct_-1_1', place: '左前' },
] as const;
