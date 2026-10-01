import { Elysia } from "elysia"
import { AssetsService } from "#services/assets.service.ts"
import { FeedbackService } from "#services/feedback.service.ts"
import { HealthService } from "#services/health.service.ts"
import { WaitlistService } from "#services/waitlist.service.ts"

// I service vivono una volta sola e arrivano ai controller via decorate
// (convenzione bun-full-stack-starter: mai costruirli dentro un handler).
export const AssetsServicePlugin = new Elysia({ name: "assets" }).decorate({
	assetsService: new AssetsService(),
})

export const HealthServicePlugin = new Elysia({ name: "health" }).decorate({
	healthService: new HealthService(),
})

export const WaitlistServicePlugin = new Elysia({ name: "waitlist" }).decorate({
	waitlistService: new WaitlistService(),
})

export const FeedbackServicePlugin = new Elysia({ name: "feedback" }).decorate({
	feedbackService: new FeedbackService(),
})
