/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { AssetType, defineAssets } from '@iwsdk/core';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

export default defineAssets({
  // Buzz on the Bee35 layout, exported by tools/export-buzz-hologram.py.
  'buzz-hologram': {
    url: publicAssetUrl('models/buzz-on-bee35.glb'),
    type: AssetType.GLTF,
    name: 'Buzz Hologram',
  },
  'step-card': {
    url: publicAssetUrl('ui/step-card.uikitml'),
    type: AssetType.UIKitML,
    name: 'Step Card',
  },
  'hud-strip': {
    url: publicAssetUrl('ui/hud-strip.uikitml'),
    type: AssetType.UIKitML,
    name: 'HUD Strip',
  },
  'next-trigger': {
    url: publicAssetUrl('ui/next-trigger.uikitml'),
    type: AssetType.UIKitML,
    name: 'Next Trigger',
  },
  callout: {
    url: publicAssetUrl('ui/callout.uikitml'),
    type: AssetType.UIKitML,
    name: 'Callout',
  },
});
