import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from 'three';

export interface SpaceBackground {
  group: Group;
  update(cameraPosition: Vector3): void;
}

const IMAGE_PATH = '/images/background/milky-way-vignette.png';
const IMAGE_ASPECT = 2000 / 1125;

/** Places the supplied galaxy image far behind the islands; the existing starfield renders over it. */
export function createSpaceBackground(
  center: Vector3,
  worldRadius: number,
  openingCameraPosition: Vector3,
): SpaceBackground {
  const direction = new Vector3(0, 0.62, 1).normalize();
  const distance = worldRadius * 8;
  const width = worldRadius * 13;
  const texture = new TextureLoader().load(IMAGE_PATH);
  texture.colorSpace = SRGBColorSpace;

  const material = new MeshBasicMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity: 0.86,
    toneMapped: false,
    depthWrite: false,
    depthTest: true,
  });
  const imagePlane = new Mesh(new PlaneGeometry(width, width / IMAGE_ASPECT), material);
  imagePlane.position.copy(center).addScaledVector(direction, -distance);
  imagePlane.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), direction);
  imagePlane.renderOrder = -1;

  const anchorPosition = imagePlane.position.clone();
  const cameraOffset = new Vector3();
  const openingCamera = openingCameraPosition.clone();

  const group = new Group();
  group.add(imagePlane);
  return {
    group,
    update: (cameraPosition) => {
      // The backdrop follows only a small share of the camera's movement, making it feel farther
      // away than the islands while preserving the supplied photograph without warping it.
      cameraOffset.copy(cameraPosition).sub(openingCamera);
      imagePlane.position.copy(anchorPosition).addScaledVector(cameraOffset, 0.08);
    },
  };
}
