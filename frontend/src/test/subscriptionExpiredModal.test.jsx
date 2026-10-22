import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubscriptionExpiredModal from '../components/SubscriptionExpiredModal';

const { authUser, subState, navigateMock } = vi.hoisted(() => ({
  authUser: { role: 'merchant', id: 'user-1' },
  subState: { status: 'expired', subscriptionExpired: true },
  navigateMock: vi.fn()
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: authUser })
}));

vi.mock('../context/MerchantSubscriptionContext', () => ({
  useMerchantSubscription: () => ({ subscription: subState, loading: false })
}));

const SNOOZE_KEY = 'subscription-expired-snoozed-until-user-1';
const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => {
  localStorage.clear();
  navigateMock.mockClear();
  authUser.role = 'merchant';
  authUser.id = 'user-1';
  subState.status = 'expired';
  subState.subscriptionExpired = true;
});

describe('SubscriptionExpiredModal', () => {
  it('shows the popup for an expired-beyond-grace merchant', () => {
    render(<SubscriptionExpiredModal />);

    expect(screen.getByText('Your SkillXT Subscription Has Expired!')).toBeInTheDocument();
    expect(screen.getByText(/As a special consideration, we are allowing you to continue using SkillXT Rewards temporarily/i)).toBeInTheDocument();
    expect(screen.getByText(/Recharge now to avoid service interruptions and keep rewarding your customers!/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recharge Now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remind Me Later' })).toBeInTheDocument();
  });

  it('does not show for an active merchant', () => {
    subState.status = 'active';
    subState.subscriptionExpired = false;

    render(<SubscriptionExpiredModal />);

    expect(screen.queryByText('Your SkillXT Subscription Has Expired!')).not.toBeInTheDocument();
  });

  it('does not show for a grace-period merchant', () => {
    subState.status = 'grace_period';
    subState.subscriptionExpired = false;

    render(<SubscriptionExpiredModal />);

    expect(screen.queryByText('Your SkillXT Subscription Has Expired!')).not.toBeInTheDocument();
  });

  it('does not show for non-merchant users', () => {
    authUser.role = 'super_admin';

    render(<SubscriptionExpiredModal />);

    expect(screen.queryByText('Your SkillXT Subscription Has Expired!')).not.toBeInTheDocument();
  });

  it('does not show while snoozed', () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + HOUR_MS));

    render(<SubscriptionExpiredModal />);

    expect(screen.queryByText('Your SkillXT Subscription Has Expired!')).not.toBeInTheDocument();
  });

  it('shows again after the snooze expires', () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() - 1000));

    render(<SubscriptionExpiredModal />);

    expect(screen.getByText('Your SkillXT Subscription Has Expired!')).toBeInTheDocument();
  });

  it('Remind Me Later closes the popup and snoozes for 1 hour', () => {
    render(<SubscriptionExpiredModal />);

    fireEvent.click(screen.getByRole('button', { name: 'Remind Me Later' }));

    expect(screen.queryByText('Your SkillXT Subscription Has Expired!')).not.toBeInTheDocument();
    const until = Number(localStorage.getItem(SNOOZE_KEY));
    expect(until).toBeGreaterThan(Date.now());
    expect(until).toBeLessThanOrEqual(Date.now() + HOUR_MS + 5000);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('Recharge Now navigates to the subscription page and snoozes', () => {
    render(<SubscriptionExpiredModal />);

    fireEvent.click(screen.getByRole('button', { name: 'Recharge Now' }));

    expect(navigateMock).toHaveBeenCalledWith('/merchant/subscription');
    expect(screen.queryByText('Your SkillXT Subscription Has Expired!')).not.toBeInTheDocument();
    const until = Number(localStorage.getItem(SNOOZE_KEY));
    expect(until).toBeGreaterThan(Date.now());
  });
});
