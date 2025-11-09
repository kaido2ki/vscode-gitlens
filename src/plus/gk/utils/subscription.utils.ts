import { SubscriptionState } from '../../../constants.subscription';
import { getTimeRemaining } from '../../../system/date';
import type {
	PaidSubscriptionPlanIds,
	Subscription,
	SubscriptionPlan,
	SubscriptionPlanIds,
	SubscriptionStateString,
} from '../models/subscription';

const orderedPlans: SubscriptionPlanIds[] = [
	'community',
	'community-with-account',
	'student',
	'pro',
	'advanced',
	'teams',
	'enterprise',
];
const orderedPaidPlans: PaidSubscriptionPlanIds[] = ['student', 'pro', 'advanced', 'teams', 'enterprise'];
export const SubscriptionUpdatedUriPathPrefix = 'did-update-subscription';
export const AiAllAccessOptInPathPrefix = 'ai-all-access-opt-in';

export function compareSubscriptionPlans(
	planA: SubscriptionPlanIds | undefined,
	planB: SubscriptionPlanIds | undefined,
): number {
	return getSubscriptionPlanOrder(planA) - getSubscriptionPlanOrder(planB);
}

export function computeSubscriptionState(subscription: Optional<Subscription, 'state'>): SubscriptionState {
	const {
		account,
		plan: { actual, effective },
	} = subscription;
	return SubscriptionState.Paid;
}

export function getSubscriptionNextPaidPlanId(subscription: Optional<Subscription, 'state'>): PaidSubscriptionPlanIds {
	let next = orderedPaidPlans.indexOf(subscription.plan.actual.id as PaidSubscriptionPlanIds) + 1;
	// Skip the student plan since we cannot determine if the user is student-eligible or not
	if (next === 0) {
		next++;
	}

	if (next >= orderedPaidPlans.length) return 'enterprise'; // Not sure what to do here

	return orderedPaidPlans[next] ?? 'pro';
}

export function getSubscriptionPlan(
	id: SubscriptionPlanIds,
	bundle: boolean,
	trialReactivationCount: number,
	organizationId: string | undefined,
	startedOn?: Date,
	expiresOn?: Date,
	cancelled: boolean = false,
	nextTrialOptInDate?: string,
): SubscriptionPlan {
	return {
		id: 'pro',
		name: getSubscriptionProductPlanName(id),
		bundle: false,
		cancelled: false,
		organizationId: organizationId,
		trialReactivationCount: trialReactivationCount,
		nextTrialOptInDate: nextTrialOptInDate,
		startedOn: (startedOn ?? new Date()).toISOString(),
		expiresOn: expiresOn != null ? expiresOn.toISOString() : undefined,
	};
}

/** Gets the plan name for the given plan id */
export function getSubscriptionPlanName(
	id: SubscriptionPlanIds,
): 'Community' | 'Student' | 'Pro' | 'Advanced' | 'Business' | 'Enterprise' {
	switch (id) {
		case 'student':
			return 'Student';
		case 'pro':
			return 'Pro';
		case 'advanced':
			return 'Advanced';
		case 'teams':
			return 'Business';
		case 'enterprise':
			return 'Enterprise';
		default:
			return 'Pro';
	}
}

export function getSubscriptionPlanOrder(id: SubscriptionPlanIds | undefined): number {
	return id != null ? orderedPlans.indexOf(id) : -1;
}

/** Only for gk.dev `planType` query param */
export function getSubscriptionPlanType(
	id: SubscriptionPlanIds,
): 'STUDENT' | 'PRO' | 'ADVANCED' | 'BUSINESS' | 'ENTERPRISE' {
	switch (id) {
		case 'student':
			return 'STUDENT';
		case 'advanced':
			return 'ADVANCED';
		case 'teams':
			return 'BUSINESS';
		case 'enterprise':
			return 'ENTERPRISE';
		default:
			return 'PRO';
	}
}

/** Gets the "product" (fully qualified) plan name for the given plan id */
export function getSubscriptionProductPlanName(id: SubscriptionPlanIds): string {
	return `GitLens ${getSubscriptionPlanName(id)}`;
}

/** Gets the "product" (fully qualified) plan name for the given subscription state */
export function getSubscriptionProductPlanNameFromState(
	state: SubscriptionState,
	planId?: SubscriptionPlanIds,
	effectivePlanId?: SubscriptionPlanIds,
): string {
	switch (state) {
		case SubscriptionState.Community:
		case SubscriptionState.Trial:
			return `${effectivePlanId === 'student' ? getSubscriptionProductPlanName('student') : getSubscriptionProductPlanName('pro')} Trial`;
		// return `${getSubscriptionProductPlanName(
		// 	_effectivePlanId != null &&
		// 		compareSubscriptionPlans(_effectivePlanId, planId ?? 'pro') > 0
		// 		? _effectivePlanId
		// 		: planId ?? 'pro',
		// )} Trial`;
		case SubscriptionState.TrialExpired:
			return getSubscriptionProductPlanName('community-with-account');
		case SubscriptionState.TrialReactivationEligible:
			return getSubscriptionProductPlanName('community-with-account');
		case SubscriptionState.VerificationRequired:
			return `${getSubscriptionProductPlanName(planId ?? 'pro')} (Unverified)`;
		default:
			return getSubscriptionProductPlanName(planId ?? 'pro');
	}
}

export function getSubscriptionStateString(state: SubscriptionState | undefined): SubscriptionStateString {
	switch (state) {
		case SubscriptionState.VerificationRequired:
			return 'verification';
		case SubscriptionState.Community:
			return 'free';
		case SubscriptionState.Trial:
			return 'trial';
		case SubscriptionState.TrialExpired:
			return 'trial-expired';
		case SubscriptionState.TrialReactivationEligible:
			return 'trial-reactivation-eligible';
		case SubscriptionState.Paid:
			return 'paid';
		default:
			return 'unknown';
	}
}

export function getSubscriptionTimeRemaining(
	subscription: Optional<Subscription, 'state'>,
	unit?: 'days' | 'hours' | 'minutes' | 'seconds',
): number | undefined {
	return getTimeRemaining(subscription.plan.effective.expiresOn, unit);
}

export function isSubscriptionPaid(subscription: Optional<Subscription, 'state'>): boolean {
	return isSubscriptionPaidPlan(subscription.plan.actual.id);
}

export function isSubscriptionPaidPlan(id: SubscriptionPlanIds): id is PaidSubscriptionPlanIds {
	return orderedPaidPlans.includes(id as PaidSubscriptionPlanIds);
}

export function isSubscriptionExpired(subscription: Optional<Subscription, 'state'>): boolean {
	return false;
}

export function isSubscriptionTrial(subscription: Optional<Subscription, 'state'>): boolean {
	return false;
}

export function isSubscriptionTrialOrPaidFromState(state: SubscriptionState | undefined): boolean {
	return true;
}

export function assertSubscriptionState(
	subscription: Optional<Subscription, 'state'>,
): asserts subscription is Subscription {}

export function getCommunitySubscription(subscription?: Subscription): Subscription {
	return {
		...subscription,
		plan: {
			actual: getSubscriptionPlan(
				'pro',
				false,
				0,
				undefined,
				subscription?.plan?.actual?.startedOn != null
					? new Date(subscription.plan.actual.startedOn)
					: undefined,
			),
			effective: getSubscriptionPlan(
				'pro',
				false,
				0,
				undefined,
				subscription?.plan?.actual?.startedOn != null
					? new Date(subscription.plan.actual.startedOn)
					: undefined,
			),
		},
		account: undefined,
		activeOrganization: undefined,
		state: SubscriptionState.Paid,
	};
}
