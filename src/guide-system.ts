/**
 * The build guide.
 *
 * Flow
 *   find   point at the desk (a flat lock-on ring follows the ray)
 *   left   select = left silver screw on Buzz's back
 *   right  select = right silver screw -> holograms and panels are laid out
 *   steps  the build plan, one card per step (src/content/steps.ts)
 *   done
 *
 * References: Dynamics 365 Guides (step card, dotted line to the work spot,
 * palm-sized next trigger, warnings as their own step) and the Iron Man films
 * (wireframe hologram, lock-on reticle with a callout, diagnostics pad, colour
 * states, centre of view kept clear, a voice that reports in numbers).
 *
 * Registration uses the environment ray hit, which the emulator provides.
 * Touching the screws with a fingertip on a real headset is not verified.
 */

import {
  createSystem,
  EnvironmentRaycastTarget,
  Follower,
  FollowBehavior,
  Group,
  RaycastSpace,
  UIKit,
  UIKitMLAsset,
  Vector3,
  VisibilityState,
  type Entity,
  type Object3D,
} from '@iwsdk/core';
import {
  HUD,
  LINES,
  NUDGE_AFTER_S,
  SCREW_SPACING_MM,
  SCREW_TOLERANCE_MM,
} from './content/lines.js';
import { BUILD_STEPS, MOTORS, type BuildStep, type PartId } from './content/steps.js';
import {
  DottedLink,
  HOLO,
  makeLockOn,
  makePad,
  setLockOnColor,
  tintPart,
  toHologram,
  type Hologram,
  type LockOn,
} from './holograms.js';
import { JP_FAMILY, loadJpFont } from './jp-font.js';

type Phase = 'find' | 'left' | 'right' | 'steps' | 'done';

const PART_NODES: Record<PartId, readonly string[]> = {
  buzz_body: ['buzz_body'],
  bottom_plate: ['bottom_plate'],
  stack: ['stack'],
  battery: ['battery'],
  ducts: MOTORS.map((m) => m.node),
  props: ['prop_1_-1', 'prop_1_1', 'prop_-1_-1', 'prop_-1_1'],
};
const ALL_NODES = Object.values(PART_NODES).flat();

const PANEL_IDS = ['step-card', 'hud-strip', 'next-trigger', 'callout'] as const;
const HUD_OFFSET: [number, number, number] = [0, -0.3, -0.62];

const HEADER_NORMAL = 'rgba(0, 212, 255, 0.16)';
const HEADER_DANGER = 'rgba(255, 64, 64, 0.38)';
const HEADER_DONE = 'rgba(232, 247, 255, 0.22)';

export class GuideSystem extends createSystem({}) {
  private phase: Phase = 'find';
  private stepIndex = 0;
  private readonly motorDone = [false, false, false, false];
  private stepElapsed = 0;
  private nudged = false;

  private readonly screwLeft = new Vector3();
  private readonly screwRight = new Vector3();
  private readonly origin = new Vector3();
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly up = new Vector3(0, 1, 0);
  private readonly head = new Vector3();
  private readonly target = new Vector3();
  private readonly anchor = new Vector3();
  private readonly scratch = new Vector3();

  private deskRing!: Entity;
  private lock!: LockOn;
  private link!: DottedLink;
  private pad!: Group;
  private hologram!: Hologram;
  private diagnostic!: Hologram;

  private card!: UIKitMLAsset;
  private cardRoot!: UIKit.Container;
  private cardHeader!: UIKit.Container;
  private stepNo!: UIKit.Text;
  private stepTime!: UIKit.Text;
  private stepTitle!: UIKit.Text;
  private stepHint!: UIKit.Text;
  private stepSafety!: UIKit.Text;
  private checks!: UIKit.Container;
  private readonly checkLabels: UIKit.Text[] = [];
  private hudState!: UIKit.Container;
  private hudStateLabel!: UIKit.Text;
  private hudCaption!: UIKit.Text;
  private calloutMain!: UIKit.Text;
  private calloutSub!: UIKit.Text;

  init(): void {
    this.bindPanels();
    this.spawnHolograms();
    this.followHudInXR();
    this.object('next-trigger').visible = false;
    this.object('callout').visible = false;

    loadJpFont()
      .then((fontFamilies) => {
        for (const id of PANEL_IDS) {
          const panel = this.world.requireSceneObject<UIKitMLAsset>(id);
          panel.document.rootElement.setProperties({ fontFamilies, fontFamily: JP_FAMILY });
        }
      })
      .catch((error: unknown) => console.error('[guide] font', error));

    this.renderSetup();
    this.say(LINES.intro);
  }

  update(delta: number): void {
    if (this.input.xr.gamepads.right?.getSelectStart()) this.onSelect();
    if (this.phase !== 'steps') return;

    this.player.head.getWorldPosition(this.head);
    this.updateLockOn(delta);
    this.diagnostic.root.rotation.y += delta * 0.35;

    this.stepElapsed += delta;
    if (!this.nudged && this.stepElapsed > NUDGE_AFTER_S) {
      this.nudged = true;
      this.say(LINES.nudge + this.currentStep().hint);
    }
  }

  // ---- setup ---------------------------------------------------------------

  private object(id: string): Object3D {
    return this.world.requireSceneObject<Object3D>(id);
  }

  private bindPanels(): void {
    this.card = this.world.requireSceneObject<UIKitMLAsset>('step-card');
    this.cardRoot = this.card.requireElementById<UIKit.Container>('card-root');
    this.cardHeader = this.card.requireElementById<UIKit.Container>('card-header');
    this.stepNo = this.card.requireElementById<UIKit.Text>('step-no');
    this.stepTime = this.card.requireElementById<UIKit.Text>('step-time');
    this.stepTitle = this.card.requireElementById<UIKit.Text>('step-title');
    this.stepHint = this.card.requireElementById<UIKit.Text>('step-hint');
    this.stepSafety = this.card.requireElementById<UIKit.Text>('step-safety');
    this.checks = this.card.requireElementById<UIKit.Container>('checks');

    this.listen(this.card, 'btn-prev', () => this.moveStep(-1));
    this.listen(this.card, 'btn-next', () => this.moveStep(1));
    MOTORS.forEach((motor, index) => {
      const id = `chk-${motor.label.toLowerCase()}`;
      this.checkLabels.push(this.card.requireElementById<UIKit.Text>(`${id}-label`));
      this.listen(this.card, id, () => this.toggleMotor(index));
    });

    const trigger = this.world.requireSceneObject<UIKitMLAsset>('next-trigger');
    this.listen(trigger, 'trigger-next', () => this.moveStep(1));

    const hud = this.world.requireSceneObject<UIKitMLAsset>('hud-strip');
    this.hudState = hud.requireElementById<UIKit.Container>('hud-state');
    this.hudStateLabel = hud.requireElementById<UIKit.Text>('hud-state-label');
    this.hudCaption = hud.requireElementById<UIKit.Text>('hud-caption');
    this.hudCaption.name = 'hud-caption';

    const callout = this.world.requireSceneObject<UIKitMLAsset>('callout');
    this.calloutMain = callout.requireElementById<UIKit.Text>('callout-main');
    this.calloutSub = callout.requireElementById<UIKit.Text>('callout-sub');
  }

  private listen(panel: UIKitMLAsset, id: string, handler: () => void): void {
    const element = panel.requireElementById(id);
    element.name = id;
    element.addEventListener('click', handler);
    this.cleanupFuncs.push(() => element.removeEventListener('click', handler));
  }

  private spawnHolograms(): void {
    const deskLock = makeLockOn(0.022);
    const flat = new Group();
    deskLock.root.rotation.x = -Math.PI / 2;
    flat.add(deskLock.root);
    this.deskRing = this.world.createTransformEntity(flat);
    this.deskRing.addComponent(EnvironmentRaycastTarget, { space: RaycastSpace.Right });

    this.lock = makeLockOn(0.028);
    this.link = new DottedLink();
    this.pad = makePad(0.13);
    for (const object of [this.lock.root, this.link.line, this.pad]) {
      object.visible = false;
      this.world.createTransformEntity(object);
    }

    this.hologram = toHologram(this.object('buzz-hologram'));
    this.diagnostic = toHologram(this.object('buzz-diagnostic'));
    this.hologram.root.visible = false;
    this.diagnostic.root.visible = false;
  }

  private followHudInXR(): void {
    this.cleanupFuncs.push(
      this.world.visibilityState.subscribe((state) => {
        if (state === VisibilityState.NonImmersive) return;
        const hud = this.world.requireSceneEntity('hud-strip');
        if (hud.hasComponent(Follower)) return;
        hud.addComponent(Follower, {
          target: this.player.head,
          offsetPosition: HUD_OFFSET,
          behavior: FollowBehavior.PivotY,
          tolerance: 0.4,
          maxAngle: 30,
          speed: 1,
        });
      }),
    );
  }

  // ---- registration ----------------------------------------------------------

  private onSelect(): void {
    if (this.phase === 'steps' || this.phase === 'done') return;
    const ring = this.deskRing.object3D;
    if (ring == null || !ring.visible) {
      this.say(LINES.pointAtDesk);
      return;
    }
    ring.getWorldPosition(this.scratch);

    if (this.phase === 'find' || this.phase === 'left') {
      this.screwLeft.copy(this.scratch);
      this.phase = 'right';
      this.renderSetup();
      this.say(LINES.registerSecond);
      return;
    }

    this.screwRight.copy(this.scratch);
    const report = this.layOut();
    this.deskRing.object3D?.removeFromParent();
    this.phase = 'steps';
    this.enterStep(report);
  }

  /** Place everything around the registered drone, facing the seated user. Returns the spoken report. */
  private layOut(): string {
    this.origin.addVectors(this.screwLeft, this.screwRight).multiplyScalar(0.5);
    const dx = this.screwRight.x - this.screwLeft.x;
    const dz = this.screwRight.z - this.screwLeft.z;
    const spacingMm = this.screwLeft.distanceTo(this.screwRight) * 1000;
    const diffMm = Math.abs(spacingMm - SCREW_SPACING_MM);

    this.player.head.getWorldPosition(this.head);
    this.forward.set(this.origin.x - this.head.x, 0, this.origin.z - this.head.z).normalize();
    this.right.crossVectors(this.forward, this.up).normalize();

    const holo = this.hologram.root;
    holo.position.copy(this.origin);
    holo.rotation.set(0, -Math.atan2(dz, dx), 0);
    holo.visible = true;

    // Centre (the drone) stays clear: card and captions on the left,
    // next trigger right-front on the desk, diagnostics pad to the right.
    this.place('step-card', -0.32, 0.2, 0);
    this.pinHud();
    this.place('next-trigger', 0.2, 0.03, -0.12);
    this.place('buzz-diagnostic', 0.42, 0.06, 0);
    this.object('buzz-diagnostic').visible = true;
    this.object('next-trigger').visible = true;
    this.pad.position.copy(this.object('buzz-diagnostic').position);
    // The model reaches 80 mm below the screws; at scale 0.7 that is 56 mm.
    this.pad.position.y -= 0.056;
    this.pad.visible = true;

    const template = diffMm <= SCREW_TOLERANCE_MM ? LINES.registered : LINES.registeredFar;
    return template.replace('{mm}', spacingMm.toFixed(1)).replace('{diff}', diffMm.toFixed(1));
  }

  /** After registration the captions stay under the card instead of following the head. */
  private pinHud(): void {
    const hud = this.world.requireSceneEntity('hud-strip');
    if (hud.hasComponent(Follower)) hud.removeComponent(Follower);
    this.place('hud-strip', -0.32, 0.07, 0);
  }

  /** Put a scene object at origin + right*r + up*u + forward*f, turned toward the head. */
  private place(id: string, r: number, u: number, f: number): void {
    const object = this.object(id);
    object.position
      .copy(this.origin)
      .addScaledVector(this.right, r)
      .addScaledVector(this.up, u)
      .addScaledVector(this.forward, f);
    object.rotation.set(0, Math.atan2(this.head.x - object.position.x, this.head.z - object.position.z), 0);
  }

  // ---- steps -------------------------------------------------------------------

  private currentStep(): BuildStep {
    const step = BUILD_STEPS[this.stepIndex];
    if (step == null) throw new Error(`No step at ${this.stepIndex}`);
    return step;
  }

  private moveStep(delta: number): void {
    if (this.phase === 'done' && delta < 0) this.phase = 'steps';
    if (this.phase !== 'steps') return;
    const next = this.stepIndex + delta;
    if (next < 0) return;
    if (next >= BUILD_STEPS.length) {
      this.phase = 'done';
      this.renderDone();
      this.say(LINES.done);
      return;
    }
    this.stepIndex = next;
    this.enterStep();
  }

  private enterStep(prefix = ''): void {
    this.motorDone.fill(false);
    this.stepElapsed = 0;
    this.nudged = false;
    this.renderStep();
    this.say(prefix + this.currentStep().voice);
  }

  private toggleMotor(index: number): void {
    if (this.phase !== 'steps' || !this.currentStep().motorChecks) return;
    this.motorDone[index] = !this.motorDone[index];
    this.renderStep();
  }

  private isDanger(step: BuildStep): boolean {
    return step.kind === 'warning' || step.headsetOff;
  }

  // ---- rendering -----------------------------------------------------------------

  private renderSetup(): void {
    this.stepNo.setProperties({ text: HUD.setup });
    this.stepTime.setProperties({ text: this.phase === 'right' ? '2 / 2' : '1 / 2' });
    this.stepTitle.setProperties({ text: this.phase === 'right' ? '右の銀ネジ' : '左の銀ネジ' });
    this.stepHint.setProperties({ text: HUD.setupHint });
    this.stepSafety.setProperties({ display: 'none' });
    this.checks.setProperties({ display: 'none' });
  }

  private renderDone(): void {
    this.cardHeader.setProperties({ backgroundColor: HEADER_DONE });
    this.cardRoot.setProperties({ borderColor: '#e8f7ff' });
    this.stepNo.setProperties({ text: HUD.progress });
    this.stepTime.setProperties({ text: `${BUILD_STEPS.length} / ${BUILD_STEPS.length}` });
    this.stepTitle.setProperties({ text: '完了' });
    this.stepHint.setProperties({ text: LINES.done });
    this.stepSafety.setProperties({ display: 'none' });
    this.checks.setProperties({ display: 'none' });
    this.lock.root.visible = false;
    this.link.line.visible = false;
    this.object('callout').visible = false;
    for (const name of ALL_NODES) {
      tintPart(this.hologram, name, HOLO.white, 0.9);
      tintPart(this.diagnostic, name, HOLO.white, 0.9);
    }
  }

  private renderStep(): void {
    const step = this.currentStep();
    const danger = this.isDanger(step);
    const color = danger ? HOLO.red : HOLO.amber;

    this.cardHeader.setProperties({ backgroundColor: danger ? HEADER_DANGER : HEADER_NORMAL });
    this.cardRoot.setProperties({ borderColor: danger ? '#ff4040' : '#00d4ff' });
    this.stepNo.setProperties({
      text: step.kind === 'warning' ? `${HUD.cardWarning} / ${HUD.cardStep}${step.no}` : `${HUD.cardStep}${step.no}`,
    });
    this.stepTime.setProperties({ text: step.time === '' ? '' : `${HUD.time} ${step.time}` });
    this.stepTitle.setProperties({ text: step.title });
    this.stepHint.setProperties({ text: step.hint });
    this.stepSafety.setProperties({
      display: 'flex',
      text: step.headsetOff ? HUD.safetyOff : HUD.safetyOn,
      color: step.headsetOff ? '#ff8080' : '#7fe3c4',
    });
    this.checks.setProperties({ display: step.motorChecks ? 'flex' : 'none' });
    MOTORS.forEach((motor, index) => {
      const done = this.motorDone[index] === true;
      this.checkLabels[index]?.setProperties({ text: done ? `${motor.label} ${HUD.checked}` : motor.label });
    });

    this.tintHolograms(step, color);
    setLockOnColor(this.lock, color);
    this.link.setColor(color);
    const hasTarget = this.lockTarget(step) != null;
    this.lock.root.visible = hasTarget;
    this.link.line.visible = hasTarget;
    this.object('callout').visible = hasTarget;
  }

  private tintHolograms(step: BuildStep, focusColor: number): void {
    const doneNodes = new Set<string>();
    for (let i = 0; i < this.stepIndex; i++) {
      for (const part of BUILD_STEPS[i]?.focus ?? []) {
        for (const node of PART_NODES[part]) doneNodes.add(node);
      }
    }
    const focusNodes = new Set(step.focus.flatMap((part) => PART_NODES[part]));
    const nextMotor = this.motorDone.indexOf(false);

    for (const name of ALL_NODES) {
      let color: number = HOLO.cyan;
      let strength = 0.45;
      if (focusNodes.has(name)) {
        color = focusColor;
        strength = 1;
        const motorIndex = MOTORS.findIndex((m) => m.node === name);
        if (step.motorChecks && motorIndex >= 0) {
          if (this.motorDone[motorIndex] === true) color = HOLO.white;
          else if (motorIndex !== nextMotor) strength = 0.6;
        }
      } else if (doneNodes.has(name)) {
        color = HOLO.white;
        strength = 0.8;
      }
      tintPart(this.hologram, name, color, strength);
      tintPart(this.diagnostic, name, color, strength);
    }
  }

  /** The node the reticle locks onto for this step, or null. */
  private lockTarget(step: BuildStep): { node: string; main: string; sub: string } | null {
    if (step.motorChecks) {
      const next = this.motorDone.indexOf(false);
      const motor = MOTORS[next];
      if (motor == null) return null;
      return { node: motor.node, main: motor.label, sub: motor.place };
    }
    const first = step.focus[0];
    if (first == null) return null;
    const node = first === 'ducts' ? 'bottom_plate' : PART_NODES[first][0];
    if (node == null) return null;
    return { node, main: step.title, sub: `${HUD.cardStep}${step.no}` };
  }

  private updateLockOn(delta: number): void {
    const step = this.currentStep();
    const target = this.lockTarget(step);
    const part = target == null ? undefined : this.hologram.parts.get(target.node);
    if (target == null || part == null) return;

    part.object.getWorldPosition(this.target);
    const lock = this.lock.root;
    lock.position.copy(this.target);
    lock.lookAt(this.head);
    this.lock.arc.rotation.z += delta * 1.4;

    const callout = this.object('callout');
    callout.position.copy(this.target).addScaledVector(this.right, 0.07).addScaledVector(this.up, 0.06);
    callout.rotation.set(0, Math.atan2(this.head.x - callout.position.x, this.head.z - callout.position.z), 0);
    this.calloutMain.setProperties({ text: target.main });
    this.calloutSub.setProperties({ text: target.sub });

    this.object('step-card').getWorldPosition(this.anchor);
    this.anchor.addScaledVector(this.right, 0.07);
    this.link.set(this.anchor, this.target);
  }

  // ---- voice -------------------------------------------------------------------------

  private say(text: string): void {
    this.hudCaption.setProperties({ text });
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.05;
    utterance.onstart = () => this.setSpeaking(true);
    utterance.onend = () => this.setSpeaking(false);
    speechSynthesis.speak(utterance);
  }

  private setSpeaking(speaking: boolean): void {
    this.hudStateLabel.setProperties({ text: speaking ? HUD.speaking : HUD.standby });
    this.hudState.setProperties({ borderColor: speaking ? '#e8f7ff' : '#00d4ff' });
  }
}
