/**
 * Isolated HDR asset module. RobotStudio loads this dynamically so a Metro
 * parse failure of the .hdr file cannot take down the 3D canvas chunk.
 */
export function machineShopHdrModule(): number {
  return require('../../assets/env/machine_shop_01_2k.hdr') as number;
}
