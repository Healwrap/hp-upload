/**
 * 各种工具函数
 * @author pepedd864
 * @date 2024/7/30
 */
type NetworkSpeedUnit = "bits/s" | "Kbits/s" | "Mbits/s" | "Gbits/s" | "Bytes/s" | "KB/s" | "MB/s" | "GB/s";

const conversionFactors: Record<NetworkSpeedUnit, number> = {
  "bits/s": 1,
  "Kbits/s": 1e3,
  "Mbits/s": 1e6,
  "Gbits/s": 1e9,
  "Bytes/s": 8,
  "KB/s": 8 * 1e3,
  "MB/s": 8 * 1e6,
  "GB/s": 8 * 1e9
};

/**
 * 将网络速度转换为其他单位
 *
 * @param value - 待转换的值
 * @param fromUnit - 原来的单位
 * @param toUnit - 目标单位
 * @returns {number} 目标值
 */
export function convertNetworkSpeed(value: number, fromUnit: NetworkSpeedUnit, toUnit: NetworkSpeedUnit): number {
  if (!(fromUnit in conversionFactors) || !(toUnit in conversionFactors)) {
    throw new Error("Invalid unit provided.");
  }
  // 先转换为bits/s
  let convertedValue = value * conversionFactors[fromUnit];
  // 再从bits/s转换为目标单位
  convertedValue /= conversionFactors[toUnit];
  return convertedValue;
}

/**
 * 获取传输速度
 * @param state
 * @param loaded
 */
export function getNetworkSpeed(state:{lastTimestamp: number, lastLoaded: number}, loaded: number) {
  const now = Date.now();
  const deltaTime = now - state.lastTimestamp;
  const deltaLoaded = loaded - state.lastLoaded;
  let speed = 0;
  if (deltaTime > 0) {
    // 计算上传速度，单位为MB/s
    const speedBPerSec = deltaLoaded / (deltaTime / 1000);
    speed = convertNetworkSpeed(speedBPerSec, "Bytes/s", "MB/s");
    // 更新时间戳和已加载数据量
    state.lastTimestamp = now;
    state.lastLoaded = loaded;
  }
  return speed;
}
