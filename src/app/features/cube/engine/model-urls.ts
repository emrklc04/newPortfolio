/**
 * Kenney (kenney.nl) model packs, one pack per cube face, extracted into public/models/.
 * All packs used here are CC0-licensed — no attribution required.
 */
export const MODEL_URLS = {
  // Vorstadt — Fantasy Town Kit
  stallRed: '/models/town/stall-red.glb',
  stallGreen: '/models/town/stall-green.glb',
  townFence: '/models/town/fence.glb',
  townFenceCurved: '/models/town/fence-curved.glb',
  townHedge: '/models/town/hedge.glb',
  townHedgeLarge: '/models/town/hedge-large.glb',
  townLantern: '/models/town/lantern.glb',
  townCart: '/models/town/cart.glb',
  townPillar: '/models/town/pillar-wood.glb',
  townBannerGreen: '/models/town/banner-green.glb',
  townBannerRed: '/models/town/banner-red.glb',
  townWheel: '/models/town/wheel.glb',

  // Großstadt — City Kit: Commercial
  skyscraperA: '/models/city/building-skyscraper-a.glb',
  skyscraperB: '/models/city/building-skyscraper-b.glb',
  skyscraperC: '/models/city/building-skyscraper-c.glb',
  skyscraperD: '/models/city/building-skyscraper-d.glb',
  skyscraperE: '/models/city/building-skyscraper-e.glb',
  lowDetailBuildingA: '/models/city/low-detail-building-a.glb',
  lowDetailBuildingB: '/models/city/low-detail-building-b.glb',
  lowDetailBuildingC: '/models/city/low-detail-building-c.glb',
  lowDetailBuildingD: '/models/city/low-detail-building-d.glb',
  lowDetailBuildingE: '/models/city/low-detail-building-e.glb',
  lowDetailBuildingF: '/models/city/low-detail-building-f.glb',
  lowDetailBuildingG: '/models/city/low-detail-building-g.glb',

  // Pyramiden/Skills — City Kit: Industrial
  waterTower: '/models/industrial/water-tower.glb',
  chimneyLarge: '/models/industrial/chimney-large.glb',
  chimneyMedium: '/models/industrial/chimney-medium.glb',
  chimneySmall: '/models/industrial/chimney-small.glb',
  chimneyBasic: '/models/industrial/chimney-basic.glb',
  shippingContainerA: '/models/industrial/shipping-container-a.glb',
  shippingContainerB: '/models/industrial/shipping-container-b.glb',
  shippingContainerC: '/models/industrial/shipping-container-c.glb',
  solarPanel: '/models/industrial/solar-panel-landscape.glb',
  solarPanelFlat: '/models/industrial/solar-panel-flat.glb',
  solarPanelPortrait: '/models/industrial/solar-panel-portrait.glb',
  detailTank: '/models/industrial/detail-tank.glb',

  // Eislandschaft/Über mich — Space Kit
  astronaut: '/models/space/astronautA.glb',
  satelliteDish: '/models/space/satelliteDish.glb',
  spaceRockA: '/models/space/rock_crystalsLargeA.glb',
  spaceRockB: '/models/space/rock_crystalsLargeB.glb',
  spaceRockLargeA: '/models/space/rock_largeA.glb',
  spaceRockLargeB: '/models/space/rock_largeB.glb',
  spaceRock: '/models/space/rock.glb',
  spaceBarrel: '/models/space/barrel.glb',
  spaceBarrels: '/models/space/barrels.glb',
  spaceMeteor: '/models/space/meteor.glb',
  spaceCrater: '/models/space/craterLarge.glb',
  spacePlatform: '/models/space/platform_small.glb',

  // Wald — Mini Forest Kit
  tree: '/models/forest/tree.glb',
  treeHigh: '/models/forest/tree-high.glb',
  forestRock: '/models/forest/rocks-low.glb',
  forestRockHigh: '/models/forest/rocks-high.glb',
  forestRockRamp: '/models/forest/rocks-ramp.glb',
  forestStones: '/models/forest/stones.glb',
  forestPlant: '/models/forest/plant.glb',
  forestGrassPatch: '/models/forest/patch-grass.glb',
  forestFence: '/models/forest/fence.glb',
} as const;

export type ModelKey = keyof typeof MODEL_URLS;
