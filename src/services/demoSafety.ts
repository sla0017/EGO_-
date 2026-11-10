import { defaultBlockedUsers, defaultSafetyReports } from "../data/demoData"
import type { BlockedUser, SafetyReport } from "../types/domain"
import {
  readDemoList,
  readDemoValue,
  writeDemoData,
} from "./demoStore"

const REPORTS_KEY = "safety-reports"
const BLOCKED_KEY = "blocked-users"

export function getSafetyReports() {
  return readDemoValue(REPORTS_KEY) === null
    ? defaultSafetyReports
    : readDemoList<SafetyReport>(REPORTS_KEY)
}

export function submitSafetyReport(report: SafetyReport) {
  const updated = [report, ...getSafetyReports()]
  writeDemoData(REPORTS_KEY, updated)
  return updated
}

export function getBlockedUsers() {
  return readDemoValue(BLOCKED_KEY) === null
    ? defaultBlockedUsers
    : readDemoList<BlockedUser>(BLOCKED_KEY)
}

export function unblockDemoUser(userId: string) {
  const updated = getBlockedUsers().filter((user) => user.id !== userId)
  writeDemoData(BLOCKED_KEY, updated)
  return updated
}
