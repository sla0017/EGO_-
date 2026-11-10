import {
  defaultDemoDevices,
  defaultNotificationSettings,
} from "../data/demoData"
import type {
  DemoDevice,
  DemoInquiry,
  NotificationSettings,
} from "../types/domain"
import {
  readDemoData,
  readDemoList,
  readDemoValue,
  writeDemoData,
  writeDemoValue,
} from "./demoStore"

export function getNotificationSettings() {
  return readDemoData("notification-settings", defaultNotificationSettings)
}

export function saveNotificationSettings(settings: NotificationSettings) {
  writeDemoData("notification-settings", settings)
}

export function getBiometricDemoState() {
  return readDemoValue("biometric-demo") === "true"
}

export function saveBiometricDemoState(enabled: boolean) {
  writeDemoValue("biometric-demo", String(enabled))
}

export function getDemoDevices() {
  return readDemoValue("login-devices") === null
    ? defaultDemoDevices
    : readDemoList<DemoDevice>("login-devices")
}

export function removeDemoDevice(deviceId: string) {
  const updated = getDemoDevices().filter((device) => device.id !== deviceId)
  writeDemoData("login-devices", updated)
  return updated
}

export function saveDemoInquiry(inquiry: DemoInquiry) {
  const updated = [inquiry, ...readDemoList<DemoInquiry>("inquiries")]
  writeDemoData("inquiries", updated)
  return updated
}
