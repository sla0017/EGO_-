import type { Ride, RouteData } from "../types/domain"

function tokens(value: string) {
  return value
    .replace(/[·,]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1)
}

function overlap(left: string, right: string) {
  const rightTokens = tokens(right)
  return tokens(left).some((token) =>
    rightTokens.some(
      (other) => token.includes(other) || other.includes(token),
    ),
  )
}

export function getDemoMatches(route: RouteData, rides: Ride[]) {
  if (!route.start.trim() || !route.destination.trim()) return []

  return rides
    .filter((ride) => ride.seats > 0)
    .map((ride) => {
      const startScore =
        overlap(route.start, ride.start) || overlap(route.pickup, ride.start)
          ? 35
          : overlap(route.waypoint, ride.start)
            ? 18
            : 0
      const destinationScore = overlap(route.destination, ride.end) ? 35 : 0
      const waypointScore = overlap(route.waypoint, ride.via) ? 20 : 8
      const seatScore = ride.seats > 0 ? 10 : 0
      return {
        ...ride,
        match: Math.min(99, startScore + destinationScore + waypointScore + seatScore),
      }
    })
    .filter((ride) => ride.match >= 50)
    .sort((left, right) => right.match - left.match)
}
